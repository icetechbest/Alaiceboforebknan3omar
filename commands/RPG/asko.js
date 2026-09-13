const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'ايسكو',
    aliases: ['asko', 'askko'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        
        // مسار ملف الصوت داخل مجلد data
        // تأكد أن الملف موجود فعلياً بهذا الاسم والامتداد
        const audioPath = path.join(__dirname, '../../data/asko.mp3');

        // التحقق من وجود الملف قبل الإرسال لتجنب كراش البوت
        if (!fs.existsSync(audioPath)) {
            return sock.sendMessage(id, { text: "❌ عذراً، لم يتم العثور على ملف 'last.mp3' في مجلد data." }, { quoted: m });
        }

        try {
            await sock.sendMessage(id, { 
                audio: { url: audioPath }, 
                mimetype: 'audio/mp4', // يرسله كصوت (Audio)
                ptt: false // true يرسله كرسالة صوتية (ريكورد)، false يرسله كملف صوتي
            }, { quoted: m });
        } catch (error) {
            console.error("خطأ أثناء إرسال الصوت:", error);
            await sock.sendMessage(id, { text: "❌ حدث خطأ أثناء محاولة إرسال الملف الصوتي." }, { quoted: m });
        }
    }
};
