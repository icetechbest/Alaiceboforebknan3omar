const { checkAchievements } = require('../../data/achievements.js');

module.exports = {
    name: 'شراء-عرض',
    aliases: ['اشتري-عرض'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        if (!db[sender]) {
            return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });
        }

        const offerId = parseInt(args[0], 10);
        if (!offerId) {
            return sock.sendMessage(id, {
                text: "📖 *طريقة الاستخدام:*\n.شراء-عرض [رقم العرض]\n\nشوف العروض المتاحة بـ .سوق-اللاعبين"
            }, { quoted: m });
        }

        db.marketplace ??= [];
        const offerIndex = db.marketplace.findIndex(o => o.id === offerId);
        if (offerIndex === -1) {
            return sock.sendMessage(id, { text: "❌ العرض ده مش موجود (يمكن اتباع أو اتلغى)." }, { quoted: m });
        }

        const offer = db.marketplace[offerIndex];
        if (offer.seller === sender) {
            return sock.sendMessage(id, { text: "❌ ما ينفعش تشتري عرضك انت." }, { quoted: m });
        }

        const buyerGold = db[sender].gold || 0;
        if (buyerGold < offer.price) {
            return sock.sendMessage(id, {
                text: `⚠️ رصيدك مش كفاية. محتاج ${offer.price.toLocaleString()} ذهب، ومعاك ${buyerGold.toLocaleString()} بس.`
            }, { quoted: m });
        }

        // 🔒 تحقق أخير قبل نقل الذهب (نفس الشرط اتفحص فوق، بنعيده هنا كضمان أمان
        // ضد أي تعديل متزامن ممكن يحصل على الرصيد بين الفحصين)
        if ((db[sender].gold || 0) < offer.price) {
            return sock.sendMessage(id, { text: "⚠️ حصل تغيير في رصيدك، جرب تاني." }, { quoted: m });
        }

        db[sender].gold -= offer.price;
        db[offer.seller] ??= { gold: 0 };
        db[offer.seller].gold = (db[offer.seller].gold || 0) + offer.price;
        db[offer.seller].marketSales = (db[offer.seller].marketSales || 0) + 1;

        db.marketplace.splice(offerIndex, 1);

        await sock.sendMessage(id, {
            text: `✅ تم شراء *${offer.item}* من @${offer.seller.split('@')[0]} بـ ${offer.price.toLocaleString()} ذهب.`,
            mentions: [offer.seller, sender]
        }, { quoted: m });

        await sock.sendMessage(offer.seller, {
            text: `💰 تم بيع *${offer.item}* لـ @${sender.split('@')[0]} مقابل ${offer.price.toLocaleString()} ذهب، وتمت إضافتها لرصيدك.`,
            mentions: [sender]
        }).catch(() => {});

        // 🏅 يفتح إنجاز "أول عملية بيع في السوق" (وبعدها إنجاز "تاجر شاطر" مع تكرار البيع)
        await checkAchievements(db, offer.seller, sock, offer.seller);
    }
};
