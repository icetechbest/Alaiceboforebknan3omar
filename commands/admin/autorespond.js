module.exports = {
    name: 'رد',
    aliases: ['اضف_رد'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        // 1. التأكد أن الأمر في مجموعة
        if (!id.endsWith('@g.us')) return sock.sendMessage(id, { text: "❌ هذا الأمر للمجموعات فقط!" });

        // 2. التحقق من الصلاحيات (مشرف أو مالك)
        const groupMetadata = await sock.groupMetadata(id);
        const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;
        if (!isOwner && !isAdmin) return sock.sendMessage(id, { text: "🚫 للمشرفين فقط." });

        // 3. طريقة الاستخدام: .رد [الكلمة] | [الرد]
        const input = args.join(" ");
        if (!input || !input.includes("|")) {
            return sock.sendMessage(id, { text: "⚠️ الاستخدام الصحيح:\n*.رد الكلمة | الرد*\n\nمثال: .رد سلام عليكم | وعليكم السلام يا غالي" }, { quoted: m });
        }

        const [keyword, reply] = input.split("|").map(t => t.trim());

        // 4. تخزين الرد في الداتابيز تحت معرف المجموعة
        if (!db.customReplies) db.customReplies = {};
        if (!db.customReplies[id]) db.customReplies[id] = {};

        db.customReplies[id][keyword.toLowerCase()] = reply;

        await sock.sendMessage(id, { text: `✅ تم حفظ الرد بنجاح!\n\nكلمة السر: *${keyword}*\nالرد: *${reply}*` }, { quoted: m });
    }
};
