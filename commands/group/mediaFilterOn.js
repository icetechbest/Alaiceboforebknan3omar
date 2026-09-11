const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'تفعيل-فلتر-الميديا',
    aliases: ['تشغيل-فلتر-الميديا'],
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

        db[groupID] ??= {};
        db[groupID].mediaFilter ??= {};
        db[groupID].mediaFilter.enabled = true;
        db[groupID].mediaFilter.types ??= [];

        const count = db[groupID].mediaFilter.types.length;
        await sock.sendMessage(groupID, {
            text: `✅ تم تفعيل فلتر الميديا في هذا الجروب.\n` +
                  (count > 0
                      ? `📋 الأنواع الممنوعة حاليًا: ${db[groupID].mediaFilter.types.join('، ')}`
                      : `⚠️ لسه مفيش أنواع ميديا ممنوعة، ضيف نوع بـ .اضف-فلتر-ميديا [النوع]\nالأنواع المتاحة: صور، فيديو، ستيكرات، مستندات، صوت`)
        }, { quoted: m });
    }
};
