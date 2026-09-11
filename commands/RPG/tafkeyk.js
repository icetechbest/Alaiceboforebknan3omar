const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'تفكيك',
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        // التأكد إن مافيش مسابقة شغالة في الجروب ده حالياً
        if (db.puzzles && db.puzzles[id]) {
            return sock.sendMessage(id, { text: "❌ هناك مسابقة جارية بالفعل في هذا الجروب!" }, { quoted: m });
        }

        // تحميل البيانات
        const dataPath = path.join(__dirname, '../../data/anime_chars.json');
        const characters = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

        // اختيار شخصية عشوائية
        const char = characters[Math.floor(Math.random() * characters.length)];
        const originalName = char.name;
        
        // تفكيك الاسم (وضع مسافات بين الحروف)
        const disassembledName = originalName.split('').join('   ');

        // تخزين اللغز في الداتابيز
        if (!db.puzzles) db.puzzles = {};
        db.puzzles[id] = {
            answer: originalName,
            type: 'تفكيك',
            time: Date.now(),
            reward: 200
        };

        let caption = `🧩 *لعبة التفكيك* 🧩\n`;
        caption += `━━━━━━━━━━━━━━━━━━\n`;
        caption += `🌀 أجمع حروف هذه الشخصية:\n\n`;
        caption += `🔹 *[ ${disassembledName} ]*\n\n`;
        caption += `📺 من أنمي: *${char.anime}*\n`;
        caption += `━━━━━━━━━━━━━━━━━━\n`;
        caption += `💰 الجائزة: *200* ذهبة\n`;
        caption += `⏳ الوقت: *30 ثانية*`;

        await sock.sendMessage(id, { text: caption }, { quoted: m });

        // مؤقت إنهاء المسابقة - كانت ناقصة تماماً قبل كده وده كان بيخلّي
        // اللغز يفضل "شغال" للأبد ويمنع أي مسابقة تانية في نفس الجروب.
        setTimeout(async () => {
            if (db.puzzles && db.puzzles[id] && db.puzzles[id].answer === originalName) {
                delete db.puzzles[id];
                await sock.sendMessage(id, { text: `⏰ انتهى الوقت! الشخصية كانت: *${originalName}*` });
            }
        }, 30000);
    }
};
