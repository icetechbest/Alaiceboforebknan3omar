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
            await sock.sendMessage(id, {
                text: `📩 @${sender.split('@')[0]} بعتلك رد في الخاص.`,
                mentions: [sender]
            }, { quoted: m });
            return sock.sendMessage(sender, {
                text: "🥷 انت بالفعل *مغتال* محترف! مفيش داعي تكرر التحول."
            });
        }

        if (isAssassinEligible(db, sender)) {
            transformToAssassin(db, sender);

            // ⚠️ رسالة الجروب مقصود تكون غامضة وماتفضحش الفئة الجديدة -
            // المغتال فئة سرية، محدش المفروض يعرف غير الشخص نفسه (في الخاص).
            await sock.sendMessage(id, {
                text: `🌑 @${sender.split('@')[0]} اختفى للحظة في الظل وعاد بحسّ مختلف تماماً...`,
                mentions: [sender]
            }, { quoted: m });

            return sock.sendMessage(sender, {
                text: `🥷 *مبروك، أصبحت مغتالاً!* 🥷\n━━━━━━━━━━━━━━━━━━━━\n` +
                      `⚔️ الهجوم زاد قليلاً، والدفاع نقص قليلاً - سرعتك وفتكك بقوا سلاحك.\n` +
                      `🗡️ عندك الآن أمر حصري: *.اغتيال* (منشن الهدف) - كمين مفاجئ بدون الحاجة لموافقته.\n` +
                      `🎯 في المواجهات عندك فرصة ضربة غادرة تزيد قوتك، وكل ما زاد دفاع خصمك كل ما قلت فرصتك عليه (نظام عادل).\n` +
                      `🛍️ المتجر هيعرضلك عناصر مختلفة تناسب فئتك الجديدة.\n` +
                      `━━━━━━━━━━━━━━━━━━━━\n🖤 تحرك في الظل بحكمة.`
            });
        }

        // لسه مستوفيش الشروط - ابعتله التفاصيل في الخاص فقط
        await sock.sendMessage(sender, { text: buildRequirementsMessage(user) });

        await sock.sendMessage(id, {
            text: `📩 @${sender.split('@')[0]} بعتلك رد في الخاص.`,
            mentions: [sender]
        }, { quoted: m });
    }
};
