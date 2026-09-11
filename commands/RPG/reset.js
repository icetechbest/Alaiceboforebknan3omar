const { resolveRealJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'تصفير',
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        // --- اختبار التشخيص ---
        console.log("DEBUG: تم استقبال أمر تصفير");
        console.log("DEBUG: هل أنت مالك؟", isOwner);
        console.log("DEBUG: المعرف الخاص بك:", sender);

        if (!isOwner) {
            return sock.sendMessage(id, { text: `🚫 البوت لا يراك كمالك.\nID الخاص بك: ${sender}` });
        }

        // تحديد المستهدف من المنشن أو الرد (Reply)
        // ⚠️ contextInfo.participant ممكن يجيلنا بصيغة "@lid" بدل الرقم الحقيقي، وBaileys
        // غالبًا مش بيوفر participantPn/participantAlt لرسالة اتعمل عليها ريبلاي، فبنجيب
        // groupMetadata كخطة بديلة (فيها phoneNumber الحقيقي لكل عضو).
        const resetGroupMetadata = id.endsWith('@g.us') ? await sock.groupMetadata(id).catch(() => null) : null;
        const resetContext = m.message.extendedTextMessage?.contextInfo;
        const resetParticipantRaw = resetContext?.participant;
        const resetParticipantReal = resetParticipantRaw
            ? resolveRealJid(resetParticipantRaw, resetContext?.participantPn || resetContext?.participantAlt, resetGroupMetadata, db.lidMap)
            : null;
        let target = resetContext?.mentionedJid?.[0] || resetParticipantReal;

        if (!target) {
            return sock.sendMessage(id, { text: "⚠️ لم أستطع تحديد الشخص. قم بعمل منشن له." });
        }

        // 🔄 لو اللاعب مسجل لسه تحت الـ lid القديم بتاعه، نستخدم الـ lid الخام كخطة بديلة
        // بدل ما نطلع "غير موجود" على شخص عنده فعلاً بيانات محفوظة.
        if (!db[target] && resetParticipantRaw && db[resetParticipantRaw]) {
            target = resetParticipantRaw;
        }

        if (db[target]) {
            db[target].gold = 0;
            await sock.sendMessage(id, { text: `✅ تم تصفير @${target.split('@')[0]}`, mentions: [target] });
        } else {
            await sock.sendMessage(id, { text: "❌ هذا اللاعب غير موجود في قاعدة البيانات." });
        }
    }
};
