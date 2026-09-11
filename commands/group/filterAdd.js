const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'اضف-كلمة',
    aliases: ['ضيف-كلمة', 'منع-كلمة'],
    category: 'group',
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        if (args.length === 0) {
            return sock.sendMessage(groupID, {
                text: "📖 *طريقة الاستخدام:*\n.اضف-كلمة [كلمة1] [كلمة2] ...\n\nممكن تضيف أكتر من كلمة مرة واحدة، مفصولين بمسافة."
            }, { quoted: m });
        }

        db[groupID] ??= {};
        db[groupID].filter ??= {};
        db[groupID].filter.words ??= [];

        const added = [];
        for (const raw of args) {
            const word = raw.toLowerCase().trim();
            if (word && !db[groupID].filter.words.includes(word)) {
                db[groupID].filter.words.push(word);
                added.push(word);
            }
        }

        if (added.length === 0) {
            return sock.sendMessage(groupID, { text: "⚠️ الكلمة/الكلمات دي متسجلة بالفعل في قائمة الممنوعات." }, { quoted: m });
        }

        await sock.sendMessage(groupID, {
            text: `✅ تمت إضافة (${added.length}) كلمة لقائمة الكلام الممنوع:\n${added.join('، ')}\n\n` +
                  `💡 لو الفلتر لسه مش مفعّل، فعّله بـ .تفعيل-فلتر`
        }, { quoted: m });
    }
};
