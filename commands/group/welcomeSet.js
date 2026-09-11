const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'عدل-ترحيب',
    aliases: ['تغيير-ترحيب', 'رسالة-ترحيب', 'تعيين-ترحيب'],
    category: 'group',
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        const newMsg = args.join(" ");
        if (!newMsg) {
            const current = db[groupID]?.welcome?.message;
            return sock.sendMessage(groupID, {
                text: `📖 *طريقة الاستخدام:*\n.عدل-ترحيب [نص الترحيب]\n\n` +
                      `*المتغيرات المتاحة:*\n- $user : منشن العضو\n- $username : رقمه\n- $name : لقبه المسجل في اللعبة (لو مسجل)\n- $group : اسم الجروب\n\n` +
                      (current ? `📝 *النص الحالي:*\n${current}` : `📝 مفيش نص متسجل حاليًا، هيتستخدم النص الافتراضي.`) +
                      `\n\n⚠️ متنساش تفعّل الترحيب بـ .تفعيل-ترحيب لو لسه مفعّلوش.`
            }, { quoted: m });
        }

        db[groupID] ??= {};
        db[groupID].welcome ??= {};
        db[groupID].welcome.message = newMsg;

        await sock.sendMessage(groupID, { text: "✅ تم تحديث رسالة الترحيب بنجاح لهذا الجروب." }, { quoted: m });
    }
};
