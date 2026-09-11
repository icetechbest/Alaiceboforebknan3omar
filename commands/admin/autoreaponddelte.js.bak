module.exports = {
    name: 'حذف_رد',
    aliases: ['مسح_رد', 'delreply'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        // 1. التأكد أن الأمر في مجموعة
        if (!id.endsWith('@g.us')) {
            return sock.sendMessage(id, { text: "❌ هذا الأمر للمجموعات فقط!" });
        }

        // 2. التحقق من الصلاحيات (مشرف أو مالك)
        const groupMetadata = await sock.groupMetadata(id);
        const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;
        if (!isOwner && !isAdmin) {
            return sock.sendMessage(id, { text: "🚫 عذراً، هذا الأمر للمشرفين أو المالك فقط." });
        }

        // 3. استخراج الكلمة المراد حذفها
        const keyword = args.join(" ").toLowerCase();
        if (!keyword) {
            return sock.sendMessage(id, { text: "⚠️ يرجى كتابة الكلمة التي تريد حذف ردها.\nمثال: *.حذف_رد سلام عليكم*" });
        }

        // 4. التحقق من وجود الكلمة في قاعدة البيانات لهذه المجموعة
        if (!db.customReplies || !db.customReplies[id] || !db.customReplies[id][keyword]) {
            return sock.sendMessage(id, { text: `❌ الكلمة [ *${keyword}* ] غير مسجلة في قائمة الردود لهذه المجموعة.` });
        }

        // 5. حذف الكلمة
        delete db.customReplies[id][keyword];

        // تنظيف الداتابيز لو المجموعة مفيش فيها ردود تانية
        if (Object.keys(db.customReplies[id]).length === 0) {
            delete db.customReplies[id];
        }

        await sock.sendMessage(id, { text: `🗑️ تم حذف الرد الخاص بكلمة [ *${keyword}* ] بنجاح.` }, { quoted: m });
    }
};
