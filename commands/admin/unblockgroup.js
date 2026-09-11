module.exports = {
    name: 'فك_حظر_جروب',
    aliases: ['تفعيل_جروب', 'unblockgc', 'تكلم'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        // 1. التحقق من صلاحية المطور (يوري أو آيس)
        if (!isOwner) return;

        // 2. تحديد المجموعة المستهدفة (الحالية أو عن طريق ID)
        let targetGC = args[0] || id;

        // 3. التحقق من وجود قائمة المجموعات المحظورة
        if (!db.bannedGroups || !db.bannedGroups.includes(targetGC)) {
            return sock.sendMessage(id, { text: "❓ هذه المجموعة نشطة بالفعل وليست في قائمة الصمت." }, { quoted: m });
        }

        // 4. إزالة المجموعة من قائمة الحظر وتحديث البيانات
        db.bannedGroups = db.bannedGroups.filter(g => g !== targetGC);

        // 5. رسالة التأكيد الملكية بعودة الحياة
        let msg = `📢 *﹝ مَرْسُومُ فَكِّ الصَّمْت ﹞* 📢\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `✅ تم إلغاء تعطيل البوت في هذه المجموعة.\n`;
        msg += `⚡️ سيعود البوت للاستجابة لجميع الأعضاء الآن.\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `🆔 ID: ${targetGC}\n`;
        msg += `👤 بواسطة: @${sender.split('@')[0]}`;

        await sock.sendMessage(id, { 
            text: msg, 
            mentions: [sender] 
        }, { quoted: m });
    }
};
