const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'قفل-الوسائط',
    aliases: ['قفل-ميديا'],
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
        db[groupID].mediaLock.enabled = true;

        await sock.sendMessage(groupID, {
            text: "🔒📎 تم قفل إرسال الوسائط (صور/فيديو/ستيكرات/مستندات) في هذا الجروب فقط، الكتابة العادية شغالة عادي.\n(عكس .الجروب قفل اللي بيقفل كل حاجة)"
        }, { quoted: m });
    }
};
