const { resolveTargetJid } = require('../../core/messageHandler.js');
module.exports = {
    name: "رتبة",
    category: "العصابات",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;
        
        // 1. التأكد إن اللي بيبعت الأمر هو قائد عصابة
        const gang = Object.values(db.gangs || {}).find(g => g.owner === sender);
        if (!gang) return sock.sendMessage(groupID, { text: "⚠️ هذا الأمر لقادة العصابات فقط!" });

        // 2. الحصول على الشخص المنشن والرتبة المطلوبة
        const target = resolveTargetJid(m, db, null, {});
        const rankName = args.slice(1).join(" "); // بياخد كل الكلام اللي بعد المنشن كـ رتبة

        if (!target || !rankName) {
            return sock.sendMessage(groupID, { text: "⚠️ الطريقة الصحيحة:\n.رتبة @المنشن اسم الرتبة\n\nمثال: .رتبة @Yuri نائب الزعيم" });
        }

        // 3. التأكد إن الشخص المنشن موجود في نفس العصابة
        if (!gang.members.includes(target)) {
            return sock.sendMessage(groupID, { text: "⚠️ هذا الشخص ليس عضواً في عصابتك!" });
        }

        // 4. حفظ الرتبة في قاعدة بيانات العصابة
        gang.ranks ??= {}; // إنشاء كائن الرتب لو مش موجود
        gang.ranks[target] = rankName;

        return sock.sendMessage(groupID, { 
            text: `🎖️ تم منح @${target.split('@')[0]} رتبة: [ *${rankName}* ] في عصابة ${gang.name}`,
            mentions: [target]
        });
    }
};
