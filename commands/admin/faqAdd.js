const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'اضف-سؤال',
    aliases: ['ضيف-سؤال'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        const keyword = (args[0] || '').trim().toLowerCase();
        const reply = args.slice(1).join(' ').trim();

        if (!keyword || !reply) {
            return sock.sendMessage(groupID, {
                text: "📖 *طريقة الاستخدام:*\n.اضف-سؤال [الكلمة المفتاحية] [الرد]\n\nمثال: .اضف-سؤال مواعيد الجروب مفتوح 24 ساعة"
            }, { quoted: m });
        }

        db[groupID] ??= {};
        db[groupID].faq ??= {};
        db[groupID].faq[keyword] = reply;

        await sock.sendMessage(groupID, {
            text: `✅ تم حفظ الرد على كلمة *${keyword}*.\nأي عضو يقدر يسأل بـ .سؤال ${keyword}`
        }, { quoted: m });
    }
};
