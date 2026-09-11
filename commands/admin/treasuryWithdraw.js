const { ensurePlayerDefaults } = require('../../data/classSystem.js');
const { resolveRealJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'سحب_خزينة',
    aliases: ['توزيع_خزينة', 'سحب خزينة'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        if (!isOwner) {
            return sock.sendMessage(id, { text: "🚫 هذا الأمر مخصص للملاك فقط!" }, { quoted: m });
        }

        const amount = parseInt(args[0]);
        // ⚠️ contextInfo.participant ممكن يجيلنا بصيغة "@lid" بدل الرقم الحقيقي، وBaileys
        // غالبًا مش بيوفر participantPn/participantAlt لرسالة اتعمل عليها ريبلاي، فبنجيب
        // groupMetadata كخطة بديلة (فيها phoneNumber الحقيقي لكل عضو).
        const twGroupMetadata = id.endsWith('@g.us') ? await sock.groupMetadata(id).catch(() => null) : null;
        const twContext = m.message.extendedTextMessage?.contextInfo;
        const twParticipantRaw = twContext?.participant;
        const twParticipantReal = twParticipantRaw
            ? resolveRealJid(twParticipantRaw, twContext?.participantPn || twContext?.participantAlt, twGroupMetadata, db.lidMap)
            : null;
        let target = twContext?.mentionedJid?.[0] || twParticipantReal;

        if (!amount || amount <= 0 || !target) {
            return sock.sendMessage(id, {
                text: "⚠️ الاستخدام: *.سحب_خزينة [المبلغ] @منشن*\nمثال: *.سحب_خزينة 10000 @فلان*"
            }, { quoted: m });
        }

        const treasury = db.treasury || 0;
        if (amount > treasury) {
            return sock.sendMessage(id, {
                text: `❌ الخزينة معهاش المبلغ ده. الرصيد الحالي: ${treasury.toLocaleString()} ذهب.`
            }, { quoted: m });
        }

        // 🔄 لو اللاعب مسجل لسه تحت الـ lid القديم بتاعه، نستخدم الـ lid الخام كخطة بديلة
        // بدل ما نطلع "مش مسجل" على شخص عنده فعلاً بيانات محفوظة.
        if (!db[target] && twParticipantRaw && db[twParticipantRaw]) {
            target = twParticipantRaw;
        }

        if (!db[target]) {
            return sock.sendMessage(id, { text: "❌ الشخص ده مش مسجل في المملكة." }, { quoted: m });
        }
        ensurePlayerDefaults(db[target]);

        db.treasury = treasury - amount;
        db[target].gold = (db[target].gold || 0) + amount;

        const msg = `✅ *[أمر مطور]* تم سحب من الخزينة\n━━━━━━━━━━━━━━━━━━━━\n` +
                    `👤 المستفيد: @${target.split('@')[0]}\n` +
                    `💰 المبلغ: ${amount.toLocaleString()} ذهب\n` +
                    `🏛️ الرصيد المتبقي بالخزينة: ${db.treasury.toLocaleString()}\n━━━━━━━━━━━━━━━━━━━━`;

        await sock.sendMessage(id, { text: msg, mentions: [target] }, { quoted: m });
    }
};
