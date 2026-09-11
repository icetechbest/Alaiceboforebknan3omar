module.exports = {
    name: 'تنصيب-فتح',
    category: 'admin',
    async execute(sock, m, args, db, sender, isOwner) {
        const chatId = m.key.remoteJid;

        if (!isOwner) {
            return sock.sendMessage(chatId, { text: '🚫 هذا الأمر مخصص للمالك فقط.' }, { quoted: m });
        }

        db.settings ??= {};
        db.settings.installEnabled = true;

        await sock.sendMessage(chatId, {
            text: '🟢 تم فتح أمر *.تنصيب* — أي حد يقدر دلوقتي يعمل نسخة فرعية من البوت لنفسه.'
        }, { quoted: m });
    }
};
