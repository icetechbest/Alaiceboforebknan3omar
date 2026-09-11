const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'تفعيل-حماية-الروابط',
    aliases: ['حماية-الروابط', 'تشغيل-حماية-الروابط'],
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
        db[groupID].linkProtection ??= {};
        db[groupID].linkProtection.enabled = true;

        await sock.sendMessage(groupID, {
            text: "✅ تم تفعيل حماية الروابط.\n🔗 أي رابط (واتساب أو رابط عام) هيتحذف تلقائيًا لو مبعوت من غير أدمن."
        }, { quoted: m });
    }
};
