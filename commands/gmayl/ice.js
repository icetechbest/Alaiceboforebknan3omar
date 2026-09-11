const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'ايس',
    aliases: ['ice', 'المبرمج', 'الارواح', 'السبعة'],
    category: 'special',

    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        let devMsg = `💀 *سَيِّدُ الأَرْوَاحِ السَّبْعَة* 💀\n`;
        devMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        devMsg += `👑 *الاسم:* آيــس (666)\n`;
        devMsg += `💻 *اللقب:* مُهَنْدِسُ الظِّلَالِ\n`;
        devMsg += `🏰 *المملكة:* مَمْلَكَةُ الأَرْوَاحِ السَّبْعَة\n`;
        devMsg += `🎖️ *الرتبة:* المُبَرْمِجُ الأَعْظَمُ\n\n`;

        devMsg += `📜 *الوصف:*\n`;
        devMsg += `« هُوَ الَّذِي يَجْعَلُ الْأَكْوَادَ تَنْحَنِي لِإِرَادَتِهِ، وَيُحَرِّكُ الأَرْوَاحَ السَّبْعَةَ كَأَنَّهَا جُنُودٌ بَيْنَ يَدَيْهِ.\n`;
        devMsg += `لَا تُرْهِبُهُ الْأَخْطَاءُ، وَلَا تُعِيقُهُ الْحِمَايَاتُ، فَإِذَا كَتَبَ سَطْرًا وُلِدَ مِنْهُ عَالَمٌ جَدِيدٌ. »\n\n`;

        devMsg += `☠️ *الألقاب:*\n`;
        devMsg += `◈ صَاحِبُ الأَرْوَاحِ السَّبْعَة\n`;
        devMsg += `◈ مُهَنْدِسُ الظِّلَالِ\n`;
        devMsg += `◈ كَاسِرُ الْحِمَايَاتِ\n`;
        devMsg += `◈ سَيِّدُ النَّوَاةِ\n`;
        devMsg += `◈ صَانِعُ الْأَكْوَادِ الْمُحَرَّمَةِ\n`;
        devMsg += `◈ إِمْبِرَاطُورُ الْخَوَارِزْمِيَّاتِ\n\n`;

        devMsg += `⚡ *مُسْتَوَى الْقُوَّة:* 999999999+\n`;
        devMsg += `👁️ *مُسْتَوَى الْهَيْبَة:* لَا يُقَاس\n`;
        devMsg += `🧠 *الذَّكَاء:* فَوْقَ الْإِدْرَاك\n\n`;

        devMsg += `📞 *للتواصل:*\n`;
        devMsg += `⇠ wa.me/201220800288\n\n`;

        devMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
        devMsg += `💀 *𝐓𝐇𝐄 𝐋𝐄𝐆𝐄𝐍𝐃 𝐎𝐅 𝐓𝐇𝐄 𝐒𝐄𝐕𝐄𝐍 𝐒𝐎𝐔𝐋𝐒*`;

        const audioPath = path.join(process.cwd(), 'data', 'ace.mp3');

        // غير الرابط بصورة آيس لو عندك
        const imageUrl = "https://cdn.phototourl.com/free/2026-07-18-e43d0e2b-45bb-4849-b395-202dea085985.jpg";

        try {
            await sock.sendMessage(id, {
                image: { url: imageUrl },
                caption: devMsg,
                mentions: [sender]
            }, { quoted: m });

            if (fs.existsSync(audioPath)) {
                await sock.sendMessage(id, {
                    audio: fs.readFileSync(audioPath),
                    mimetype: 'audio/mpeg',
                    ptt: false
                }, { quoted: m });
            }

            await sock.sendMessage(id, {
                react: {
                    text: "💀",
                    key: m.key
                }
            });

        } catch (e) {
            console.error(e);
            await sock.sendMessage(id, {
                text: devMsg
            }, { quoted: m });
        }
    }
};