module.exports = {
    name: 'عجلة الحظ',
    aliases: ['عجلة', 'عجله'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const user = db[sender];

        const now = Date.now();
        const cooldown = db.settings?.cooldowns?.['عجلة'] || 86400000; // افتراضي 24 ساعة

        if (user.lastSpin && now - user.lastSpin < cooldown) {
            const timeLeft = cooldown - (now - user.lastSpin);
            const hours = Math.floor(timeLeft / 3600000);
            const minutes = Math.floor((timeLeft % 3600000) / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            return sock.sendMessage(id, { text: `⏳ انتظر: [ ${hours}س ${minutes}د ${seconds}ث ]` }, { quoted: m });
        }

        let prize = user.gold < 5000 ? Math.floor(Math.random() * 1000) + 1000 : Math.floor(Math.random() * 400) + 100;
        user.gold += prize;
        user.lastSpin = now; // تحديث الوقت

        await sock.sendMessage(id, { text: `🎡 حصلت على +${prize} ذهبة!` }, { quoted: m });
    }
};
