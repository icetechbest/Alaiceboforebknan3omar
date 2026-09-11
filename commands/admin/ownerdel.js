const { resolveRealJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'حذف-اونر',
    aliases: ['حذف_مالك', 'عزل'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;
        // أرقام/معرّفات المطورين الأساسيين - محمية دايماً ومينفعش حد يشيلها
        const BASE_OWNER_IDS = ["201220800288", "232620008976456"];

        // 1. التحقق من أن المنفذ هو المالك
        if (!isOwner) {
            return sock.sendMessage(id, { text: "🚫 هذه الصلاحية للمالك فقط." }, { quoted: m });
        }

        // 2. تحديد الشخص المراد حذفه (منشن أو رد)
        // ⚠️ contextInfo.participant ممكن يجيلنا بصيغة "@lid" بدل الرقم الحقيقي، وBaileys
        // غالبًا مش بيوفر participantPn/participantAlt لرسالة اتعمل عليها ريبلاي، فبنجيب
        // groupMetadata كخطة بديلة (فيها phoneNumber الحقيقي لكل عضو).
        const ownerdelGroupMetadata = id.endsWith('@g.us') ? await sock.groupMetadata(id).catch(() => null) : null;
        const ownerdelContext = m.message.extendedTextMessage?.contextInfo;
        const ownerdelParticipantReal = ownerdelContext?.participant
            ? resolveRealJid(ownerdelContext.participant, ownerdelContext?.participantPn || ownerdelContext?.participantAlt, ownerdelGroupMetadata, db.lidMap)
            : null;
        let target = ownerdelContext?.mentionedJid?.[0] || ownerdelParticipantReal;

        if (!target) {
            return sock.sendMessage(id, { text: "⚠️ قم بعمل منشن للمالك الذي تريد إزالته." }, { quoted: m });
        }

        // 3. منع حذف أي من المطورين الأساسيين
        if (BASE_OWNER_IDS.some(baseId => target.includes(baseId))) {
            return sock.sendMessage(id, { text: "❌ لا يمكنك حذف أحد المطورين الأساسيين للبوت!" }, { quoted: m });
        }

        // 4. التأكد من وجود قائمة ملاك في قاعدة البيانات
        if (!db.owners || !db.owners.includes(target)) {
            return sock.sendMessage(id, { text: "❌ هذا الشخص ليس مسجلاً كمالك إضافي." }, { quoted: m });
        }

        // 5. حذف المالك وحفظ البيانات
        db.owners = db.owners.filter(owner => owner !== target);

        await sock.sendMessage(id, { 
            text: `✅ تم سحب صلاحيات المالك من: @${target.split('@')[0]}\nتم إنزال رتبته إلى مستخدم عادي.`,
            mentions: [target]
        }, { quoted: m });
    }
};
