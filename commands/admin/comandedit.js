module.exports = {
    name: 'عدل-الاوامر',
    aliases: ['تغيير-الاوامر'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        // التحقق من الأونر
        if (!isOwner) return sock.sendMessage(id, { text: "⚠️ هذا الأمر مخصص للمطور فقط!" }, { quoted: m });

        const newMessage = args.join(' ');

        // .عدل-الاوامر مسح  →  إلغاء النص المخصص المحفوظ والرجوع لقائمة الأقسام
        // الافتراضية (المبنية تلقائيًا من كل أوامر البوت الحالية في data/menuSections.js).
        if (!newMessage || ['مسح', 'حذف', 'افتراضي', 'reset', 'default'].includes(newMessage.trim())) {
            if (!newMessage) {
                return sock.sendMessage(id, {
                    text: "❌ يرجى كتابة النص الجديد بعد الأمر.\nمثال:\n*.عدل-الاوامر* النص الجديد هنا...\n\nأو اكتب *.عدل-الاوامر مسح* عشان ترجع لقائمة الأقسام الافتراضية."
                }, { quoted: m });
            }
            if (db.settings) delete db.settings.commandsMessage;
            return sock.sendMessage(id, {
                text: "✅ تم مسح النص المخصص. دلوقتي *.اوامر* هيرجع يبعت قائمة الأقسام الافتراضية تلقائيًا."
            }, { quoted: m });
        }

        // حفظ النص في قاعدة البيانات
        if (!db.settings) db.settings = {};
        db.settings.commandsMessage = newMessage;

        // ملاحظة: الـ index.js الخاص بك يقوم بحفظ الـ db تلقائياً بعد تنفيذ الأمر
        await sock.sendMessage(id, {
            text: "✅ تم تحديث رسالة الأوامر بنجاح!\n⚠️ ملحوظة: النص ده هيبقى بديل كامل لقائمة الأقسام الافتراضية، يعني *.اوامر* هيبعته زي ما هو من غير تقسيم، وأي أوامر جديدة تتضاف للبوت بعد كده مش هتظهر هنا تلقائيًا. لو عايز ترجع للنظام التلقائي، اكتب *.عدل-الاوامر مسح*."
        }, { quoted: m });
    }
};
