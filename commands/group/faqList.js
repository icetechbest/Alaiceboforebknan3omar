module.exports = {
    name: 'الاسئلة-الشائعة',
    aliases: ['الأسئلة-الشائعة'],
    category: 'group',
    async execute(sock, m, args, db, sender) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const faq = db[groupID]?.faq || {};
        const keywords = Object.keys(faq);

        if (keywords.length === 0) {
            return sock.sendMessage(groupID, { text: "📭 مفيش أسئلة شائعة مسجلة في هذا الجروب لسه." }, { quoted: m });
        }

        let msg = `❓ *الأسئلة الشائعة في هذا الجروب*\n━━━━━━━━━━━━━━━━━━\n`;
        keywords.forEach((k, i) => { msg += `${i + 1}. ${k}\n`; });
        msg += `━━━━━━━━━━━━━━━━━━\nللسؤال: .سؤال [الكلمة]`;

        await sock.sendMessage(groupID, { text: msg }, { quoted: m });
    }
};
