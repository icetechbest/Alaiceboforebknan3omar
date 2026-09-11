const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'حذف-سؤال',
    aliases: ['امسح-سؤال', 'الغاء-سؤال'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        // بنستخدم نفس منطق تحديد الكلمة المفتاحية المستخدم في .سؤال (join كل الأرجيومنتس)
        // عشان نضمن إننا بنلاقي نفس المفتاح المسجل بالظبط.
        const keyword = args.join(' ').trim().toLowerCase();

        if (!keyword) {
            return sock.sendMessage(groupID, {
                text: "📖 *طريقة الاستخدام:*\n.حذف-سؤال [الكلمة المفتاحية]\n\nشوف كل الأسئلة المسجلة بـ .الاسئلة-الشائعة"
            }, { quoted: m });
        }

        const faq = db[groupID]?.faq;
        if (!faq || !(keyword in faq)) {
            return sock.sendMessage(groupID, { text: "❌ الكلمة دي مش مسجلة أصلاً في الأسئلة الشائعة." }, { quoted: m });
        }

        delete faq[keyword];

        await sock.sendMessage(groupID, { text: `🗑️ تم حذف السؤال *${keyword}* من الأسئلة الشائعة.` }, { quoted: m });
    }
};
