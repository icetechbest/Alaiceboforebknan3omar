module.exports = {
    name: 'سؤال',
    aliases: ['استفسار'],
    category: 'group',
    async execute(sock, m, args, db, sender) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const keyword = args.join(' ').trim().toLowerCase();
        const faq = db[groupID]?.faq || {};

        if (!keyword) {
            return sock.sendMessage(groupID, { text: "📖 الاستخدام: .سؤال [الكلمة المفتاحية]\nشوف كل الأسئلة بـ .الاسئلة-الشائعة" }, { quoted: m });
        }

        const reply = faq[keyword];
        if (!reply) {
            return sock.sendMessage(groupID, { text: "❓ مفيش رد مسجل لهذا السؤال. شوف قائمة الأسئلة بـ .الاسئلة-الشائعة" }, { quoted: m });
        }

        await sock.sendMessage(groupID, { text: `💬 ${reply}` }, { quoted: m });
    }
};
