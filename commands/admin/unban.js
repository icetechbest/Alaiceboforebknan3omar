const { resolveRealJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'فك_الحظر',
    aliases: ['unban'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        // 1. التحقق من المالك
        if (!isOwner) {
            return sock.sendMessage(id, { text: "🚫 هذه الصلاحية للمطورين فقط." }, { quoted: m });
        }

        // 2. تحديد الشخص (من المنشن، الرد، أو كتابة الرقم)
        // ⚠️ contextInfo.participant ممكن يجيلنا بصيغة "@lid" بدل الرقم الحقيقي، وBaileys
        // غالبًا مش بيوفر participantPn/participantAlt لرسالة اتعمل عليها ريبلاي، فبنجيب
        // groupMetadata كخطة بديلة (فيها phoneNumber الحقيقي لكل عضو).
        const unbanGroupMetadata = id.endsWith('@g.us') ? await sock.groupMetadata(id).catch(() => null) : null;
        const unbanContext = m.message.extendedTextMessage?.contextInfo;
        const unbanParticipantReal = unbanContext?.participant
            ? resolveRealJid(unbanContext.participant, unbanContext?.participantPn || unbanContext?.participantAlt, unbanGroupMetadata, db.lidMap)
            : null;
        let target = unbanContext?.mentionedJid?.[0] || unbanParticipantReal;

        // إذا لم يكن منشن أو رد، نحاول قراءة الرقم من args
        if (!target && args[0]) {
            target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        }

        if (!target) {
            return sock.sendMessage(id, { text: "⚠️ منشن الشخص أو رد على رسالته لفك حظره." }, { quoted: m });
        }

        // 3. التحقق من وجود قائمة المحظورين
        if (!db.banned || !db.banned.includes(target)) {
            // فحص إضافي في حالة كان الشخص محظوراً بالـ LID
            const lidIndex = db.banned ? db.banned.indexOf(target) : -1;
            if (lidIndex === -1) {
                return sock.sendMessage(id, { text: "❌ هذا المستخدم ليس محظوراً بالفعل." }, { quoted: m });
            }
        }

        // 4. إزالة الحظر
        db.banned = db.banned.filter(user => user !== target);
        
        // 5. رسالة التأكيد
        await sock.sendMessage(id, { 
            text: `✅ تم فك الحظر عن @${target.split('@')[0]} بنجاح ويمكنه الآن استخدام البوت.`,
            mentions: [target]
        }, { quoted: m });
    }
};
;

