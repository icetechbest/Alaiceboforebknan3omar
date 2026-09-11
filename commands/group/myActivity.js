const { DEFAULT_ACTIVITY_RANKS, resolveTargetJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'رتبتي',
    aliases: ['مستوى-تفاعلي', 'نشاطي'],
    category: 'group',
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        const target = resolveTargetJid(m, db, groupMetadata, { fallbackTo: sender });

        const total = require('../../index.js').stats[groupID]?.[target]?.total || 0;
        const ranks = (db[groupID]?.activityRanks?.length ? db[groupID].activityRanks : DEFAULT_ACTIVITY_RANKS)
            .slice()
            .sort((a, b) => a.threshold - b.threshold);

        const currentTitle = db[groupID]?.activityTitles?.[target] || null;
        const next = ranks.find(r => r.threshold > total);

        let msg = `📈 *مستوى التفاعل*\n━━━━━━━━━━━━━━\n`;
        msg += `👤 @${target.split('@')[0]}\n`;
        msg += `💬 إجمالي الرسائل في الجروب: ${total.toLocaleString()}\n`;
        msg += `🏅 اللقب الحالي: ${currentTitle || 'لسه مفيش'}\n`;
        msg += next ? `🎯 الرتبة الجاية: ${next.title} (محتاج ${(next.threshold - total).toLocaleString()} رسالة كمان)` : `👑 وصلت لأعلى رتبة متاحة!`;

        await sock.sendMessage(groupID, { text: msg, mentions: [target] }, { quoted: m });
    }
};
