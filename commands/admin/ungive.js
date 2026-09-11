const { resolveRealJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'اعفاء',
    aliases: ['تنزيل_ادمن', 'إعفاء'],
    category: 'admin',
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) return;

        const groupMetadata = await sock.groupMetadata(groupID);
        const participants = groupMetadata.participants;
        const participantInfo = participants.find(p => p.id === sender);
        const isAdmin = participantInfo?.admin === 'admin' || participantInfo?.admin === 'superadmin';

        if (!isAdmin && !isOwner) {
            return sock.sendMessage(groupID, { text: "🚫 هذا الأمر مخصص للمشرفين فقط!" });
        }

        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = participants.find(p => p.id === botId)?.admin !== null;
        if (!isBotAdmin) return sock.sendMessage(groupID, { text: "❌ يجب أن أكون مشرفاً لأتمكن من إعفاء الأعضاء." });

        // ⚠️ contextInfo.participant ممكن يجيلنا بصيغة "@lid" بدل الرقم الحقيقي
        const ungiveContext = m.message.extendedTextMessage?.contextInfo;
        const ungiveParticipantReal = ungiveContext?.participant
            ? resolveRealJid(ungiveContext.participant, ungiveContext?.participantPn || ungiveContext?.participantAlt, groupMetadata, db.lidMap)
            : null;
        let victim = ungiveContext?.mentionedJid?.[0] || ungiveParticipantReal;

        if (!victim) return sock.sendMessage(groupID, { text: "⚠️ منشن الشخص أو رد على رسالته لإعفائه من الإشراف!" });

        // تنفيذ الإعفاء
        await sock.groupParticipantsUpdate(groupID, [victim], "demote");

        await sock.sendMessage(groupID, { 
            text: `📉 *تم إعفاء العضو من الإشراف!* 📉\n\n👤 العضو: @${victim.split('@')[0]}\n🔚 الرتبة: عضو عادي\n\n> 𝐁𝐘 𝐒𝐎𝐍𝐆 𝐁𝐎𝐓`,
            mentions: [victim]
        }, { quoted: m });
    }
};
