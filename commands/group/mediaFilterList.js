const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'عرض-فلتر-الميديا',
    aliases: ['فلتر-الميديا'],
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

        const cfg = db[groupID]?.mediaFilter;
        const status = cfg?.enabled ? "✅ مفعّل" : "🔕 متوقف";
        const types = cfg?.types?.length ? cfg.types.join('، ') : "لا يوجد";
        const warnLimit = cfg?.warnLimit || 3;

        await sock.sendMessage(groupID, {
            text: `📎 *فلتر الميديا لهذا الجروب*\n━━━━━━━━━━━━━━\nالحالة: ${status}\nالأنواع الممنوعة: ${types}\nحد التحذيرات قبل الطرد: ${warnLimit}`
        }, { quoted: m });
    }
};
