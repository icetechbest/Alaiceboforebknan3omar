const { isAssassin, getAssassinRank } = require('../../data/classSystem.js');

module.exports = {
    name: 'ترتيب_مغتالين',
    aliases: ['اخطر_مغتال', 'ترتيب مغتالين'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        // ⚠️ الترتيب ده بيعرض بس اللاعبين اللي اتكشفوا فعلاً (revealed)
        // عن طريق .كشف-مغتال - عشان مايبقاش وسيلة تانية لفضح مغتال سري.
        const revealedAssassins = Object.entries(db)
            .filter(([jid, user]) => jid.endsWith('@s.whatsapp.net') && isAssassin(user) && user.revealed)
            .sort((a, b) => (b[1].ambushWins || 0) - (a[1].ambushWins || 0))
            .slice(0, 10);

        if (revealedAssassins.length === 0) {
            return sock.sendMessage(id, {
                text: "🕵️ مفيش أي مغتال مكشوف لحد دلوقتي في المملكة. جرب *.كشف-مغتال* لو مشكوك في حد!"
            }, { quoted: m });
        }

        let msg = `🥷 *أخطر المغتالين المكشوفين* 🥷\n━━━━━━━━━━━━━━━━━━━━\n`;
        const mentions = [];

        revealedAssassins.forEach(([jid, user], index) => {
            const rank = getAssassinRank(user);
            const medal = ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
            msg += `${medal} @${jid.split('@')[0]} — ${rank.label} (${user.ambushWins || 0} اغتيال ناجح)\n`;
            mentions.push(jid);
        });

        msg += `━━━━━━━━━━━━━━━━━━━━`;

        await sock.sendMessage(id, { text: msg, mentions }, { quoted: m });
    }
};
