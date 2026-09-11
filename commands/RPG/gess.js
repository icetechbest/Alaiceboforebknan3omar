const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'تخمين',
    aliases: ['حزر', 'شخصية'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        // التحقق من وجود مسابقة جارية
        if (db.puzzles && db.puzzles[id]) {
            return sock.sendMessage(id, { text: "❌ هناك مسابقة جارية بالفعل في هذا الجروب!" }, { quoted: m });
        }

        const mediaPath = path.join(__dirname, '../../media');
        
        // جلب الصور المدعومة
        const files = fs.readdirSync(mediaPath).filter(file => 
            file.toLowerCase().endsWith('.jpg') || 
            file.toLowerCase().endsWith('.png') || 
            file.toLowerCase().endsWith('.jpeg')
        );

        if (files.length === 0) return sock.sendMessage(id, { text: "⚠️ مجلد 'media' فارغ!" });

        // اختيار صورة عشوائية
        const randomFile = files[Math.floor(Math.random() * files.length)];
        
        // --- [ معالجة الاسم الذكية ] ---
        // 1. حذف الامتداد (مثل .jpg)
        let rawName = randomFile.split('.')[0].trim();
        // 2. حذف الأرقام من نهاية الاسم (مثل لوفي2 تصبح لوفي) باستخدام Regex
        const answer = rawName.replace(/\d+$/, '').trim();
        // ------------------------------

        const imagePath = path.join(mediaPath, randomFile);

        if (!db.puzzles) db.puzzles = {};
        // تخزين الإجابة "النظيفة" بدون أرقام
        db.puzzles[id] = {
            answer: answer.toLowerCase(),
            startTime: Date.now(),
            reward: 100
        };

        try {
            await sock.sendMessage(id, {
                image: fs.readFileSync(imagePath),
                caption: "🧩 *لعبة التخمين - سونغ بوت*\n\nمن هي هذه الشخصية الظاهرة في الصورة؟\n\n💰 الجائزة: *100 ذهبة*\n⏳ الوقت: *15 ثانية*"
            }, { quoted: m });

            // مؤقت لإنهاء اللعبة - لازم نستخدم نفس كائن db الحي في الذاكرة
            // (مش نسخة تانية من الملف)، وإلا الحذف مايتزامنش مع باقي البوت
            // وتفضل المسابقة "شغالة" في نظر باقي الأوامر حتى لو خلص وقتها فعلياً.
            setTimeout(async () => {
                if (db.puzzles && db.puzzles[id] && db.puzzles[id].answer === answer.toLowerCase()) {
                    delete db.puzzles[id];
                    await sock.sendMessage(id, {
                        text: `⏰ انتهى الوقت ولم يعرف أحد الإجابة!\nالشخصية كانت: *${answer}*`
                    });
                }
            }, 15000);

        } catch (error) {
            console.error("Error in Guess Command:", error);
            if (db.puzzles[id]) delete db.puzzles[id];
            sock.sendMessage(id, { text: "❌ فشل إرسال الصورة." });
        }
    }
};
