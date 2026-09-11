const { resolveRealJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'غباء',
    aliases: ['غباء'],
    category: 'fun',
    async execute(sock, m, args, db, sender) {
        try {
            const groupJid = m.key.remoteJid;
            
            // تحديد الشخص المستهدف (منشن أو رد على رسالة أو الشخص نفسه)
            // ⚠️ contextInfo.participant ممكن يجيلنا بصيغة "@lid" بدل الرقم الحقيقي، وBaileys
            // غالبًا مش بيوفر participantPn/participantAlt لرسالة اتعمل عليها ريبلاي، فبنجيب
            // groupMetadata كخطة بديلة (فيها phoneNumber الحقيقي لكل عضو).
            const crazyGroupMetadata = groupJid.endsWith('@g.us') ? await sock.groupMetadata(groupJid).catch(() => null) : null;
            const crazyContext = m.message.extendedTextMessage?.contextInfo;
            const quoted = crazyContext?.participant
                ? resolveRealJid(crazyContext.participant, crazyContext?.participantPn || crazyContext?.participantAlt, crazyGroupMetadata, db.lidMap)
                : null;
            const mentioned = crazyContext?.mentionedJid?.[0];
            const target = mentioned || quoted || sender;

            const percentage = Math.floor(Math.random() * 101); // نسبة من 0 لـ 100

            // قائمة العبارات المختصرة والذكية
            const phrases = {
                0: "ذكي جدًا، عبقري العصر 🧠",
                10: "يخطئ قليلًا لكنه ذكي",
                20: "يفهم الأساسيات جيداً",
                30: "مستوى ذكاء طبيعي",
                40: "أحياناً يفصل السلك عنده",
                50: "نص نص، يحتاج تركيز",
                60: "بدأ الغباء يسيطر قليلاً",
                70: "يفكر بسرعة خاطئة دائماً",
                80: "مستوى غباء عالي ومقلق",
                90: "حالة ميؤوس منها تماماً",
                100: "غباء لا يُصدق، أسطورة في الدلاخة 🔥"
            };

            // اختيار الجملة المناسبة للنسبة
            const phraseKey = Math.floor(percentage / 10) * 10;
            const phrase = phrases[phraseKey] || "دماغ خارج الخدمة";

            const iqMessage = `╔════•『 𝐒𝐓𝐔𝐏𝐈𝐃𝐈𝐓𝐘 』•═══╗
*نسبة الغباء عند:* *@${target.split('@')[0]}*
*النسبة:* [ *${percentage}%* ]
*الحالة:* ${phrase}
╚════•『 𝐒𝐎𝐍𝐆 𝐁𝐎𝐓 』•═══╝`;

            await sock.sendMessage(groupJid, {
                text: iqMessage,
                mentions: [target]
            }, { quoted: m });

        } catch (err) {
            console.error('Error in stupidity command:', err);
        }
    }
};
