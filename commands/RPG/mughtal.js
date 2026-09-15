const {
    isAssassin,
    isArcher,
    isAssassinEligible,
    buildRequirementsMessage,
    transformToAssassin
} = require('../../data/classSystem.js');

module.exports = {
    name: 'مغتال',
    aliases: ['تحول', 'تحول_مغتال'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const user = db[sender];

        if (!user) {
            return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });
        }

        if (isArcher(user)) {
            return sock.sendMessage(id, {
                text: "❌ فئتك الحالية ملهاش علاقة بمسار المغتال. لازم *.توبة* الأول لو عايز تغير مسارك."
            }, { quoted: m });
        }

        if (isAssassin(user)) {
            return sock.sendMessage(id, {
                text: `🥷 @${sender.split('@')[0]} انت بالفعل *مغتال* محترف! مفيش داعي تكرر التحول.`,
                mentions: [sender]
            }, { quoted: m });
        }

        if (isAssassinEligible(db, sender)) {
            transformToAssassin(db, sender);

            // ⚠️ الرسالة دلوقتي بتتبعت في الجروب بالتفصيل الكامل (مش خاص) - يعني فئة
            // المغتال بقت معلنة زي الرامي بالظبط، مفيش سرية بعد كده لأي عضو في الجروب.
            await sock.sendMessage(id, {
                text: `🌑 *ولادة مغتال جديد!* 🌑\n━━━━━━━━━━━━━━━━━━━━\n@${sender.split('@')[0]} اختفى للحظة في الظل وعاد *مغتالاً*! 🥷\n` +
                      `⚔️ الهجوم زاد قليلاً، والدفاع نقص قليلاً - سرعتك وفتكك بقوا سلاحك.\n` +
                      `🗡️ عندك الآن أمر حصري: *.اغتيال* (منشن الهدف) - كمين مفاجئ بدون الحاجة لموافقته.\n` +
                      `🎯 في المواجهات عندك فرصة ضربة غادرة تزيد قوتك، وكل ما زاد دفاع خصمك كل ما قلت فرصتك عليه (نظام عادل).\n` +
                      `━━━━━━━━━━━━━━━━━━━━\n🖤 تحرك في الظل بحكمة.`,
                mentions: [sender]
            }, { quoted: m });
            return;
        }

        // لسه مستوفيش الشروط - التفاصيل بتتبعت في نفس الجروب مع منشن للاعب
        await sock.sendMessage(id, {
            text: `📋 @${sender.split('@')[0]} ${buildRequirementsMessage(user)}`,
            mentions: [sender]
        }, { quoted: m });
    }
};
