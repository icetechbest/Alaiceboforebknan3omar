module.exports = {
    name: 'حظر_جروب',
    aliases: ['تعطيل_جروب', 'blockgc'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        // 1. التحقق من أنك المالك (صاحب الـ LID)
        if (!isOwner) {
            return sock.sendMessage(id, { text: "🚫 هذا الأمر خاص بالمطور فقط." }, { quoted: m });
        }

        // 2. تحديد الجروب (إما الجروب الحالي أو ID مرسل مع الأمر)
        let targetGC = args[0] || id;

        if (!targetGC.endsWith('@g.us')) {
            return sock.sendMessage(id, { text: "⚠️ يجب استخدام هذا الأمر داخل مجموعة أو كتابة ID مجموعة صحيح." });
        }

        // 3. إضافة المجموعة لقائمة الحظر في الداتابيز
        if (!db.bannedGroups) db.bannedGroups = [];

        if (db.bannedGroups.includes(targetGC)) {
            return sock.sendMessage(id, { text: "⚠️ هذه المجموعة محظورة (معطلة) بالفعل." });
        }

        db.bannedGroups.push(targetGC);

        // 4. رسالة تأكيد (البوت لن يغادر، سيصمت فقط)
        await sock.sendMessage(id, { 
            text: `🤐 تم تعطيل البوت في هذه المجموعة بنجاح.\n\n✅ البوت سيظل موجوداً لكنه لن يستجيب لأي شخص (باستثنائك أنت).\n\n🆔 ID: ${targetGC}` 
        }, { quoted: m });
    }
};
