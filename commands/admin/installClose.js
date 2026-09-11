module.exports = {
    name: 'تنصيب-قفل',
    category: 'admin',
    async execute(sock, m, args, db, sender, isOwner) {
        const chatId = m.key.remoteJid;

        if (!isOwner) {
            return sock.sendMessage(chatId, { text: '🚫 هذا الأمر مخصص للمالك فقط.' }, { quoted: m });
        }

        db.settings ??= {};
        db.settings.installEnabled = false;

        await sock.sendMessage(chatId, {
            text: '🔴 تم قفل أمر *.تنصيب* — محدش هيقدر يعمل بوتات فرعية جديدة لحد ما تفتحه تاني.\n(البوتات الفرعية الشغالة بالفعل مش هتتأثر.)'
        }, { quoted: m });
    }
};
