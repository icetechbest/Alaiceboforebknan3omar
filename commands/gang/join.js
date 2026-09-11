module.exports = {
    name: "انضمام",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;
        const gangName = args.join(" ");

        if (!gangName) return sock.sendMessage(groupID, { text: "⚠️ اكتب اسم العصابة! مثال: .انضمام التنانين" });

        // فحص الدعوة
        const invite = db.gangInvites?.[sender];
        if (!invite || invite.gangName !== gangName) {
            return sock.sendMessage(groupID, { text: `⚠️ مفيش دعوة موجهة ليك من عصابة *${gangName}* حالياً.` });
        }

        // فحص وجود العصابة
        if (!db.gangs[gangName]) return sock.sendMessage(groupID, { text: "⚠️ العصابة دي مقتش موجودة!" });

        // إضافة العضو
        db.gangs[gangName].members.push(sender);
        delete db.gangInvites[sender]; // مسح الدعوة بعد الاستخدام

        return sock.sendMessage(groupID, { 
            text: `🎉 مبروك! انضميت رسمياً لعصابة *[ ${gangName} ]*.\nاستخدم أمر *.عصابتي* لرؤية التفاصيل.` 
        });
    }
};
