const { splitGangDonation, GANG_DONATION_TAX_PCT } = require('../../data/classSystem.js');

module.exports = {
    name: "تبرع",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;
        const amount = parseInt(args[0]);

        if (!amount || isNaN(amount) || amount <= 0) return sock.sendMessage(groupID, { text: "⚠️ اكتب مبلغ صحيح! مثال: .تبرع 5000" });

        // البحث عن عصابة العضو
        const gang = Object.values(db.gangs || {}).find(g => g.members.includes(sender));
        if (!gang) return sock.sendMessage(groupID, { text: "⚠️ لازم تكون في عصابة عشان تتبرع!" });

        const user = db[sender];
        if (Number(user.gold || 0) < amount) return sock.sendMessage(groupID, { text: "⚠️ ذهبك لا يكفي لهذا التبرع!" });

        // --- [ ضريبة على التبرع لخزينة العصابة ] ---
        // قبل كده التبرع كان بدون ضريبة خالص، وكان ده بيتستخدم كثغرة
        // للتهرب من ضريبة .تحويل (تبرع لعصابة تخصك أو تخص حد تاني بدل التحويل المباشر)
        const { net, tax } = splitGangDonation(amount);

        // تنفيذ العملية
        user.gold = Number(user.gold) - amount;
        gang.gold = (Number(gang.gold) || 0) + net;
        db.treasury = (Number(db.treasury) || 0) + tax;

        return sock.sendMessage(groupID, { 
            text: `💰 تم قبول التبرع!\n👤 المتبرع: @${sender.split('@')[0]}\n💵 المبلغ: ${amount.toLocaleString()} ذهبة\n🏛️ ضريبة المملكة (${(GANG_DONATION_TAX_PCT * 100).toFixed(1)}%): ${tax.toLocaleString()}\n🏰 خزنة عصابة [ ${gang.name} ] الآن: ${gang.gold.toLocaleString()}`,
            mentions: [sender]
        });
    }
};
