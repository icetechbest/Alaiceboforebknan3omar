const fs = require('fs');

module.exports = {
    name: 'فاكهه',
    aliases: ['فواكه', 'حزر_فاكهه'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        // التحقق من وجود مسابقة جارية
        if (db.puzzles && db.puzzles[id]) {
            return sock.sendMessage(id, { text: "❌ هناك مسابقة جارية بالفعل! أنهِها أولاً." }, { quoted: m });
        }

        const fruits = [
            { name: "تفاح", emoji: "🍎" }, { name: "تفاح اخضر", emoji: "🍏" }, { name: "موز", emoji: "🍌" },
            { name: "بطيخ", emoji: "🍉" }, { name: "عنب", emoji: "🍇" }, { name: "فراولة", emoji: "🍓" },
            { name: "كرز", emoji: "🍒" }, { name: "خوخ", emoji: "🍑" }, { name: "اناناس", emoji: "🍍" },
            { name: "جوز هند", emoji: "🥥" }, { name: "كيوي", emoji: "🥝" }, { name: "طماطم", emoji: "🍅" },
            { name: "باذنجان", emoji: "🍆" }, { name: "ليمون", emoji: "🍋" }, { name: "برتقال", emoji: "🍊" },
            { name: "كمثرى", emoji: "🍐" }, { name: "مانجو", emoji: "🥭" }, { name: "شمام", emoji: "🍈" },
            { name: "تين", emoji: "🍯" }, { name: "توت", emoji: "🫐" }, { name: "زيتون", emoji: "🫒" },
            { name: "افوكادو", emoji: "🥑" }, { name: "فلفل", emoji: "🌶️" }, { name: "ذرة", emoji: "🌽" }
        ];

        const randomFruit = fruits[Math.floor(Math.random() * fruits.length)];
        const answer = randomFruit.name;

        if (!db.puzzles) db.puzzles = {};
        db.puzzles[id] = { answer: answer, startTime: Date.now(), reward: 200 };

        await sock.sendMessage(id, { 
            text: `🍎 *لعبة الفواكه - سونج بوت*\n\nما هو اسم الفاكهة التي يرمز لها هذا الإيموجي؟\n\nالرمـز:  [ ${randomFruit.emoji} ]\n\n💰 الجائزة: *200 ذهبة*\n⏳ الوقت: *15 ثانية*` 
        }, { quoted: m });

        // مؤقت انتهاء الوقت - بيستخدم كائن db الحي في الذاكرة مباشرة عشان
        // الحذف يتزامن فعلياً مع باقي البوت (مش مجرد تعديل نسخة قديمة من الملف).
        setTimeout(async () => {
            if (db.puzzles && db.puzzles[id] && db.puzzles[id].answer === answer) {
                delete db.puzzles[id];
                await sock.sendMessage(id, { text: `⏰ انتهى الوقت! الفاكهة كانت: *${answer}*` });
            }
        }, 15000);
    }
};
