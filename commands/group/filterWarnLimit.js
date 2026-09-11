const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'حد-تحذيرات-الفلتر',
    aliases: ['حد-التحذير'],
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

        const num = parseInt(args[0], 10);
        if (!num || num < 1) {
            return sock.sendMessage(groupID, {
                text: "📖 *طريقة الاستخدام:*\n.حد-تحذيرات-الفلتر [رقم]\n\nمثال: .حد-تحذيرات-الفلتر 3\n(يعني هيتطرد بعد 3 تحذيرات لمخالفة الفلتر)"
            }, { quoted: m });
        }

        db[groupID] ??= {};
        db[groupID].filter ??= {};
        db[groupID].filter.warnLimit = num;

        await sock.sendMessage(groupID, { text: `✅ تم ضبط حد التحذيرات على ${num} قبل الطرد التلقائي.` }, { quoted: m });
    }
};
