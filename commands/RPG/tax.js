const { TRANSFER_TAX_PCT } = require('../../data/classSystem.js');

module.exports = {
    name: 'ضريبة',
    aliases: ['حساب_ضريبة', 'الضريبة', 'tax'],
    async execute(sock, m, args, db, sender, isOwner, botData) {
        const id = m.key.remoteJid;

        // 1. التحقق من إدخال المبلغ المراد حسابه
        const amount = parseInt(args[0]);
        if (!amount || isNaN(amount) || amount <= 0) {
            return sock.sendMessage(id, { 
                text: "⚠️ *تنبيه:* يرجى كتابة المبلغ المراد تقدير ضريبته.\nمثال: *.ضريبة 5000*" 
            }, { quoted: m });
        }

        // 2. حساب الضريبة والصافي بناءً على قوانين المملكة (نفس نسبة .تحويل بالظبط)
        const taxRate = TRANSFER_TAX_PCT;
        const tax = Math.floor(amount * taxRate);
        const finalAmount = amount - tax;

        // 3. بناء الرسالة بتنسيق مكتب الحسابات
        let taxMsg = `🏛️ *﹝ مَكْتَبُ الجِبَايَةِ وَالحِسَابَات ﹞* 🏛️\n`;
        taxMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
        taxMsg += `💰 *المبلغ المراد إرساله:* ${amount.toLocaleString()} 🪙\n`;
        taxMsg += `📉 *قيمة الضريبة (${(taxRate * 100).toFixed(1)}%):* ${tax.toLocaleString()} 🪙\n`;
        taxMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
        taxMsg += `✅ *الصافي المتوقع وصوله:*\n⇠ [ *${finalAmount.toLocaleString()}* ] ذهبة\n`;
        taxMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
        taxMsg += `📝 *إرشاد:* إذا أردت تحويل هذا المبلغ، استخدم:\n*.تحويل @منشن ${amount}*`;

        await sock.sendMessage(id, { 
            text: taxMsg,
            contextInfo: {
                externalAdReply: {
                    title: "نظام الضرائب الملكي",
                    body: "حسابات دقيقة لضمان استقرار المملكة",
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m });
    }
};
