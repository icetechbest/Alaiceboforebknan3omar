module.exports = {
    name: 'اكثر-داعي',
    aliases: ['أكثر-داعي', 'ترتيب-الدعوات'],
    category: 'group',
    async execute(sock, m, args, db, sender) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const scores = db[groupID]?.inviterScores || {};
        const ranking = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 10);

        if (ranking.length === 0) {
            return sock.sendMessage(groupID, { text: "📭 لسه محدش جاب حد للجروب عن طريق نظام .سجل-دعوة." }, { quoted: m });
        }

        let msg = `📣 *ترتيب أكتر الأعضاء دعوة لأصحابهم*\n━━━━━━━━━━━━━━━━━━\n`;
        ranking.forEach(([jid, score], i) => {
            msg += `${i + 1}. @${jid.split('@')[0]} — ${score} دعوة ناجحة\n`;
        });
        msg += `━━━━━━━━━━━━━━━━━━`;

        await sock.sendMessage(groupID, { text: msg, mentions: ranking.map(([jid]) => jid) }, { quoted: m });
    }
};
