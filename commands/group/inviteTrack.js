const { resolveTargetJid } = require('../../core/messageHandler.js');

module.exports = {
    // ⚠️ ملحوظة مهمة: الاسم ده كان "دعوة" قبل كده بنفس اسم أمر دعوة العصابات
    // (commands/gang/invite.js)، والاتنين بيتسجلوا في نفس الـ Map بالاسم، فآخر
    // فولدر بيتحمّل (group بعد gang أبجديًا) كان بيكتب فوق أمر العصابات ويعطّله
    // تمامًا. عشان كده الاسم الأساسي هنا بقى "سجل-دعوة" (اسم مختلف تمامًا، مش
    // alias) عشان الأمرين يشتغلوا مع بعض من غير تعارض.
    name: 'سجل-دعوة',
    aliases: ['تسجيل-دعوة'],
    category: 'group',
    async execute(sock, m, args, db, sender) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const target = resolveTargetJid(m, db, null, {});
        if (!target) {
            return sock.sendMessage(groupID, {
                text: "📖 *طريقة الاستخدام:*\n.سجل-دعوة [منشن الشخص اللي هتدعوه]\n\nلو دخل الجروب فعلاً خلال 24 ساعة، هتاخد نقطة دعوة تلقائيًا."
            }, { quoted: m });
        }

        db.inviteIntents ??= {};
        db.inviteIntents[target] = { by: sender, at: Date.now() };

        await sock.sendMessage(groupID, {
            text: `📨 تم تسجيل نيتك بدعوة @${target.split('@')[0]}.\nلو دخل الجروب خلال 24 ساعة القادمة، هتاخد نقطة دعوة تلقائيًا. ✅`,
            mentions: [target]
        }, { quoted: m });
    }
};
