const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'حد-المنشن',
    aliases: ['حد-التاج'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        const limit = parseInt(args[0], 10);
        if (!limit || limit < 1) {
            const current = db[groupID]?.antiMention?.limit ?? 5;
            return sock.sendMessage(groupID, {
                text: `📖 *طريقة الاستخدام:*\n.حد-المنشن [عدد]\n\nمثال: .حد-المنشن 5\n(أي رسالة أو ستيكر فيه منشن لأكتر من العدد ده هيتحذف تلقائيًا من غير الأدمن)\n\n⚙️ الحد الحالي: ${current}`
            }, { quoted: m });
        }

        db[groupID] ??= {};
        db[groupID].antiMention ??= {};
        db[groupID].antiMention.limit = limit;

        await sock.sendMessage(groupID, {
            text: `✅ تم ضبط حد المنشن الجماعي (نص وستيكرات) على ${limit} منشن كحد أقصى.`
        }, { quoted: m });
    }
};
