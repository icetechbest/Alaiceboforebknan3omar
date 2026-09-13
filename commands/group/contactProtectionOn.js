const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'تفعيل-حماية-الجهات',
    aliases: ['حماية-الجهات', 'تشغيل-حماية-الجهات'],
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
        db[groupID].contactProtection ??= {};
        db[groupID].contactProtection.enabled = true;

        await sock.sendMessage(groupID, {
            text: "✅ تم تفعيل حماية الجهات.\n📵 أي حد (غير أدمن) يبعت جهة اتصال هيتطرد فورًا من غير تحذير."
        }, { quoted: m });
    }
};
