const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'شيل-كلمة',
    aliases: ['احذف-كلمة', 'سماح-كلمة'],
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

        const word = args.join(" ").toLowerCase().trim();
        if (!word) {
            return sock.sendMessage(groupID, { text: "📖 *طريقة الاستخدام:*\n.شيل-كلمة [الكلمة]" }, { quoted: m });
        }

        const list = db[groupID]?.filter?.words || [];
        const idx = list.indexOf(word);
        if (idx === -1) {
            return sock.sendMessage(groupID, { text: "⚠️ الكلمة دي مش موجودة في قائمة الممنوعات أصلاً." }, { quoted: m });
        }

        list.splice(idx, 1);
        await sock.sendMessage(groupID, { text: `✅ تم حذف "${word}" من قائمة الكلام الممنوع.` }, { quoted: m });
    }
};
