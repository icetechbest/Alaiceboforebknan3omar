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

            // فئة الرامي علنية (مش سرية زي المغتال) فمفيش مشكلة الإعلان عنها بالتفصيل في الجروب
            await sock.sendMessage(id, {
                text: `🏹 *ولادة رامي جديد!* 🏹\n━━━━━━━━━━━━━━━━━━━━\n@${sender.split('@')[0]} أتقن فن الرماية وبقى *رامي* 🏹!\n` +
                      `⚔️ الهجوم زاد قليلاً، والدفاع نقص قليلاً - دقتك بقت سلاحك.\n` +
                      `🎯 في المواجهات عندك فرصة "ضربة دقيقة" تزيد قوتك.\n` +
                      `👁️ عندك ميزة "عين الصقر": أي محاولة اغتيال ضدك فرصة نجاحها أقل بشكل إضافي.\n` +
                      `🗡️ عندك أمر حصري: *.رشق* (منشن الهدف) - رشقة سهام توهن قوة خصمك مؤقتاً.\n` +
                      `⚠️ لكن احترس من المحارب في المواجهة المباشرة - بيقفل عليك بسرعة!\n━━━━━━━━━━━━━━━━━━━━`,
                mentions: [sender]
            }, { quoted: m });
            return;
        }

        // لسه مستوفيش الشروط - التفاصيل بتتبعت في نفس الجروب مع منشن للاعب
        await sock.sendMessage(id, {
            text: `📋 @${sender.split('@')[0]} ${buildArcherRequirementsMessage(user)}`,
            mentions: [sender]
        }, { quoted: m });
    }
};
