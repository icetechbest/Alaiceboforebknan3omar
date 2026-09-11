const { resolveRealJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'عصبية',
    aliases: ['عصبيه'],
    category: 'fun',
    async execute(sock, m, args, db, sender) {
        try {
            const groupJid = m.key.remoteJid;
            
            // تحديد الشخص المستهدف (منشن أو رد على رسالة أو الشخص نفسه)
            // ⚠️ contextInfo.participant ممكن يجيلنا بصيغة "@lid" بدل الرقم الحقيقي، وBaileys
            // غالبًا مش بيوفر participantPn/participantAlt لرسالة اتعمل عليها ريبلاي، فبنجيب
            // groupMetadata كخطة بديلة (فيها phoneNumber الحقيقي لكل عضو).
            const angryGroupMetadata = groupJid.endsWith('@g.us') ? await sock.groupMetadata(groupJid).catch(() => null) : null;
            const angryContext = m.message.extendedTextMessage?.contextInfo;
            const quoted = angryContext?.participant
                ? resolveRealJid(angryContext.participant, angryContext?.participantPn || angryContext?.participantAlt, angryGroupMetadata, db.lidMap)
                : null;
            const mentioned = angryContext?.mentionedJid?.[0];
            const target = mentioned || quoted || sender;

            const angerLevel = Math.floor(Math.random() * 101); // من 0 إلى 100

            // قائمة العبارات
            const phrases = {
                0: "هادئ جدًا، لا يوجد عصبية",
                10: "يحاول تجنب العصبية",
                20: "لا يغضب بسهولة",
                30: "متزن ويواجه المواقف بهدوء",
                40: "عصبيته متوسطة",
                50: "متوسط العصبية",
                60: "يحذر من استفزازه",
                70: "سريع الغضب",
                80: "عصبي للغاية",
                90: "مستوى غضب مرتفع للغاية",
                100: "يحترق غضبًا 🔥"
            };

            // اختيار أقرب جملة للنسبة
            const phraseKey = Math.floor(angerLevel / 10) * 10;
            const phrase = phrases[phraseKey] || "في حالة نفسية غير مستقرة";

            const angerMessage = `╔════•『 𝐀𝐍𝐆𝐄𝐑 』•════╗
*مستوى العصبية عند:* *@${target.split('@')[0]}*
*النسبة:* [ *${angerLevel}%* ]
*الحالة:* ${phrase}
╚════•『 𝐒𝐎𝐍𝐆 𝐁𝐎𝐓 』•═══╝`;

            await sock.sendMessage(groupJid, {
                text: angerMessage,
                mentions: [target]
            }, { quoted: m });

        } catch (err) {
            console.error('❌ Error in anger command:', err);
        }
    }
};
