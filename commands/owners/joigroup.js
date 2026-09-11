module.exports = {
    name: 'joingroup',
    category: 'owner',
    async execute(sock, m, args, db, sender, isOwner) {
        if (!isOwner) return;

        const num = args[0];
        if (!num || !db.tempGroups || !db.tempGroups[num]) {
            return sock.sendMessage(m.key.remoteJid, { text: "❌ اكتب رقم المجموعة صح يا ماستر (مثال: .دخول 1)" });
        }

        const groupID = db.tempGroups[num];

        try {
            // تنفيذ أمر الإضافة المباشرة (Direct Add)
            // ملاحظة: لازم يكون البوت أدمن في المجموعة الهدف
            await sock.groupParticipantsUpdate(groupID, [sender], "add");

            await sock.sendMessage(m.key.remoteJid, { 
                text: `✅ *تم سحبك بنجاح!* افحص قائمة الدردشات عندك يا ماستر ايس، ستجد نفسك داخل المجموعة الآن.` 
            }, { quoted: m });

            await sock.sendMessage(m.key.remoteJid, { react: { text: "⚡", key: m.key } });

        } catch (e) {
            console.error(e);
            // لو واتساب رفض الإضافة المباشرة (بسبب إعدادات الخصوصية عندك)، هيبعت الرابط كخطة بديلة
            const code = await sock.groupInviteCode(groupID);
            await sock.sendMessage(m.key.remoteJid, { 
                text: `⚠️ *تعذر السحب التلقائي (غالباً بسبب إعدادات الخصوصية في حسابك).* \n\nتفضل رابط الدخول المباشر:\nhttps://chat.whatsapp.com/${code}` 
            }, { quoted: m });
        }
    }
};
