const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'يوريتشي',
    aliases: ['الامبراطور', 'yoriichi', 'vegorith'],
    category: 'special',

    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        let empMsg = `🔥 *حَامِلُ بَصِيرَةِ 𝐕𝐄𝐆𝐎𝐑𝐈𝐓𝐇* 🔥\n`;
        empMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        empMsg += `👑 *الاسم:* يــوريتشــي\n`;
        empMsg += `🏰 *المملكة:* مَمْلَكَةُ اللَّهَبِ 🔥\n`;
        empMsg += `🎖️ *الرتبة:* حَامِلُ بَصِيرَةِ 𝐕𝐄𝐆𝐎𝐑𝐈𝐓𝐇\n\n`;

        empMsg += `📜 *الوصف:*\n`;
        empMsg += `« مَنْ أَشْرَقَتِ النِّيرَانُ بِخُطَاهُ، وَانْحَنَتْ أَمَامَهُ الْمَعَارِكُ... `;
        empMsg += `حَامِلُ بَصِيرَةِ 𝐕𝐄𝐆𝐎𝐑𝐈𝐓𝐇، سَيِّدُ مَمْلَكَةِ اللَّهَبِ، `;
        empMsg += `وَالْمُحَارِبُ الَّذِي لَا يَعْرِفُ الْهَزِيمَةَ. »\n\n`;

        empMsg += `📞 *للتواصل:*\n`;
        empMsg += `⇠ wa.me/212689925939\n\n`;

        empMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
        empMsg += `⚔️ *𝐁𝐄𝐀𝐑𝐄𝐑 𝐎𝐅 𝐕𝐄𝐆𝐎𝐑𝐈𝐓𝐇*`;

        // مسار ملف الفويس
        const audioPath = path.join(process.cwd(), 'data', 'yori.mp3');

        // صورة يوريتشي
        const imageUrl = "https://cdn.phototourl.com/free/2026-07-18-b91ea723-fa39-4aa6-8d32-194d0ed374f5.jpg";

        try {
            // إرسال الصورة مع الرسالة
            await sock.sendMessage(id, {
                image: { url: imageUrl },
                caption: empMsg,
                mentions: [sender]
            }, { quoted: m });

            // إرسال الفويس إذا كان موجودًا
            if (fs.existsSync(audioPath)) {
                await sock.sendMessage(id, {
                    audio: fs.readFileSync(audioPath),
                    mimetype: 'audio/mpeg',
                    ptt: false // يتبعت كفويس
                }, { quoted: m });
            } else {
                console.log("⚠️ ملف yori.mp3 غير موجود داخل مجلد data");
            }

            // إضافة رياكشن
            await sock.sendMessage(id, {
                react: {
                    text: "🔥",
                    key: m.key
                }
            });

        } catch (err) {
            console.error(err);

            await sock.sendMessage(id, {
                text: empMsg
            }, { quoted: m });
        }
    }
};