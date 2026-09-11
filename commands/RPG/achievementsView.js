const { listAchievements } = require('../../data/achievements.js');

module.exports = {
    name: 'انجازاتي',
    aliases: ['اوسمتي', 'انجازات'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        if (!db[sender]) {
            return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });
        }

        const achievements = listAchievements(db[sender]);
        const unlockedCount = achievements.filter(a => a.unlocked).length;

        let msg = `🏅 *إنجازاتي (${unlockedCount}/${achievements.length})*\n━━━━━━━━━━━━━━━━━━\n`;
        for (const a of achievements) {
            msg += `${a.unlocked ? '✅' : '🔒'} ${a.label}\n`;
        }
        msg += `━━━━━━━━━━━━━━━━━━`;

        await sock.sendMessage(id, { text: msg }, { quoted: m });
    }
};
