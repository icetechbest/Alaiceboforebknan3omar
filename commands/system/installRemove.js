// أمر .تنصيب-حذف — بيلغي البوت الفرعي بتاع الشخص اللي بعت الأمر نفسه فقط
// (ملحوظة: ده أمر إضافي مش مطلوب صراحةً، بس مفيد عشان اللي عنده تنصيب يقدر يقفله بنفسه)

module.exports = {
    name: 'تنصيب-حذف',
    category: 'system',
    async execute(sock, m, args, db, sender) {
        const chatId = m.key.remoteJid;
        const subbotManager = require('../../subbots/subbotManager.js');
        const requesterNumber = subbotManager.extractPureNumber(sender);

        if (!subbotManager.hasActive(requesterNumber)) {
            return sock.sendMessage(chatId, {
                text: '⚠️ معندكش بوت فرعي شغال أصلاً.'
            }, { quoted: m });
        }

        await subbotManager.removeSubBot(requesterNumber, db);
        await sock.sendMessage(chatId, {
            text: '✅ تم حذف البوت الفرعي بتاعك بنجاح.'
        }, { quoted: m });
    }
};
