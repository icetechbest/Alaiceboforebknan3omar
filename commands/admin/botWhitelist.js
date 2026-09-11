const { isParticipantAdmin, resolveTargetJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'استثناء-بوت',
    aliases: ['بوت-موثوق'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        const target = resolveTargetJid(m, db, groupMetadata, {});
        if (!target) {
            return sock.sendMessage(groupID, { text: "⚠️ رد على رسالة الشخص أو منشنه عشان تستثنيه." }, { quoted: m });
        }

        db[groupID] ??= {};
        db[groupID].suspectedBots ??= {};
        db[groupID].suspectedBots[target] = { hits: 0, reasons: [], notified: false, whitelisted: true };

        await sock.sendMessage(groupID, {
            text: `✅ تم استثناء @${target.split('@')[0]} نهائيًا من كاشف البوتات في هذا الجروب.`,
            mentions: [target]
        }, { quoted: m });
    }
};
