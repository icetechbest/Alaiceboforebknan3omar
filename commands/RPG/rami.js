const {
    isArcher,
    isAssassin,
    isArcherEligible,
    buildArcherRequirementsMessage,
    transformToArcher
} = require('../../data/classSystem.js');

module.exports = {
    name: 'رامي',
    aliases: ['تحول_رامي', 'قواس'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const user = db[sender];

        if (!user) {
            return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });
        }

        if (isAssassin(user)) {
            return sock.sendMessage(id, {
                text: "❌ فئتك الحالية ملهاش علاقة بمسار الرامي."
            }, { quoted: m });
        }

        if (isArcher(user)) {
            return sock.sendMessage(id, {
                text: "🏹 انت بالفعل *رامي* ماهر! مفيش داعي تكرر التحول."
            }, { quoted: m });
        }

        if (isArcherEligible(db, sender)) {
            transformToArcher(db, sender);

            // فئة الرامي علنية (مش سرية زي المغتال) فمفيش مشكلة الإعلان عنها
            await sock.sendMessage(id, {
                text: `🏹 *ولادة رامي جديد!* 🏹\n━━━━━━━━━━━━━━━━━━━━\n@${sender.split('@')[0]} أتقن فن الرماية وبقى *رامي* 🏹!\n━━━━━━━━━━━━━━━━━━━━`,
                mentions: [sender]
            }, { quoted: m });

            return sock.sendMessage(sender, {
                text: `🏹 *مبروك، أصبحت رامياً!* 🏹\n━━━━━━━━━━━━━━━━━━━━\n` +
                      `⚔️ الهجوم زاد قليلاً، والدفاع نقص قليلاً - دقتك بقت سلاحك.\n` +
                      `🎯 في المواجهات عندك فرصة "ضربة دقيقة" تزيد قوتك.\n` +
                      `👁️ عندك ميزة "عين الصقر": أي محاولة اغتيال ضدك فرصة نجاحها أقل بشكل إضافي.\n` +
                      `🗡️ عندك أمر حصري: *.رشق* (منشن الهدف) - رشقة سهام توهن قوة خصمك مؤقتاً.\n` +
                      `⚠️ لكن احترس من المحارب في المواجهة المباشرة - بيقفل عليك بسرعة!\n` +
                      `🛍️ المتجر فيه عناصر تناسب فئتك الجديدة.\n━━━━━━━━━━━━━━━━━━━━`
            });
        }

        // لسه مستوفيش الشروط - ابعتله التفاصيل في الخاص (الرامي فئة علنية، بس التفاصيل أوضح في الخاص)
        await sock.sendMessage(sender, { text: buildArcherRequirementsMessage(user) });

        await sock.sendMessage(id, {
            text: `📩 @${sender.split('@')[0]} بعتلك تفاصيل التحول للرامي في الخاص، كمّل المهام الناقصة!`,
            mentions: [sender]
        }, { quoted: m });
    }
};
