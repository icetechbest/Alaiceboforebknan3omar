const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'كت',
    aliases: ['كت_تويت', 'أسئلة'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        // مسار ملف الأسئلة في مجلد data
        const filePath = path.join(__dirname, '../../data/kut.json');

        // التأكد من وجود الملف
        if (!fs.existsSync(filePath)) {
            return sock.sendMessage(id, { text: "⚠️ خطأ: ملف الأسئلة غير موجود في data/kut.json" });
        }

        try {
            // قراءة الملف وتحويله لمصفوفة
            const data = fs.readFileSync(filePath, 'utf-8');
            const questions = JSON.parse(data);

            if (questions.length === 0) {
                return sock.sendMessage(id, { text: "⚠️ الملف فارغ، لا توجد أسئلة حالياً." });
            }

            // اختيار سؤال عشوائي
            const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

            // تنسيق الرسالة
            let kutMsg = `💬 *كت تويت | Kut Tweet* 💬\n`;
            kutMsg += `━━━━━━━━━━━━━━━━━━\n\n`;
            kutMsg += `🤔 ${randomQuestion}\n\n`;
            kutMsg += `━━━━━━━━━━━━━━━━━━\n`;
            kutMsg += `✨ أجب على السؤال في التعليقات!`;

            await sock.sendMessage(id, { text: kutMsg }, { quoted: m });

        } catch (error) {
            console.error("خطأ في قراءة ملف كت تويت:", error);
            sock.sendMessage(id, { text: "❌ حدث خطأ أثناء جلب السؤال." });
        }
    }
};
