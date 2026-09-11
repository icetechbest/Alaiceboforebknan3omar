const fs = require('fs');

module.exports = {
    name: 'كو',
    aliases: ['المؤسس', 'kou', 'كو'],
    category: 'special',

    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        let creatorMsg = `👑 *مُؤَسِّسُ عَرْشِ كــــو ســــتيكرز* 👑\n`;
        creatorMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        creatorMsg += `👤 *الاسم:* *_كــــو_* (𝑲𝑶𝑼)\n`;
        creatorMsg += `🏰 *الكيان:*\n`;
        creatorMsg += `✰┋『𖦹 𝐊𝐎𝐔 ⏤͟͟͞͞🏮 𝑺𝑻𝑰𝑪𝑲𝑬𝑹𝑺 ˚⭒』🇵🇸\n`;
        creatorMsg += `🎖️ *الرتبة:* المـؤسـس الأول\n\n`;

        creatorMsg += `✨ *عن المؤسس:*\n`;
        creatorMsg += `« مَنْ صَنَعَ السِّحْرَ مِنَ الْعَدَمِ، وَأَقَامَ أَرْكَانَ هَذَا الْكَيَانِ.. كُـــو، الْعَقْلُ الْمُدَبِّرُ وَسَيِّدُ السِّحْرِ الْعَظِيم. »\n\n`;

        creatorMsg += `📞 *للتواصل مع المؤسس:*\n`;
        creatorMsg += `⇠ واتساب: https://wa.me/201010495644\n\n`;

        creatorMsg += `🇵🇸 *عاشت فلسطين حرة أبية* 🇵🇸\n\n`;

        creatorMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
        creatorMsg += `🔮 *𝐓𝐇𝐄 𝐅𝐎𝐔𝐍𝐃𝐄𝐑 𝐎𝐅*\n`;
        creatorMsg += `𖦹 𝐊𝐎𝐔 ⏤͟͟͞͞🏮 𝑺𝑻𝑰𝑪𝑲𝑬𝑹𝑺 ˚⭒`;

        const imageUrl = "https://cdn.phototourl.com/free/2026-07-24-5b2f9c9b-3297-42ee-94cb-ea775b1d863c.jpg";

        try {
            // إرسال الصورة مع الرسالة (تظهر للجميع)
            await sock.sendMessage(id, {
                image: { url: imageUrl },
                caption: creatorMsg,
                mentions: [sender]
            }, { quoted: m });

            // رياكشن
            await sock.sendMessage(id, {
                react: {
                    text: "👑",
                    key: m.key
                }
            });

        } catch (err) {
            console.error(err);

            await sock.sendMessage(id, {
                text: creatorMsg
            }, { quoted: m });
        }
    }
};