module.exports = {
    name: 'توب-تفاعل',
    aliases: ['ترتيب-التفاعل', 'الاكثر-نشاطا'],
    category: 'group',
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupStats = require('../../index.js').stats[groupID] || {};
        const titles = db[groupID]?.activityTitles || {};

        const players = Object.keys(groupStats)
            .map(jid => ({ jid, total: groupStats[jid]?.total || 0, title: titles[jid] || '' }))
            .filter(p => p.total > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        if (players.length === 0) {
            return sock.sendMessage(groupID, { text: "⚠️ لا يوجد نشاط مسجل بعد في هذا الجروب." }, { quoted: m });
        }

        let msg = `📊 *أنشط 10 أعضاء في الجروب* 📊\n━━━━━━━━━━━━━━━━━━\n\n`;
        players.forEach((p, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
            msg += `${medal} @${p.jid.split('@')[0]}${p.title ? ` — ${p.title}` : ''}\n💬 الرسائل: ${p.total.toLocaleString()}\n━━━━━━━━━━━━━━━━━━\n`;
        });

        await sock.sendMessage(groupID, { text: msg, mentions: players.map(p => p.jid) }, { quoted: m });
    }
};
