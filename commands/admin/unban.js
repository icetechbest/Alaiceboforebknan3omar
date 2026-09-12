const { resolveRealJid, logAudit } = require('../../core/messageHandler.js');

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
        // ⚠️ الفحص القديم هنا كان بيعمل db.banned.indexOf(target) بعد ما includes(target)
        // رجعت false أصلاً — يعني نتيجة واحدة اتكررت من غير أي فايدة حقيقية، وأي حظر
        // اتسجل بصيغة @lid مختلفة عن target المحلول كان مستحيل يتلاقى. هنا بندور كمان
        // على أي صيغة @lid في db.lidMap بتترجم لنفس target.
        const banned = db.banned || [];
        const bannedMatch = banned.find(entry =>
            entry === target || (entry?.endsWith("@lid") && db.lidMap?.[entry] === target)
        );
        if (!bannedMatch) {
            return sock.sendMessage(id, { text: "❌ هذا المستخدم ليس محظوراً بالفعل." }, { quoted: m });
        }

        // 4. إزالة الحظر
        db.banned = banned.filter(user => user !== bannedMatch);
        logAudit(db, id.endsWith("@g.us") ? id : "عام", "فك حظر", sender, target);
        
        // 5. رسالة التأكيد
        await sock.sendMessage(id, { 
            text: `✅ تم فك الحظر عن @${target.split('@')[0]} بنجاح ويمكنه الآن استخدام البوت.`,
            mentions: [target]
        }, { quoted: m });
    }
};

