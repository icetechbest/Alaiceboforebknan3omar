const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'صوت-ترحيب',
    aliases: ['صوت_ترحيب'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        if (args[0] === 'الغاء' || args[0] === 'إلغاء') {
            db[groupID] ??= {};
            delete db[groupID].welcomeVoice;
            return sock.sendMessage(groupID, { text: "🔕 تم إلغاء رسالة الترحيب الصوتية." }, { quoted: m });
        }

        const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted?.audioMessage) {
            return sock.sendMessage(groupID, {
                text: "📖 *طريقة الاستخدام:*\nرد على رسالة صوتية بأمر .صوت-ترحيب\n\nهيتبعت المقطع ده مع رسالة الترحيب النصية لكل عضو جديد.\n(لإلغاء الصوت: .صوت-ترحيب الغاء)"
            }, { quoted: m });
        }

        const voiceDir = path.join(__dirname, '../../media/welcome-voice');
        if (!fs.existsSync(voiceDir)) fs.mkdirSync(voiceDir, { recursive: true });

        const filePath = path.join(voiceDir, `${groupID.replace('@g.us', '')}.ogg`);

        try {
            const stream = await downloadContentFromMessage(quoted.audioMessage, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            fs.writeFileSync(filePath, buffer);

            db[groupID] ??= {};
            db[groupID].welcomeVoice = { path: filePath };

            await sock.sendMessage(groupID, { text: "✅ تم حفظ المقطع الصوتي، هيتبعت مع رسالة الترحيب لكل عضو جديد من دلوقتي." }, { quoted: m });
        } catch (e) {
            console.error("❌ خطأ في تحميل المقطع الصوتي:", e.message);
            await sock.sendMessage(groupID, { text: "❌ حصل خطأ أثناء تحميل المقطع الصوتي." }, { quoted: m });
        }
    }
};
