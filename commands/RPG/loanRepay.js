const { resolveTargetJid } = require('../../core/messageHandler.js');

// 💵 [ أمر .سداد ] --------------------------------------------------------------
// المدين بيسدد جزء أو كل قرضه. لو عليه أكتر من قرض، لازم يمنشن الدائن اللي عايز
// يسدد له؛ لو قرض واحد بس، بيتحدد أوتوماتيك.
module.exports = {
    name: 'سداد',
    aliases: ['repay'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const amount = parseInt(args.find(arg => !arg.includes('@') && !isNaN(arg)));
        const mentionedLender = resolveTargetJid(m, db, null, {});

        if (!amount || amount <= 0) {
            return sock.sendMessage(id, {
                text: "❌ الطريقة الصحيحة:\n*.سداد [المبلغ]* (منشن الدائن لو عندك أكتر من قرض)\nمثال: *.سداد 2000*"
            }, { quoted: m });
        }

        db.loans ??= [];
        let myLoans = db.loans.filter(l => l.borrower === sender);
        if (mentionedLender) myLoans = myLoans.filter(l => l.lender === mentionedLender);

        if (myLoans.length === 0) {
            return sock.sendMessage(id, { text: "✅ مفيش عليك أي قروض حالياً." }, { quoted: m });
        }
        if (myLoans.length > 1) {
            return sock.sendMessage(id, { text: "⚠️ عندك أكتر من قرض! منشن الدائن اللي عايز تسدد له.\nاستخدم *.قروضي* لمعرفة كل قروضك." }, { quoted: m });
        }

        const loan = myLoans[0];
        const borrowerData = db[sender];
        const lenderData = db[loan.lender];
        if (!borrowerData) return sock.sendMessage(id, { text: "❌ بياناتك غير مسجلة في اللعبة." }, { quoted: m });
        if ((borrowerData.gold || 0) < amount) {
            return sock.sendMessage(id, { text: "💰 رصيدك من الذهب لا يكفي لدفع المبلغ ده!" }, { quoted: m });
        }

        const paid = Math.min(amount, loan.owed);
        borrowerData.gold -= paid;
        if (lenderData) lenderData.gold = (lenderData.gold || 0) + paid;
        loan.owed -= paid;

        let msg = `💵 تم سداد *${paid.toLocaleString()}* ذهب لـ @${loan.lender.split('@')[0]}.\n`;
        if (loan.owed <= 0) {
            db.loans = db.loans.filter(l => l.id !== loan.id);
            msg += `✅ تم سداد القرض بالكامل! العقد اتقفل.`;
        } else {
            msg += `📄 المتبقي عليك: *${loan.owed.toLocaleString()}* ذهب.`;
        }

        await sock.sendMessage(id, { text: msg, mentions: [sender, loan.lender] }, { quoted: m });
    }
};
