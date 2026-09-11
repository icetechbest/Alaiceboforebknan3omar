const { resolveRealJid } = require('../../core/messageHandler.js');

module.exports = {
    name: "دعوة",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;
        // الحصول على الشخص المستهدف (منشن أو ريبلاي)
        // ⚠️ contextInfo.participant ممكن يجيلنا بصيغة "@lid" بدل الرقم الحقيقي، وBaileys
        // غالبًا مش بيوفر participantPn/participantAlt لرسالة اتعمل عليها ريبلاي، فبنجيب
        // groupMetadata كخطة بديلة (فيها phoneNumber الحقيقي لكل عضو).
        const inviteGroupMetadata = groupID.endsWith('@g.us') ? await sock.groupMetadata(groupID).catch(() => null) : null;
        const inviteContext = m.message.extendedTextMessage?.contextInfo;
        const inviteParticipantReal = inviteContext?.participant
            ? resolveRealJid(inviteContext.participant, inviteContext?.participantPn || inviteContext?.participantAlt, inviteGroupMetadata, db.lidMap)
            : null;
        const target = inviteContext?.mentionedJid?.[0] || inviteParticipantReal;
        
        if (!target) return sock.sendMessage(groupID, { text: "⚠️ منشن الشخص أو رد على رسالته عشان تدعيه!" });
        if (target === sender) return sock.sendMessage(groupID, { text: "⚠️ مش ينفع تدعي نفسك يا بطل!" });

        // التأكد إن اللي بيبعت الدعوة عضو في عصابة
        const myGang = Object.values(db.gangs || {}).find(g => g.members.includes(sender));
        if (!myGang) return sock.sendMessage(groupID, { text: "⚠️ لازم تكون في عصابة عشان تبعت دعوة!" });

        // تسجيل الدعوة
        db.gangInvites ??= {};
        db.gangInvites[target] = { 
            gangName: myGang.name, 
            from: sender,
            time: Date.now() 
        };

        return sock.sendMessage(groupID, { 
            text: `📩 @${sender.split('@')[0]} بعتلك دعوة للانضمام لعصابة *[ ${myGang.name} ]*\n\nاكتب *.انضمام ${myGang.name}* عشان تقبل الدعوة!`, 
            mentions: [sender, target] 
        });
    }
};
