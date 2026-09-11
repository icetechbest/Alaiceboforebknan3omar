const { ensurePlayerDefaults } = require('../../data/classSystem.js');
const { resolveRealJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'لقب',
    aliases: ['تلقيب', 'اللقب'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        // 1. التحقق من صلاحية المالك
        if (!isOwner) {
            return sock.sendMessage(id, { text: "🚫 هذا الأمر مخصص للملاك فقط لمنح الألقاب الملكية!" }, { quoted: m });
        }

        // 2. تحديد الشخص المستهدف (منشن أو رد)
        // ⚠️ contextInfo.participant ممكن يجيلنا بصيغة "@lid" بدل الرقم الحقيقي، وBaileys
        // غالبًا مش بيوفر participantPn/participantAlt لرسالة اتعمل عليها ريبلاي، فبنجيب
        // groupMetadata كخطة بديلة (فيها phoneNumber الحقيقي لكل عضو).
        const nametagGroupMetadata = id.endsWith('@g.us') ? await sock.groupMetadata(id).catch(() => null) : null;
        const nametagContext = m.message.extendedTextMessage?.contextInfo;
        const nametagParticipantRaw = nametagContext?.participant;
        const nametagParticipantReal = nametagParticipantRaw
            ? resolveRealJid(nametagParticipantRaw, nametagContext?.participantPn || nametagContext?.participantAlt, nametagGroupMetadata, db.lidMap)
            : null;
        let target = nametagContext?.mentionedJid?.[0] || nametagParticipantReal;

        if (!target) {
            return sock.sendMessage(id, { text: "⚠️ الاستخدام: .لقب @منشن [اللقب]\nمثال: .لقب @فلان السفاح" }, { quoted: m });
        }

        // 🔄 لو اللاعب مسجل لسه تحت الـ lid القديم بتاعه، نستخدم الـ lid الخام كخطة بديلة
        // بدل ما ننشئ سجل جديد فاضي على الرقم الحقيقي وهو أصلاً عنده بيانات محفوظة.
        if (!db[target] && nametagParticipantRaw && db[nametagParticipantRaw]) {
            target = nametagParticipantRaw;
        }

        // 3. استخراج اللقب من النص (حذف المنشن من الأرجيومنتس)
        const title = args.filter(arg => !arg.includes('@')).join(' ');

        if (!title) {
            return sock.sendMessage(id, { text: "⚠️ يرجى كتابة اللقب الذي تريد منحه للاعب." }, { quoted: m });
        }

        // 4. التأكد من وجود اللاعب في الداتابيز وتحديث اسمه
        if (!db[target]) {
            db[target] = {}; // إنشاء سجل لو مش موجود
        }
        ensurePlayerDefaults(db[target]);

        // تحديث خانة الاسم (name) باللقب الجديد
        db[target].name = title;

        // 5. رسالة التأكيد
        let msg = `✨ *تشريف ملكي جديد* ✨\n`;
        msg += `━━━━━━━━━━━━━━━━━━\n`;
        msg += `👤 اللاعب: @${target.split('@')[0]}\n`;
        msg += `🎖️ اللقب الجديد: *${title}*\n`;
        msg += `━━━━━━━━━━━━━━━━━━\n`;
        msg += `👑 سيظهر هذا اللقب الآن في بطاقة تعريف المحارب.`;

        await sock.sendMessage(id, { 
            text: msg, 
            mentions: [target] 
        }, { quoted: m });
    }
};
