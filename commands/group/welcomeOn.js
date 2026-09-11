const { isParticipantAdmin, DEFAULT_WELCOME_MESSAGE } = require('../../core/messageHandler.js');

// ⚠️ ملحوظة مهمة: الأمر ده متعمد إنه يكون برّه فولدر admin/owners (وموجود جوه
// commands/group/ بدل كده)، عشان BLOCKED_DIRS_FOR_SUBBOTS في core/messageHandler.js
// مبيمنعوش. المطلوب إن أدمن الجروب نفسه (مش بس أونر البوت) يقدر يتحكم في الترحيب
// حتى من بوت فرعي (تنصيب)، فبنعتمد على فحص isParticipantAdmin جوه الأمر نفسه بدل
// ما نمنعه بالكامل زي أوامر الاونرات.
module.exports = {
    name: 'تفعيل-ترحيب',
    aliases: ['تشغيل-ترحيب'],
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
        db[groupID].welcome ??= {};
        db[groupID].welcome.enabled = true;
        db[groupID].welcome.message ??= DEFAULT_WELCOME_MESSAGE;

        await sock.sendMessage(groupID, {
            text: "✅ تم تفعيل رسالة الترحيب بالأعضاء الجدد في هذا الجروب.\n" +
                  "💡 لتخصيص نص الرسالة استخدم: .عدل-ترحيب [النص]"
        }, { quoted: m });
    }
};
