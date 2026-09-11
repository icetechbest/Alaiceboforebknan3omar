const { isParticipantAdmin, DEFAULT_ACTIVITY_RANKS } = require('../../core/messageHandler.js');

module.exports = {
    name: 'اضف-رتبة-تفاعل',
    aliases: ['ضيف-رتبة-تفاعل'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        const threshold = parseInt(args[0]);
        const title = args.slice(1).join(' ').trim();

        if (!threshold || threshold <= 0 || !title) {
            return sock.sendMessage(groupID, {
                text: "📖 *طريقة الاستخدام:*\n.اضف-رتبة-تفاعل [عدد الرسائل] [اللقب]\n\nمثال: .اضف-رتبة-تفاعل 300 ⚡ نجم الجروب"
            }, { quoted: m });
        }

        db[groupID] ??= {};
        // أول مرة نضيف رتبة مخصصة، نبدأ من الرتب الافتراضية بدل ما نمسحها فجأة
        db[groupID].activityRanks ??= DEFAULT_ACTIVITY_RANKS.map(r => ({ ...r }));

        if (db[groupID].activityRanks.some(r => r.threshold === threshold)) {
            return sock.sendMessage(groupID, { text: `⚠️ في رتبة متسجلة بالفعل عند ${threshold} رسالة، شيلها الأول بـ .شيل-رتبة-تفاعل` }, { quoted: m });
        }

        db[groupID].activityRanks.push({ threshold, title });
        db[groupID].activityRanks.sort((a, b) => a.threshold - b.threshold);

        await sock.sendMessage(groupID, { text: `✅ تمت إضافة رتبة جديدة: عند ${threshold.toLocaleString()} رسالة → *${title}*` }, { quoted: m });
    }
};
