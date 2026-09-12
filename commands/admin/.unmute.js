const { resolveRealJid, isParticipantAdmin, logAudit } = require('../../core/messageHandler.js');

module.exports = {
    name: 'فك_كتم',
    aliases: ['unmute', 'الغاء_الكتم'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;
        if (!id.endsWith('@g.us')) return;

        // التحقق من الصلاحيات (مشرف أو مالك)
        // ⚠️ نفس ملاحظة .كتم: بنستخدم isParticipantAdmin عشان يتعامل صح مع حالة الـ @lid
        const groupMetadata = await sock.groupMetadata(id);
        const isAdmin = isParticipantAdmin(groupMetadata, sender, db);

        if (!isAdmin && !isOwner) {
            return sock.sendMessage(id, { text: "🚫 هذا الأمر للمشرفين فقط!" });
        }

        // تحديد الشخص (منشن أو رد)
        // ⚠️ contextInfo.participant ممكن يجيلنا بصيغة "@lid" (نظام إخفاء الرقم بتاع
        // واتساب) بدل الرقم الحقيقي، فبنمرره على resolveRealJid عشان تحله لو فيه بديل حقيقي.
        const unmuteContext = m.message.extendedTextMessage?.contextInfo;
        const unmuteParticipantReal = unmuteContext?.participant
            ? resolveRealJid(unmuteContext.participant, unmuteContext?.participantPn || unmuteContext?.participantAlt, groupMetadata, db.lidMap)
            : null;
        let victim = unmuteContext?.mentionedJid?.[0] || unmuteParticipantReal;

        if (!victim) return sock.sendMessage(id, { text: "⚠️ منشن الشخص الذي تريد فك الكتم عنه!" });

        if (!db.muted || !db.muted[id] || !db.muted[id].includes(victim)) {
            return sock.sendMessage(id, { text: "⚠️ هذا الشخص ليس مكتوماً أصلاً!" });
        }

        // إزالة الشخص من قائمة المكتومين
        db.muted[id] = db.muted[id].filter(user => user !== victim);
        logAudit(db, id, "فك كتم", sender, victim);

        await sock.sendMessage(id, { 
            text: `✅ تم فك الكتم عن @${victim.split('@')[0]} بنجاح. يمكنك التحدث الآن.`,
            mentions: [victim]
        });
    }
};
