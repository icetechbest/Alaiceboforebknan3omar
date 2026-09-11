const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'تفعيل-فلتر',
    aliases: ['تشغيل-فلتر'],
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
        db[groupID].filter ??= {};
        db[groupID].filter.enabled = true;
        db[groupID].filter.words ??= [];

        const count = db[groupID].filter.words.length;
        await sock.sendMessage(groupID, {
            text: `✅ تم تفعيل فلتر الكلام الممنوع في هذا الجروب.\n` +
                  (count > 0
                      ? `📋 عدد الكلمات المسجلة حاليًا: ${count}`
                      : `⚠️ قائمة الكلمات فاضية دلوقتي، ضيف كلمات بـ .اضف-كلمة [الكلمة]`)
        }, { quoted: m });
    }
};
