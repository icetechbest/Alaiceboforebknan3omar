// 📄 [ أمر .قروضي ] -------------------------------------------------------------
// يعرض القروض اللي على اللاعب (لازم يسددها) والقروض اللي هو دايناها (مستنيها).
module.exports = {
    name: 'قروضي',
    aliases: ['myloans'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const loans = db.loans || [];
        const iOwe = loans.filter(l => l.borrower === sender);
        const owedToMe = loans.filter(l => l.lender === sender);

        if (iOwe.length === 0 && owedToMe.length === 0) {
            return sock.sendMessage(id, { text: "📄 مفيش عندك أي قروض حالياً (لا عليك ولا لك)." }, { quoted: m });
        }

        const mentions = [];
        let msg = `🏦 *سجل القروض الخاص بك* 🏦\n━━━━━━━━━━━━━━━━━━\n`;

        if (iOwe.length > 0) {
            msg += `📥 *عليك (لازم تسددها):*\n`;
            for (const l of iOwe) {
                msg += `  • لـ @${l.lender.split('@')[0]}: *${l.owed.toLocaleString()}* ذهب\n`;
                mentions.push(l.lender);
            }
        }
        if (owedToMe.length > 0) {
            msg += `📤 *لك (مستنيها من غيرك):*\n`;
            for (const l of owedToMe) {
                msg += `  • من @${l.borrower.split('@')[0]}: *${l.owed.toLocaleString()}* ذهب\n`;
                mentions.push(l.borrower);
            }
        }
        msg += `━━━━━━━━━━━━━━━━━━\nاستخدم *.سداد [مبلغ]* لتسديد اللي عليك.`;

        await sock.sendMessage(id, { text: msg, mentions }, { quoted: m });
    }
};
