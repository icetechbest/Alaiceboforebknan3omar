module.exports = {
    name: 'الغاء-عرض',
    aliases: ['حذف-عرض', 'سحب-عرض'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        if (!db[sender]) {
            return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });
        }

        const offerId = parseInt(args[0], 10);
        if (!offerId) {
            return sock.sendMessage(id, {
                text: "📖 *طريقة الاستخدام:*\n.الغاء-عرض [رقم العرض]\n\nشوف عروضك ورقمها بـ .سوق-اللاعبين"
            }, { quoted: m });
        }

        db.marketplace ??= [];
        const offerIndex = db.marketplace.findIndex(o => o.id === offerId);
        if (offerIndex === -1) {
            return sock.sendMessage(id, { text: "❌ العرض ده مش موجود (يمكن اتباع أو اتلغى بالفعل)." }, { quoted: m });
        }

        const offer = db.marketplace[offerIndex];
        if (offer.seller !== sender) {
            return sock.sendMessage(id, { text: "❌ ده مش عرضك، مينفعش تلغيه." }, { quoted: m });
        }

        db.marketplace.splice(offerIndex, 1);

        await sock.sendMessage(id, {
            text: `✅ تم إلغاء عرض *${offer.item}* (#${offer.id}) من سوق اللاعبين.`
        }, { quoted: m });
    }
};
