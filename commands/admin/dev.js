module.exports = {
    name: 'المطور',
    aliases: ['developer'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        let devMsg = `🎵 *مُطَوِّرُ بٌوت سُونج* 🎵\n`;
        devMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        devMsg += `👤 *الاسم:* ايس (𝐈𝐂𝐄)\n`;
        devMsg += `🛠️ *الرتبة:* المبرمج الرئيسي ومؤسس النظام\n`;
        devMsg += `📜 *الحالة:* يعمل على تطوير تحديثات جديدة لبوت سونج..\n\n`;
        
        devMsg += `🔗 *للتواصل أو الإبلاغ عن ثغرة:* \n`;
        devMsg += `*اعزب🥲* \n`;
        devMsg += `⇠ واتساب: https://wa.me/201220800288\n\n`;
        
        devMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
        devMsg += `🛡️ *𝐒𝐔𝐍𝐆 𝐁𝐎𝐓 - 𝐃𝐄𝐕: 𝐈𝐂𝐄*`;

        await sock.sendMessage(id, { 
            text: devMsg,
            contextInfo: {
                externalAdReply: {
                    title: "𝐒𝐔𝐍𝐆 𝐁𝐎𝐓 𝐃𝐄𝐕𝐄𝐋𝐎𝐏𝐌𝐄𝐍𝐓",
                    body: "بواسطة المطور ايس",
                    sourceUrl: "https://wa.me/201220800288",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m });
    }
};
