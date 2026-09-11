module.exports = {
    name: "خروج",
    category: "العصابات",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;

        // 1. التأكد من وجود قاعدة بيانات للعصابات
        if (!db.gangs) db.gangs = {};

        // 2. البحث عن العصابة اللي الشخص عضو فيها
        const gangName = Object.keys(db.gangs).find(name => 
            db.gangs[name].members && db.gangs[name].members.includes(sender)
        );

        if (!gangName) {
            return sock.sendMessage(groupID, { text: "⚠️ أنت لست عضواً في أي عصابة حالياً." }, { quoted: m });
        }

        const gang = db.gangs[gangName];

        // 3. منع القائد من الخروج (لازم يحذفها أو ينقل ملكيتها)
        if (gang.owner === sender) {
            return sock.sendMessage(groupID, { 
                text: `⚠️ أنت زعيم عصابة [ ${gangName} ].\nلا يمكنك الخروج منها، يمكنك استخدام أمر الحذف أو نقل الملكية.` 
            }, { quoted: m });
        }

        // 4. تنفيذ الخروج (حذف الـ ID من مصفوفة الأعضاء)
        gang.members = gang.members.filter(id => id !== sender);

        // حذف رتبته إذا كانت موجودة
        if (gang.ranks && gang.ranks[sender]) {
            delete gang.ranks[sender];
        }

        return sock.sendMessage(groupID, { 
            text: `🚪 *خروج من العصابة*\n\nلقد غادرت عصابة [ ${gangName} ] بنجاح.\nنتمنى لك رحلة سعيدة يا @${sender.split('@')[0]}!`,
            mentions: [sender]
        }, { quoted: m });
    }
};
