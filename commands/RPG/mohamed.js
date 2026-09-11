const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'محمد',
    aliases: ['علوان', 'محمد_علوان'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        
        // مسار الملصق داخل مجلد data
        // ملاحظة: الملصقات في واتساب يجب أن تكون بصيغة .webp
        const stickerPath = path.join(__dirname, '../../data/mohamed.webp');

        // التحقق من وجود الملصق قبل الإرسال
        if (!fs.existsSync(stickerPath)) {
            return sock.sendMessage(id, { text: "❌ عذراً، لم يتم العثور على ملصق باسم 'mohamed.webp' في مجلد data." }, { quoted: m });
        }

        try {
            await sock.sendMessage(id, { 
                sticker: fs.readFileSync(stickerPath)
            }, { quoted: m });
        } catch (error) {
            console.error("خطأ أثناء إرسال الملصق:", error);
            await sock.sendMessage(id, { text: "❌ حدث خطأ أثناء محاولة إرسال الملصق." }, { quoted: m });
        }
    }
};
