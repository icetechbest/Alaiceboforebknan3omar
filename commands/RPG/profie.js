const { classTitle } = require('../../data/classSystem.js');

module.exports = {
    name: 'مملكتي',
    async execute(sock, m, args, db, sender) {
        const user = db[sender];

        if (!user) {
            return await sock.sendMessage(m.key.remoteJid, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });
        }

        // هنا بنعرض كل البيانات المخزنة
        let status = `🏰 *مملكة الملك: ${user.name}*\n` +
                     `━━━━━━━━━━━━━━━━\n` +
                     `🎭 الفئة: ${classTitle(user)}\n` +
                     `⭐ المستوى: ${user.level}\n` +
                     `✨ الخبرة: ${user.xp}\n` +
                     `💰 الذهب: ${user.gold}\n` +
                     `❤️ الصحة: ${user.hp}\n` +
                     `⚔️ الهجوم: ${user.atk}\n` +
                     `🛡️ الدفاع: ${user.defense}\n` +
                     `━━━━━━━━━━━━━━━━\n` +
                     `👑 ابنِ مجدك ووسع نفوذك!`;

        await sock.sendMessage(m.key.remoteJid, { text: status }, { quoted: m });
    }
};

