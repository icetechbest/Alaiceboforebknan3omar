module.exports = {
    name: "احذف-عصابتي",
    category: "العصابات",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;

        // 1. البحث عن العصابة اللي الشخص ده هو صاحبها
        const gangName = Object.keys(db.gangs || {}).find(name => db.gangs[name].owner === sender);

        // 2. التحقق لو مش هو المالك أو مش في عصابة أصلاً
        if (!gangName) {
            return sock.sendMessage(groupID, { 
                text: "⚠️ عذراً، هذا الأمر مخصص لمؤسسي العصابات فقط! أو أنك لست مالكاً لأي عصابة حالياً." 
            }, { quoted: m });
        }

        // 3. حذف العصابة من قاعدة البيانات
        delete db.gangs[gangName];

        // 4. (اختياري) تنظيف دعوات الانضمام المتعلقة بالعصابة دي لو حبيت
        if (db.gangInvites) {
            Object.keys(db.gangInvites).forEach(target => {
                if (db.gangInvites[target].gangName === gangName) {
                    delete db.gangInvites[target];
                }
            });
        }

        return sock.sendMessage(groupID, { 
            text: `💥 *تم حل العصابة!*\n\nتم حذف عصابة *[ ${gangName} ]* نهائياً من سجلات المملكة.` 
        }, { quoted: m });
    }
};
