const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'فتح-الوسائط',
    aliases: ['فتح-ميديا'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        db[groupID] ??= {};
        db[groupID].mediaLock ??= {};
        db[groupID].mediaLock.enabled = false;

        await sock.sendMessage(groupID, { text: "🔓📎 تم فتح إرسال الوسائط في هذا الجروب." }, { quoted: m });
    }
};
