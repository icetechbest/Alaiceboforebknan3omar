const { resolveRealJid, logAudit, isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'كتم',
    aliases: ['mute'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;
        if (!id.endsWith('@g.us')) return sock.sendMessage(id, { text: "🚫 في المجموعات فقط!" });

        // جلب معلومات المشرفين
        // ⚠️ بنستخدم isParticipantAdmin بدل مقارنة p.id === sender المباشرة، لأن
        // العضو ممكن يكون مسجل في groupMetadata بصيغة @lid بينما sender وصلنا محلول
        // لرقمه الحقيقي (أو العكس)، وده كان بيخلي أدمن حقيقي ياخد رسالة "للمشرفين فقط".
        const groupMetadata = await sock.groupMetadata(id);
        const isAdmin = isParticipantAdmin(groupMetadata, sender, db);

        if (!isAdmin && !isOwner) {
            return sock.sendMessage(id, { text: "🚫 هذا الأمر للمشرفين فقط!" });
        }

        // تحديد الشخص (عن طريق المنشن أو الرد)
        // ⚠️ contextInfo.participant ممكن يجيلنا بصيغة "@lid" بدل الرقم الحقيقي
        const muteContext = m.message.extendedTextMessage?.contextInfo;
        const muteParticipantReal = muteContext?.participant
            ? resolveRealJid(muteContext.participant, muteContext?.participantPn || muteContext?.participantAlt, groupMetadata, db.lidMap)
            : null;
        let victim = muteContext?.mentionedJid?.[0] || muteParticipantReal;

        if (!victim) return sock.sendMessage(id, { text: "⚠️ منشن الشخص أو رد على رسالته لكتمه!" });

        if (!db.muted) db.muted = {};
        if (!db.muted[id]) db.muted[id] = [];

        if (db.muted[id].includes(victim)) {
            return sock.sendMessage(id, { text: "⚠️ هذا الشخص مكتوم بالفعل!" });
        }

        db.muted[id].push(victim);
        logAudit(db, id, "كتم يدوي", sender, victim);
        await sock.sendMessage(id, { 
            text: `✅ تم كتم @${victim.split('@')[0]} بنجاح. أي رسالة سيرسلها سيتم حذفها تلقائياً.`,
            mentions: [victim]
        });
    }
};
