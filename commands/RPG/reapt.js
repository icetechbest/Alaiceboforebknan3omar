module.exports = {
    name: 'كرر',
    aliases: ['repeat', 'سبام'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        // 1. التحقق من الصلاحيات (المالك أو مشرفي الجروب)
        let isAdmin = isOwner;
        if (id.endsWith('@g.us') && !isOwner) {
            const groupMetadata = await sock.groupMetadata(id);
            const participants = groupMetadata.participants;
            const admins = participants.filter(v => v.admin !== null).map(v => v.id);
            isAdmin = admins.includes(sender);
        }

        if (!isAdmin) {
            return sock.sendMessage(id, { text: "🚫 هذا الأمر للمشرفين أو المالك فقط!" }, { quoted: m });
        }

        // 2. فحص المدخلات (.كرر الرسالة | العدد)
        // التحليل: نأخذ آخر عنصر كعدد، والباقي هو الرسالة
        if (args.length < 2) {
            return sock.sendMessage(id, { text: "⚠️ الاستخدام الصحيح:\n*.كرر* (الرسالة) (العدد)\n\nمثال: `.كرر السلام عليكم 5`" }, { quoted: m });
        }

        const count = parseInt(args[args.length - 1]); // آخر كلمة هي العدد
        const textToRepeat = args.slice(0, -1).join(" "); // كل الكلمات ما عدا الأخيرة هي الرسالة

        // 3. التحقق من منطقية العدد
        if (isNaN(count) || count <= 0) {
            return sock.sendMessage(id, { text: "⚠️ يرجى تحديد عدد صحيح (مثال: 5)." }, { quoted: m });
        }

        if (count > 20 && !isOwner) {
            return sock.sendMessage(id, { text: "⚠️ الحد الأقصى للمشرفين هو 20 رسالة لتجنب الحظر." }, { quoted: m });
        }
        
        if (count > 50 && isOwner) {
            return sock.sendMessage(id, { text: "⚠️ يا مطوري، الحد الأقصى 50 رسالة عشان الواتساب ميحظرش البوت." }, { quoted: m });
        }

        // 4. تنفيذ التكرار
        for (let i = 0; i < count; i++) {
            await sock.sendMessage(id, { text: textToRepeat });
            // تأخير بسيط جداً (0.5 ثانية) لحماية البوت من الحظر السريع
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
};
