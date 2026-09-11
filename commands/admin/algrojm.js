const fs = require('fs');

module.exports = {
    name: 'احصائياتي',
    async execute(sock, m, args, db, sender) {
        if (!fs.existsSync('./stats.json')) return sock.sendMessage(m.key.remoteJid, { text: "❌ لا توجد بيانات مسجلة بعد." });
        let stats = JSON.parse(fs.readFileSync('./stats.json', 'utf-8'));
        const userStats = stats[sender];

        if (!userStats) return sock.sendMessage(m.key.remoteJid, { text: "⚠️ لم يتم تسجيل رسائل لك حتى الآن." });

        const now = new Date();
        const d = userStats.daily[`${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`] || 0;
        const mth = userStats.monthly[`${now.getFullYear()}-${now.getMonth()+1}`] || 0;
        const y = userStats.yearly[`${now.getFullYear()}`] || 0;

        let txt = `📊 *إحصائيات رسائلك يا ${m.pushName}*\n\n`;
        txt += `📅 اليوم: ${d}\n`;
        txt += `📅 الشهر: ${mth}\n`;
        txt += `📅 السنة: ${y}\n`;
        txt += `✨ الإجمالي: ${userStats.total}`;

        await sock.sendMessage(m.key.remoteJid, { text: txt }, { quoted: m });
    }
};
