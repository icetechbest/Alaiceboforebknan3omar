const { DEFAULT_ACTIVITY_RANKS } = require('../../core/messageHandler.js');

module.exports = {
    name: 'رتب-التفاعل',
    aliases: ['رتب-النشاط'],
    async execute(sock, m, args, db) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const ranks = (db[groupID]?.activityRanks?.length ? db[groupID].activityRanks : DEFAULT_ACTIVITY_RANKS)
            .slice()
            .sort((a, b) => a.threshold - b.threshold);

        let msg = `🏅 *رتب التفاعل في هذا الجروب*\n━━━━━━━━━━━━━━\n`;
        ranks.forEach((r, i) => {
            msg += `${i + 1}. ${r.threshold.toLocaleString()} رسالة → ${r.title}\n`;
        });
        if (!db[groupID]?.activityRanks?.length) {
            msg += `\n(دي الرتب الافتراضية، لسه محدش عدّلها بـ .اضف-رتبة-تفاعل)`;
        }

        await sock.sendMessage(groupID, { text: msg }, { quoted: m });
    }
};
