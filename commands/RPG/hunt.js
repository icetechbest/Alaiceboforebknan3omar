module.exports = {
    name: 'صيد',
    aliases: ['اصطاد'],
    async execute(sock, m, args, db, sender) {
        const { ensurePlayerDefaults } = require('../../data/classSystem.js');
        const id = m.key.remoteJid;
        
        if (!db[sender]) db[sender] = { gold: 0, level: 1, xp: 0, name: m.pushName || "ملك مجهول" };
        ensurePlayerDefaults(db[sender]);
        const user = db[sender];

        const now = Date.now();
        // قراءة الوقت من الإعدادات أو افتراضي ساعة
        const cooldown = db.settings?.cooldowns?.['صيد'] || 3600000;

        if (user.lastHunt && now - user.lastHunt < cooldown) {
            const remaining = cooldown - (now - user.lastHunt);
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            
            let timeMsg = `⌛ *الغابة بحاجة للراحة!* الحيوانات مختبئة الآن.\nعُد بعد: [ `;
            if (hours > 0) timeMsg += `${hours}س و `;
            timeMsg += `${minutes}د و ${seconds}ث ] 🌿`;
            
            return sock.sendMessage(id, { text: timeMsg }, { quoted: m });
        }

        // --- قائمة الحيوانات الموسعة بنسب صعبة ---
        // كل الفرص اتخفضت 10% عن الأصل (كان مجموعها 100% بالظبط، يعني محدش
        // كان بيرجع بإيد فاضية فعلياً). دلوقتي فيه فرصة حقيقية 10% إنك ترجع
        // من غير صيد، وده اللي بيخلي الصيد أصعب فعلاً.
        const animals = [
            // حيوانات شائعة (سهلة)
            { name: "فأر حقول 🐭", price: 50, chance: 0.225 },
            { name: "أرنب بري 🐰", price: 120, chance: 0.18 },
            { name: "بطة نهرية 🦆", price: 200, chance: 0.135 },
            
            // حيوانات متوسطة الندرة
            { name: "ديك رومي 🦃", price: 350, chance: 0.09 },
            { name: "غزال رشيق 🦌", price: 500, chance: 0.072 },
            { name: "ثعلب مكار 🦊", price: 750, chance: 0.063 },
            
            // حيوانات نادرة (صعبة)
            { name: "خنزير غابة 🐗", price: 1200, chance: 0.045 },
            { name: "ذئب جائع 🐺", price: 2000, chance: 0.036 },
            { name: "دب بني ضخم 🐻", price: 3500, chance: 0.027 },
            
            // حيوانات أسطورية (شبه مستحيلة)
            { name: "نمر سيبري 🐆", price: 7000, chance: 0.0135 },
            { name: "تنين غابة أخضر 🐉", price: 15000, chance: 0.009 },
            { name: "العنقاء الأسطورية ✨🐦‍🔥", price: 50000, chance: 0.0045 }
        ];

        let random = Math.random();
        let cumulativeChance = 0;
        let caught = null;

        for (const animal of animals) {
            cumulativeChance += animal.chance;
            if (random < cumulativeChance) {
                caught = animal;
                break;
            }
        }

        user.lastHunt = now; // تسجيل وقت الصيد

        // فرصة للفشل (إذا لم يطابق أي حيوان، رغم أن المجموع هنا 100% تقريباً)
        if (!caught) {
            return sock.sendMessage(id, { text: "🏹 بحثت في كل مكان، لكن يبدو أنك عدت بخفي حنين اليوم! 🍃" }, { quoted: m });
        }

        // إضافة الربح والخبرة
        const xpGain = Math.floor(caught.price / 15) + 5;
        user.gold = (user.gold || 0) + caught.price;
        user.xp = (user.xp || 0) + xpGain;
        user.huntCount = (user.huntCount || 0) + 1; // يُستخدم في شرط تحول الرامي

        let huntMsg = `🏹 *تَقْرِيرُ الرِّحْلَةِ الـبَرِّيَّة* 🏹\n`;
        huntMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
        huntMsg += `👤 الصياد: ${user.name || "مقاتل"}\n`;
        huntMsg += `✨ لقد عثرت على: *${caught.name}*\n`;
        huntMsg += `💰 القيمة السوقية: +${caught.price.toLocaleString()} ذهبة\n`;
        huntMsg += `✨ الخبرة المكتسبة: +${xpGain} XP\n`;
        huntMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
        huntMsg += `💰 رصيدك الآن: ${(user.gold).toLocaleString()} ذهبة`;

        await sock.sendMessage(id, { text: huntMsg }, { quoted: m });

        // إشعار خاص لو الصيد ده حقق تقدم في شروط التحول لرامي
        const { notifyArcherIfProgressed } = require('../../data/classSystem.js');
        await notifyArcherIfProgressed(sock, db, sender);
    }
};

