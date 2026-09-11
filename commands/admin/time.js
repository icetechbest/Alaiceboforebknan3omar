module.exports = {
    name: 'وقت',
    async execute(sock, m, args, db) {
        const id = m.key.remoteJid;
        const sender = m.key.participant || m.key.remoteJid;

        // أرقام/معرّفات المطورين المصرح لهم بهذا الأمر
        const developerIds = ["201220800288", "232620008976456"];

        // التحقق من أن المرسل هو أحد المطورين أو أن الرسالة صادرة من البوت نفسه
        if (!developerIds.some(devId => sender.includes(devId)) && !m.key.fromMe) {
            return sock.sendMessage(id, { text: "⚠️ عذراً، هذا الأمر مخصص للمطورين فقط." }, { quoted: m });
        }

        const commandName = args[0]; // اسم الأمر
        const newTime = parseInt(args[1]); // الوقت بالثواني

        if (!commandName || isNaN(newTime)) {
            return sock.sendMessage(id, { 
                text: "❌ الطريقة الصحيحة:\n*.وقت [اسم الأمر] [الثواني]*\nمثال: *.وقت وحش 60*" 
            }, { quoted: m });
        }

        // إنشاء قسم الإعدادات في قاعدة البيانات إذا لم يكن موجوداً
        if (!db.settings) db.settings = {};
        if (!db.settings.cooldowns) db.settings.cooldowns = {};

        // تحويل الثواني إلى ميلي ثانية وتخزينها
        db.settings.cooldowns[commandName] = newTime * 1000;

        await sock.sendMessage(id, { 
            text: `✅ تم تحديث وقت الانتظار لأمر *${commandName}* ليصبح *${newTime}* ثانية.` 
        }, { quoted: m });
    }
};
