const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'الكلمات-الممنوعة',
    aliases: ['كلمات-ممنوعة', 'عرض-الفلتر'],
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

        const filter = db[groupID]?.filter;
        const words = filter?.words || [];
        const status = filter?.enabled ? "✅ مفعّل" : "🔕 متوقف";
        const warnLimit = filter?.warnLimit || 3;

        const listText = words.length ? words.map((w, i) => `${i + 1}. ${w}`).join('\n') : "لا يوجد كلام ممنوع مسجل حاليًا.";

        await sock.sendMessage(groupID, {
            text: `🧹 *فلتر الكلام الممنوع لهذا الجروب*\n` +
                  `━━━━━━━━━━━━━━\n` +
                  `الحالة: ${status}\n` +
                  `حد التحذيرات قبل الطرد: ${warnLimit}\n` +
                  `━━━━━━━━━━━━━━\n${listText}`
        }, { quoted: m });
    }
};
