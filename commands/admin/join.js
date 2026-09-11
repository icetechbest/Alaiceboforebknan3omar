module.exports = {
    name: 'دخول',
    aliases: ['دخول_الرابط', 'انضم'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        // 🛡️ قائمة النخبة (الأونرات فقط)
        const owners = [
            '82159184404714@lid', 
            '232620008976456@lid', 
            '201220800288@s.whatsapp.net' // رقمك يا ايس
        ];

        // 1. التحقق من صلاحية الأونر
        if (!owners.includes(sender)) {
            return sock.sendMessage(id, { 
                text: "🚫 ┇ هذا الأمر مخصص للإدارة العليا لبوت *سونج* فقط." 
            }, { quoted: m });
        }

        // 2. التحقق من وجود الرابط
        const link = args[0];
        if (!link || !link.includes('chat.whatsapp.com/')) {
            return sock.sendMessage(id, { 
                text: "⚠️ ┇ من فضلك أرسل رابط المجموعة الصحيح مع الأمر.\nمثال: *.دخول https://chat.whatsapp.com/xxx*" 
            }, { quoted: m });
        }

        // 3. محاولة الدخول
        try {
            const code = link.split('chat.whatsapp.com/')[1];
            await sock.groupAcceptInvite(code);

            await sock.sendMessage(id, { 
                text: `✅ ┇ *تَم الانضمام بنجاح*\n━━━━━━━━━━━━━━\nتم تلبية نداء الأونر ودخول المجموعة الجديدة بواسطة نظام *سونج* ⚡.` 
            }, { quoted: m });

        } catch (error) {
            console.error('Join Error:', error);
            await sock.sendMessage(id, { 
                text: "❌ ┇ فشل الانضمام. تأكد أن الرابط يعمل أو أن البوت لم يتم طرده سابقاً من هذه المجموعة." 
            }, { quoted: m });
        }
    }
};
