const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'استيكر',
    aliases: ['س', 'sticker'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;
        const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
        const msg = m.message.imageMessage || quoted?.imageMessage;

        if (!msg) return sock.sendMessage(id, { text: "⚠️ رد على صورة بـ .استيكر" });

        try {
            const stream = await downloadContentFromMessage(msg, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }

            const tempImg = path.join(__dirname, `temp_${Date.now()}.jpg`);
            const tempSticker = path.join(__dirname, `temp_${Date.now()}.webp`);
            fs.writeFileSync(tempImg, buffer);

            // أمر ffmpeg المطور للقص الاحترافي بدون حواف
            exec(`ffmpeg -i ${tempImg} -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,setsar=1" ${tempSticker}`, async (err) => {
                if (err) return sock.sendMessage(id, { text: "❌ فشل التحويل." });

                const stickerBuffer = fs.readFileSync(tempSticker);
                await sock.sendMessage(id, { sticker: stickerBuffer }, { quoted: m });

                if (fs.existsSync(tempImg)) fs.unlinkSync(tempImg);
                if (fs.existsSync(tempSticker)) fs.unlinkSync(tempSticker);
            });
        } catch (e) { console.error(e); }
    }
};
