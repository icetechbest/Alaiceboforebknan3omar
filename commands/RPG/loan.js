const { resolveTargetJid } = require('../../core/messageHandler.js');

// 🏦 [ أمر .قرض ] ---------------------------------------------------------------
// لاعب (الدائن) بيقرض لاعب تاني (المدين) ذهب فورًا، مع فايدة % بيتسجلها البوت في
// db.loans، ولازم المدين يسددها بأمر .سداد. راجع loanRepay.js و loanList.js.
const MAX_INTEREST_PCT = 100; // أقصى فايدة مسموح بيها عشان نمنع أرقام غير منطقية

module.exports = {
    name: 'قرض',
    aliases: ['loan'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const borrower = resolveTargetJid(m, db, null, {});
        const numericArgs = args.filter(arg => !arg.includes('@') && !isNaN(arg)).map(Number);
        const amount = numericArgs[0];
        const interestPct = numericArgs[1] ?? 10; // فايدة افتراضية 10% لو مذكورة

        if (!borrower || !amount || amount <= 0) {
            return sock.sendMessage(id, {
                text: "❌ الطريقة الصحيحة:\n*.قرض @الشخص [المبلغ] [الفايدة%]*\nمثال: *.قرض @Yuri 5000 10*\n(الفايدة اختيارية، الافتراضي 10%)"
            }, { quoted: m });
        }
        if (borrower === sender) {
            return sock.sendMessage(id, { text: "😂 ما ينفعش تقرض نفسك!" }, { quoted: m });
        }
        if (interestPct < 0 || interestPct > MAX_INTEREST_PCT) {
            return sock.sendMessage(id, { text: `⚠️ نسبة الفايدة لازم تكون بين 0 و${MAX_INTEREST_PCT}%.` }, { quoted: m });
        }

        const lenderData = db[sender];
        const borrowerData = db[borrower];
        if (!lenderData || !borrowerData) {
            return sock.sendMessage(id, { text: "❌ أحد الطرفين غير مسجل في المملكة." }, { quoted: m });
        }
        if ((lenderData.gold || 0) < amount) {
            return sock.sendMessage(id, { text: "💰 رصيدك من الذهب لا يكفي عشان تقرض المبلغ ده!" }, { quoted: m });
        }

        const owed = Math.ceil(amount * (1 + interestPct / 100));

        db.loans ??= [];
        db.loans.push({
            id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            lender: sender,
            borrower,
            principal: amount,
            owed,
            createdAt: Date.now(),
            groupID: id
        });

        lenderData.gold -= amount;
        borrowerData.gold = (borrowerData.gold || 0) + amount;

        let msg = `🏦 *عقد قرض جديد* 🏦\n━━━━━━━━━━━━━━━━━━\n`;
        msg += `📤 الدائن: @${sender.split('@')[0]}\n`;
        msg += `📥 المدين: @${borrower.split('@')[0]}\n`;
        msg += `💰 المبلغ المُقرض: ${amount.toLocaleString()}\n`;
        msg += `📈 الفايدة: ${interestPct}%\n`;
        msg += `💵 المطلوب سداده: *${owed.toLocaleString()}*\n`;
        msg += `━━━━━━━━━━━━━━━━━━\n`;
        msg += `استخدم *.سداد [مبلغ]* للسداد، أو *.قروضي* لمتابعة القروض.`;

        await sock.sendMessage(id, { text: msg, mentions: [sender, borrower] }, { quoted: m });
    }
};
