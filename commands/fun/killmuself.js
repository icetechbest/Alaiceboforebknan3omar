module.exports = {
    name: 'انتحار',
    aliases: ['وداعا', 'انفجار'],
    category: 'fun',
    async execute(sock, m, args, db, sender) {
        const groupID = m.key.remoteJid;
        const isGroup = groupID.endsWith('@g.us');
        if (!isGroup) return;

        // التحقق من صلاحيات البوت
        const groupMetadata = await sock.groupMetadata(groupID);
        const participants = groupMetadata.participants;
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = participants.find(p => p.id === botId)?.admin;

        if (!isBotAdmin) {
            return sock.sendMessage(groupID, { text: "❌ لازم أكون أدمن عشان أنفذ حكم الإعدام! 💀" }, { quoted: m });
        }

        const userTag = `@${sender.split('@')[0]}`;
        
        // رسالة البداية المثيرة
        await sock.sendMessage(groupID, { 
            text: `🚨 *تـنـبـيـه: بـروتوكول التدمير الذاتي نَشِط!* 🚨\n\nالمحارب ${userTag} قرر الانتحار.. جاري بدء العد التنازلي للنفي!`,
            mentions: [sender]
        });

        // مصفوفة العد التنازلي مع تأثيرات
        const countdown = [
            "🔟 - جاري تحضير المقصلة...",
            "9️⃣ - هل أنت متأكد؟ لا تراجع الآن!",
            "8️⃣ - جاري مسح هويتك من السجلات...",
            "7️⃣ - الأعضاء يودعونك في صمت...",
            "6️⃣ - نبضات القلب تتسارع...",
            "5️⃣ - بدأت المرحلة النهائية!",
            "4️⃣ - استعد للرحيل الأبدي...",
            "3️⃣ - وداعاً يا بطل...",
            "2️⃣ - اضغط على الزر الأحمر...",
            "1️⃣ - بـووووووووووووووم! 💥"
        ];

        // تنفيذ العد التنازلي بفاصل ثانية بين كل رسالة
        let i = 0;
        const interval = setInterval(async () => {
            if (i < countdown.length) {
                await sock.sendMessage(groupID, { text: `⚠️ *${countdown[i]}*` });
                i++;
            } else {
                clearInterval(interval);
                try {
                    // الطرد النهائي
                    await sock.groupParticipantsUpdate(groupID, [sender], "remove");
                    await sock.sendMessage(groupID, { text: `💀 *تَمَّتِ العَمَلِيَّةُ بِنَجَاح..* \n\nلقد غادر ${userTag} عالمنا الآن. الفاتحة على روحه الرقمية!`, mentions: [sender] });
                } catch (e) {
                    await sock.sendMessage(groupID, { text: "❌ حدث خطأ في النظام.. يبدو أن القدر أنقذك هذه المرة!" });
                }
            }
        }, 1000); // 1.2 ثانية بين كل رقم لزيادة التوتر
    }
};
