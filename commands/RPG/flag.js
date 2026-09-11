const { atomicWriteJsonSync } = require('../../dashboard-server/storage.js');

module.exports = {
    name: 'علم',
    aliases: ['دولة', 'اعلام'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        // التأكد إن مافيش مسابقة شغالة في الجروب ده حالياً
        if (db.puzzles && db.puzzles[id]) {
            return sock.sendMessage(id, { text: "❌ هناك مسابقة جارية بالفعل في هذا الجروب!" }, { quoted: m });
        }

        const flags = [
            { name: "مصر", emoji: "🇪🇬" }, { name: "السعودية", emoji: "🇸🇦" }, { name: "فلسطين", emoji: "🇵🇸" },
            { name: "المغرب", emoji: "🇲🇦" }, { name: "الجزائر", emoji: "🇩🇿" }, { name: "تونس", emoji: "🇹🇳" },
            { name: "العراق", emoji: "🇮🇶" }, { name: "سوريا", emoji: "🇸🇾" }, { name: "لبنان", emoji: "🇱🇧" },
            { name: "الاردن", emoji: "🇯🇴" }, { name: "الكويت", emoji: "🇰🇼" }, { name: "الامارات", emoji: "🇦🇪" },
            { name: "اليابان", emoji: "🇯🇵" }, { name: "الصين", emoji: "🇨🇳" }, { name: "فرنسا", emoji: "🇫🇷" },
            { name: "المانيا", emoji: "🇩🇪" }, { name: "ايطاليا", emoji: "🇮🇹" }, { name: "البرازيل", emoji: "🇧🇷" }
            // ... (باقي الأعلام اللي عندك)
        ];

        const randomFlag = flags[Math.floor(Math.random() * flags.length)];
        const answer = randomFlag.name;

        // حفظ الإجابة في الـ db اللي في الذاكرة فوراً
        db.puzzles ??= {};
        db.puzzles[id] = { 
            answer: answer, 
            startTime: Date.now(),
            reward: 200
        };

        await sock.sendMessage(id, { 
            text: `🌍 *لعبة الأعلام - سونج بوت*\n\nحزر علم أي دولة هذا؟\n\nالـعـلـم:  [ ${randomFlag.emoji} ]\n\n💰 الجائزة: *200 ذهبة*\n⏳ الوقت: *30 ثانية*` 
        }, { quoted: m });

        // التايمر عشان ينهي المسابقة لو محدش جاوب
        setTimeout(async () => {
            // نتحقق إذا كانت المسابقة لسه موجودة (محدش جاوب صح)
            if (db.puzzles && db.puzzles[id] && db.puzzles[id].answer === answer) {
                delete db.puzzles[id]; // مسح من الذاكرة
                
                // تحديث ملف الـ JSON عشان لو البوت رستر
                atomicWriteJsonSync('./database.json', db);
                
                await sock.sendMessage(id, { text: `⏰ انتهى الوقت! الدولة كانت: *${answer}*` });
            }
        }, 30000);
    }
};
