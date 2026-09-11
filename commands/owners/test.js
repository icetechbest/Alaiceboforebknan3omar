const fs = require('fs');
const path = require('path');

module.exports = {
    name: "تست",
    category: "tools",
    async execute(sock, m, args, db, sender) {
        try {
            const groupID = m.key.remoteJid;
            // تأكد إن الصورة اسمها image.jpeg وموجودة في فولدر البوت
            const imgPath = path.join(process.cwd(), 'image.jpeg'); 

            const fancyText = `
╭─❖ 『 ❄️ 𝐈𝐂𝐄 𝐁𝐎𝐓 』 ❖─╮
│
│ *» 𝐃𝐎𝐍'𝐓 𝐌𝐄𝐒𝐒 𝐖𝐈𝐓𝐇 𝐈𝐂𝐄 «*
│  *_𝐅𝐑𝐄𝐄𝐙𝐈𝐍𝐆 𝐓𝐇𝐄 𝐒𝐘𝐒𝐓𝐄𝐌_*
│
│ 👤 *المطور:* ايس
│ 📱 *رقم المطور:* 01220800288
│
╰────────────╯`.trim();

            if (fs.existsSync(imgPath)) {
                // إرسال الصورة وفوقيها النص (دي الطريقة المضمونة 100%)
                await sock.sendMessage(groupID, { 
                    image: fs.readFileSync(imgPath), 
                    caption: fancyText,
                    mentions: [sender]
                }, { quoted: m });
            } else {
                // لو الصورة مش موجودة يبعت نص فخم بس عشان ميعلقش
                await sock.sendMessage(groupID, { 
                    text: `⚠️ *الصورة غير موجودة في السيرفر*\n\n${fancyText}` 
                }, { quoted: m });
            }

            // رياكشن ثلج
            await sock.sendMessage(groupID, { react: { text: "❄️", key: m.key } });

        } catch (err) {
            console.error("❌ خطأ في أمر تست:", err);
            await sock.sendMessage(m.key.remoteJid, { text: "❄️ النظام شغال لكن فيه مشكلة في إرسال الميديا." }, { quoted: m });
        }
    }
};
