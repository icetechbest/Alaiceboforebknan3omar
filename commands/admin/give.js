const { resolveRealJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'ترقية',
    aliases: ['رفع_ادمن', 'ترقيه'],
    category: 'admin',
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) return;

        // التحقق من صلاحية الشخص (مشرف أو مالك)
        const groupMetadata = await sock.groupMetadata(groupID);
        const participants = groupMetadata.participants;
        const participantInfo = participants.find(p => p.id === sender);
        const isAdmin = participantInfo?.admin === 'admin' || participantInfo?.admin === 'superadmin';

        if (!isAdmin && !isOwner) {
            return sock.sendMessage(groupID, { text: "🚫 هذا الأمر مخصص للمشرفين فقط!" });
        }

        // التحقق من أن البوت مشرف
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = participants.find(p => p.id === botId)?.admin !== null;
        if (!isBotAdmin) return sock.sendMessage(groupID, { text: "❌ يجب أن أكون مشرفاً لأتمكن من ترقية الأعضاء." });

        // تحديد الشخص (منشن أو رد)
        // ⚠️ contextInfo.participant ممكن يجيلنا بصيغة "@lid" بدل الرقم الحقيقي
        const giveContext = m.message.extendedTextMessage?.contextInfo;
        const giveParticipantReal = giveContext?.participant
            ? resolveRealJid(giveContext.participant, giveContext?.participantPn || giveContext?.participantAlt, groupMetadata, db.lidMap)
            : null;
        let victim = giveContext?.mentionedJid?.[0] || giveParticipantReal;

        // لو الاونر بعت .ترقيه من غير منشن/رد، بيترقي هو نفسه
        if (!victim && isOwner) victim = sender;

        if (!victim) return sock.sendMessage(groupID, { text: "⚠️ منشن الشخص أو رد على رسالته لترقيته!" });

        // تنفيذ الترقية
        await sock.groupParticipantsUpdate(groupID, [victim], "promote");

        await sock.sendMessage(groupID, { 
            text: `✨ *تمت ترقية العضو بنجاح!* ✨\n\n👤 العضو: @${victim.split('@')[0]}\n🔝 الرتبة: مشرف (Admin)\n\n> 𝐁𝐘 𝐒𝐎𝐍𝐆 𝐁𝐎𝐓`,
            mentions: [victim]
        }, { quoted: m });
    }
};
