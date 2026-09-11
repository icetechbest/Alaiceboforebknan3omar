module.exports = {
    name: 'الملاك',
    aliases: [ 'الملاك', 'الاونرات', 'المالك'],
    async execute(sock, m, args, db) {
        const groupID = m.key.remoteJid;

        // التحقق من وجود قائمة اونرات في قاعدة البيانات
        if (!db.owners || db.owners.length === 0) {
            // الرقم الأساسي للمطور إذا كانت القائمة فارغة
            const mainOwner = "201220800288@s.whatsapp.net";
            return sock.sendMessage(groupID, { 
                text: `✨ *قائمة النخبة (الملاك)* ✨\n\n👑 المطور الأساسي: @${mainOwner.split('@')[0]}\n\n⚠️ لا يوجد أونرات إضافيين حالياً.`,
                mentions: [mainOwner]
            }, { quoted: m });
        }

        // بناء قائمة الأونرات المسجلين
        let ownersList = `✨ *قـائـمـة نـخـبـة SONG BOT* ✨\n\n`;
        let mentions = [];

        db.owners.forEach((ownerJid, index) => {
            ownersList += `${index + 1} - @${ownerJid.split('@')[0]}\n`;
            mentions.push(ownerJid);
        });

        ownersList += `\n🛡️ هؤلاء هم المسؤولون عن إدارة البوت.`;

        await sock.sendMessage(groupID, { 
            text: ownersList,
            mentions: mentions
        }, { quoted: m });
    }
};
