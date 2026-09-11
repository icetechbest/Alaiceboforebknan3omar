const { isParticipantAdmin, DEFAULT_ACTIVITY_RANKS } = require('../../core/messageHandler.js');

module.exports = {
    name: 'شيل-رتبة-تفاعل',
    aliases: ['حذف-رتبة-تفاعل'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        const ranks = db[groupID]?.activityRanks?.length ? db[groupID].activityRanks : DEFAULT_ACTIVITY_RANKS.map(r => ({ ...r }));
        const index = parseInt(args[0]) - 1;

        if (isNaN(index) || index < 0 || index >= ranks.length) {
            return sock.sendMessage(groupID, {
                text: `📖 اكتب رقم الرتبة من القايمة (شوفها بـ .رتب-التفاعل)\nمثال: .شيل-رتبة-تفاعل 2`
            }, { quoted: m });
        }

        const removed = ranks.splice(index, 1)[0];
        db[groupID] ??= {};
        db[groupID].activityRanks = ranks;

        await sock.sendMessage(groupID, { text: `✅ تم شيل الرتبة: ${removed.threshold.toLocaleString()} رسالة → ${removed.title}` }, { quoted: m });
    }
};
