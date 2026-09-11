const { splitTransferGold, TRANSFER_TAX_PCT } = require('../../data/classSystem.js');
const { resolveTargetJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'تحويل',
    aliases: ['هبة', 'ارسل'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const user = db[sender];

        // 1. التأكد من المنشن
        const mentionedJid = resolveTargetJid(m, db, null, {});
        if (!mentionedJid) {
            return sock.sendMessage(id, { text: "⚠️ لازم تعمل منشن للشخص وتكتب المبلغ.\nمثال: .تحويل @الاسم 1000" }, { quoted: m });
        }

        // 2. التأكد من المبلغ
        const amount = parseInt(args.find(arg => !arg.includes('@') && !isNaN(arg)));
        if (!amount || amount <= 0) {
            return sock.sendMessage(id, { text: "❓ كم المبلغ الذي تريد تحويله؟" }, { quoted: m });
        }

        // 3. التحقق من الشروط
        if (mentionedJid === sender) {
            return sock.sendMessage(id, { text: "😂 ما ينفع تعمل تحويل لنفسك يا ذكي!" }, { quoted: m });
        }

        if (!user || user.gold < amount) {
            return sock.sendMessage(id, { text: "💰 رصيدك من الذهب لا يكفي لهذا التحويل!" }, { quoted: m });
        }

        const target = db[mentionedJid];
        if (!target) {
            return sock.sendMessage(id, { text: "❌ هذا الشخص غير مسجل في نظام المملكة." }, { quoted: m });
        }

        // --- [ حساب الضريبة ] ---
        const { net: finalAmount, tax } = splitTransferGold(amount);

        // 4. تنفيذ عملية التحويل
        user.gold -= amount; // يخصم المبلغ كاملاً من الراسل
        target.gold = (target.gold || 0) + finalAmount; // يصل الصافي للمستلم
        db.treasury = (db.treasury || 0) + tax; // الضريبة فعلياً بتدخل خزينة المملكة (كانت بتختفي قبل كده)

        let transferMsg = `💸 *عملية تحويل ملكية ناجحة* 💸\n`;
        transferMsg += `━━━━━━━━━━━━━━━━━━\n`;
        transferMsg += `📤 من: *${user.name}*\n`;
        transferMsg += `📥 إلى: *${target.name}*\n`;
        transferMsg += `💰 المبلغ المرسل: ${amount.toLocaleString()}\n`;
        transferMsg += `🏛️ ضريبة المملكة (${(TRANSFER_TAX_PCT * 100).toFixed(1)}%): ${tax.toLocaleString()}\n`;
        transferMsg += `✅ الصافي الواصل: *${finalAmount.toLocaleString()}* ذهب\n`;
        transferMsg += `━━━━━━━━━━━━━━━━━━\n`;
        transferMsg += `✨ تم إيداع الضرائب في خزينة المملكة!`;

        await sock.sendMessage(id, { text: transferMsg, mentions: [mentionedJid, sender] }, { quoted: m });
    }
};
