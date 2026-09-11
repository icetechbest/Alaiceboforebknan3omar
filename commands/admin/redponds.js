module.exports = {
    name: 'الردود',
    aliases: ['قائمة_الردود', 'replies', 'الكلمات'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        // 1. التأكد أن الأمر في مجموعة
        if (!id.endsWith('@g.us')) {
            return sock.sendMessage(id, { text: "❌ هذا الأمر مخصص للمجموعات فقط." });
        }

        // 2. جلب ردود المجموعة من قاعدة البيانات (نفس المكان الذي يحفظ فيه أمر .رد)
        const groupReplies = db.customReplies?.[id];

        // 3. التحقق من وجود بيانات
        if (!groupReplies || Object.keys(groupReplies).length === 0) {
            let emptyMsg = `📂 *﹝ سِجِلُّ الرُّدُودِ فَارِغ ﹞* 📂\n`;
            emptyMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
            emptyMsg += `⚠️ لا توجد ردود مخصصة في هذه المجموعة حالياً.\n\n`;
            emptyMsg += `💡 لإضافة رد جديد استخدم:\n`;
            emptyMsg += `📝 \`.رد الكلمة | الرد\``;
            return sock.sendMessage(id, { text: emptyMsg }, { quoted: m });
        }

        // 4. بناء القائمة بتنسيق "آيس" الاحترافي
        const keys = Object.keys(groupReplies);
        let msg = `📂 *﹝ قَائِمَةُ الرُّدُودِ المَبَرْمَجَة ﹞* 📂\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `✨ إجمالي الردود: ( *${keys.length}* )\n\n`;

        keys.forEach((key, index) => {
            msg += `${index + 1} ┫ *الكلمة:* ${key}\n`;
            msg += `   ┫ *الرد:* ${groupReplies[key]}\n`;
            if (index !== keys.length - 1) msg += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
        });

        msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `🗑️ لحذف رد: استخدم ( .حذف_رد [الكلمة] )\n`;
        msg += `👑 نظام إدارة المجموعات - آيـس بـوت`;

        await sock.sendMessage(id, { 
            text: msg,
            contextInfo: {
                externalAdReply: {
                    title: `قائمة ردود المجموعة`,
                    body: `إدارة: ${m.pushName || 'المشرف'}`,
                    mediaType: 1,
                    thumbnailUrl: "https://telegra.ph/file/default-icon.jpg", // يمكنك وضع رابط صورتك هنا
                    sourceUrl: db.settings?.mainGroup || ""
                }
            }
        }, { quoted: m });
    }
};
