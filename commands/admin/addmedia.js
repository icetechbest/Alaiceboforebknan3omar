const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'ضصورة',
    aliases: ['حفظ'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;
        if (!isOwner) return sock.sendMessage(id, { text: "⚠️ للمطور فقط!" }, { quoted: m });
        if (!args[0]) return sock.sendMessage(id, { text: "❌ اكتب اسم الشخصية!" }, { quoted: m });

        const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted?.imageMessage) return sock.sendMessage(id, { text: "❌ رد على صورة!" }, { quoted: m });

        const mediaPath = path.join(__dirname, '../../media');
        if (!fs.existsSync(mediaPath)) fs.mkdirSync(mediaPath, { recursive: true });

        const baseName = args.join(' ').trim();
        let finalName = baseName;
        let counter = 1;

        // نظام الترقيم التلقائي: إذا وجد لوفي.jpg، يجعل الجديد لوفي2.jpg وهكذا
        while (fs.existsSync(path.join(mediaPath, `${finalName}.jpg`))) {
            counter++;
            finalName = `${baseName}${counter}`;
        }

        try {
            const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            fs.writeFileSync(path.join(mediaPath, `${finalName}.jpg`), buffer);
            await sock.sendMessage(id, { text: `✅ تم حفظها باسم: *${finalName}*` }, { quoted: m });
        } catch (e) {
            sock.sendMessage(id, { text: "❌ خطأ في التحميل" });
        }
    }
};
