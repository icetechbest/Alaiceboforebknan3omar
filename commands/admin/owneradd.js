const { resolveRealJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'اضافة-اونر',
    aliases: ['مالك', 'نخبه', 'ترقية-اونر'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        if (!isOwner) {
            return sock.sendMessage(id, { text: "🚫 هذا الأمر مخصص للملاك فقط!" }, { quoted: m });
        }

        // ⚠️ contextInfo.participant ممكن يجيلنا بصيغة "@lid" بدل الرقم الحقيقي، وBaileys
        // غالبًا مش بيوفر participantPn/participantAlt لرسالة اتعمل عليها ريبلاي، فبنجيب
        // groupMetadata كخطة بديلة (فيها phoneNumber الحقيقي لكل عضو).
        const owneraddGroupMetadata = id.endsWith('@g.us') ? await sock.groupMetadata(id).catch(() => null) : null;
        const owneraddContext = m.message.extendedTextMessage?.contextInfo;
        const owneraddParticipantReal = owneraddContext?.participant
            ? resolveRealJid(owneraddContext.participant, owneraddContext?.participantPn || owneraddContext?.participantAlt, owneraddGroupMetadata, db.lidMap)
            : null;
        const target = owneraddContext?.mentionedJid?.[0] || owneraddParticipantReal;
        if (!target) return sock.sendMessage(id, { text: "⚠️ منشن الشخص لمنحه رتبة مالك." }, { quoted: m });

        if (!db.owners) db.owners = [];

        if (!db.owners.includes(target)) {
            db.owners.push(target);
            await sock.sendMessage(id, {
                text: `👑 تم تعيين @${target.split('@')[0]} كمالك جديد للبوت.\nصلاحياته سارية فوراً في كل الأوامر.`,
                mentions: [target]
            }, { quoted: m });
        } else {
            await sock.sendMessage(id, { text: "👤 هذا الشخص يمتلك الصلاحيات بالفعل." }, { quoted: m });
        }
    }
};
