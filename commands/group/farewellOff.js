const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'إيقاف-وداع',
    category: 'group',
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
        db[groupID].farewell ??= {};
        db[groupID].farewell.enabled = false;

        await sock.sendMessage(groupID, { text: "🔕 تم إيقاف رسالة الوداع في هذا الجروب." }, { quoted: m });
    }
};
