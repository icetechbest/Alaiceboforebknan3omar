const { isParticipantAdmin } = require('../../core/messageHandler.js');

// 📤 بيحوّل إحصائيات الجروب (شكلها في stats.json) لملف CSV بسيط: عمود لكل مستخدم
// وإجمالي رسائله. الـ JSON بيتصدر زي ما هو (نفس البيانات الخام).
function toCsv(groupStats) {
    let csv = "jid,total\n";
    for (const [jid, data] of Object.entries(groupStats)) {
        csv += `${jid},${data?.total || 0}\n`;
    }
    return csv;
}

module.exports = {
    name: 'تصدير-الاحصائيات',
    aliases: ['تصدير-احصائيات'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        // نجيب stats.json بتاع الجروب من الملف الفعلي عشان نضمن أحدث نسخة
        const fs = require('fs');
        let stats = {};
        try { stats = JSON.parse(fs.readFileSync('./stats.json', 'utf-8')); } catch (e) { /* هتفضل فاضية */ }
        const groupStats = stats[groupID] || {};

        const format = (args[0] || 'json').toLowerCase();
        const stamp = new Date().toISOString().slice(0, 10);

        if (format === 'csv') {
            const csv = toCsv(groupStats);
            await sock.sendMessage(groupID, {
                document: Buffer.from(csv, 'utf-8'),
                fileName: `group-stats-${stamp}.csv`,
                mimetype: 'text/csv'
            }, { quoted: m });
        } else {
            await sock.sendMessage(groupID, {
                document: Buffer.from(JSON.stringify(groupStats, null, 2), 'utf-8'),
                fileName: `group-stats-${stamp}.json`,
                mimetype: 'application/json'
            }, { quoted: m });
        }
    }
};
