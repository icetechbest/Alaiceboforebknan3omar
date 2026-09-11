const { resolveRealJid } = require('../../core/messageHandler.js');

module.exports = {
    name: "طرد-عصابة",
    category: "العصابات",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;

        // 1. التأكد من وجود العصابات
        if (!db.gangs) return sock.sendMessage(groupID, { text: "⚠️ لا توجد عصابات مسجلة حالياً." });

        // 2. التأكد إن اللي بيبعت الأمر هو قائد عصابة
        const gang = Object.values(db.gangs).find(g => g.owner === sender);
        if (!gang) {
            return sock.sendMessage(groupID, { text: "⚠️ هذا الأمر مخصص لقادة العصابات فقط!" });
        }

        // 3. تحديد الهدف (Target) بدقة
        // ⚠️ contextInfo.participant ممكن يجيلنا بصيغة "@lid" بدل الرقم الحقيقي، وBaileys
        // غالبًا مش بيوفر participantPn/participantAlt لرسالة اتعمل عليها ريبلاي، فبنجيب
        // groupMetadata كخطة بديلة (فيها phoneNumber الحقيقي لكل عضو).
        const kickGroupMetadata = groupID.endsWith('@g.us') ? await sock.groupMetadata(groupID).catch(() => null) : null;
        const kickContext = m.message?.extendedTextMessage?.contextInfo;
        const kickParticipantRaw = kickContext?.participant;
        const kickParticipantReal = kickParticipantRaw
            ? resolveRealJid(kickParticipantRaw, kickContext?.participantPn || kickContext?.participantAlt, kickGroupMetadata, db.lidMap)
            : null;
        let target = kickContext?.mentionedJid?.[0] || kickParticipantReal;

        if (!target && args[0]) {
            // محاولة استخراج الرقم من النص لو مفيش منشن مباشر
            target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        }

        if (!target) {
            return sock.sendMessage(groupID, { text: "⚠️ منشن الشخص أو رد على رسالته لطره!" });
        }

        // تنظيف الـ target من أي زيادات (لضمان المطابقة مع الـ ID في db)
        target = target.replace(/[^0-9@.a-zA-Z]/g, '');

        // 4. التحقق من وجود العضو في المصفوفة (استخدام findIndex أدق)
        let memberIndex = gang.members.findIndex(id => id.split('@')[0] === target.split('@')[0]);

        // 🔄 لو العضو مسجل لسه تحت الـ lid القديم بتاعه في مصفوفة العصابة، نستخدم الـ lid
        // الخام كخطة بديلة بدل ما نطلع "مش عضو" وهو فعلاً عضو مسجل بمعرفه القديم.
        if (memberIndex === -1 && kickParticipantRaw && kickParticipantRaw !== target) {
            const rawIndex = gang.members.findIndex(id => id.split('@')[0] === kickParticipantRaw.split('@')[0]);
            if (rawIndex !== -1) {
                target = kickParticipantRaw;
                memberIndex = rawIndex;
            }
        }

        if (memberIndex === -1) {
            return sock.sendMessage(groupID, { 
                text: `⚠️ هذا الشخص ليس عضواً في عصابتك!\n\nID العضو: ${target.split('@')[0]}\nقائمة أعضائك: ${gang.members.map(m => m.split('@')[0]).join(', ')}` 
            });
        }

        // 5. منع طرد القائد لنفسه
        if (target.split('@')[0] === sender.split('@')[0]) {
            return sock.sendMessage(groupID, { text: "⚠️ لا يمكنك طرد نفسك!" });
        }

        // 6. تنفيذ الطرد
        gang.members.splice(memberIndex, 1);
        
        if (gang.ranks && gang.ranks[target]) {
            delete gang.ranks[target];
        }

        return sock.sendMessage(groupID, { 
            text: `👞 تم طرد @${target.split('@')[0]} بنجاح من عصابة [ ${gang.name} ].`,
            mentions: [target]
        });
    }
};
