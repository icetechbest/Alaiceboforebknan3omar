const { resolveRealJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'شيل',
    aliases: ['مسح_البيض', 'حذف_البيض'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        // تحديد المستهدف (رد على رسالة أو منشن)
        // ⚠️ contextInfo.participant ممكن يجيلنا بصيغة "@lid" بدل الرقم الحقيقي، وBaileys
        // غالبًا مش بيوفر participantPn/participantAlt لرسالة اتعمل عليها ريبلاي، فبنجيب
        // groupMetadata كخطة بديلة (فيها phoneNumber الحقيقي لكل عضو).
        const eggpromGroupMetadata = id.endsWith('@g.us') ? await sock.groupMetadata(id).catch(() => null) : null;
        const eggpromContext = m.message?.extendedTextMessage?.contextInfo;
        const eggpromParticipantRaw = eggpromContext?.participant;
        const eggpromParticipantReal = eggpromParticipantRaw
            ? resolveRealJid(eggpromParticipantRaw, eggpromContext?.participantPn || eggpromContext?.participantAlt, eggpromGroupMetadata, db.lidMap)
            : null;
        let target = eggpromParticipantReal || eggpromContext?.mentionedJid?.[0];

        if (!target) {
            return sock.sendMessage(id, { text: "⚠️ الاستخدام: قم بالرد على رسالة اللاعب أو منشن له مع أمر .شيل" }, { quoted: m });
        }

        // 🔄 لو اللاعب مسجل لسه تحت الـ lid القديم بتاعه، نستخدم الـ lid الخام كخطة بديلة
        // بدل ما نطلع "غير مسجل" على شخص عنده فعلاً بيانات محفوظة.
        if (!db[target] && eggpromParticipantRaw && db[eggpromParticipantRaw]) {
            target = eggpromParticipantRaw;
        }

        const user = db[target];
        if (!user) return sock.sendMessage(id, { text: "❌ هذا اللاعب غير مسجل." }, { quoted: m });

        // العملية الأساسية: تصغير مصفوفة البيض لتصبح فارغة
        if (user.pets) {
            user.pets = []; // مسح كل البيض المخزن
        } else {
            return sock.sendMessage(id, { text: "ℹ️ حقيبة هذا اللاعب خالية من البيض بالفعل." }, { quoted: m });
        }

        // اختياري: إذا أردت أيضاً تصفير الرفيق الحالي
        // user.currentPet = null; 

        let successMsg = `🧹 *تَمَّ تَنْظِيفُ الْمَخْزَنِ!*\n`;
        successMsg += `━━━━━━━━━━━━━━\n`;
        successMsg += `👤 اللاعب: @${target.split('@')[0]}\n`;
        successMsg += `🥚 الحالة: تم حذف جميع البيوض من الحقيبة بنجاح.`;

        await sock.sendMessage(id, { 
            text: successMsg, 
            mentions: [target] 
        }, { quoted: m });
    }
};
