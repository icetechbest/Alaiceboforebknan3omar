module.exports = {
    name: 'لاعب جديد',
    aliases: ['لاعب'],
    async execute(sock, m, args, db, sender) {
        if (db[sender]) return sock.sendMessage(m.key.remoteJid, { text: "🏰 مملكتك قائمة بالفعل!" }, { quoted: m });

        // هنا بنضيف كل البيانات اللي كانت ناقصة
        db[sender] = {
            name: m.pushName || "محارب",
            level: 1,
            gold: 500,
            hp: 100,      // الصحة
            atk: 10,      // الهجوم
            defense: 5,   // الدفاع
            xp: 0,        // الخبرة
            class: "محارب",       // الفئة: محارب أو مغتال أو رامي
            pvpWins: 0,           // عدد انتصارات المواجهة (شرط تحول المغتال)
            boughtPoisonDagger: false, // شرط تحول المغتال
            assassinReq: { wins: false, gold: false, itemId: false },
            huntCount: 0,              // عدد مرات الصيد (شرط تحول الرامي)
            boughtLongBow: false,      // شرط تحول الرامي
            archerReq: { hunts: false, gold: false, itemId: false },
            registeredAt: Date.now(), // لحماية اللاعبين الجدد من الاغتيال أول 24 ساعة
            ambushWins: 0,        // عدد الاغتيالات الناجحة (يحدد رتبة المغتال)
            revealed: false,      // هل انكشفت هويته كمغتال؟ (.كشف-مغتال)
            deflectActive: false, // حالة أمر "صد" الحصري للمحارب
            deflectExpiresAt: 0,
            lastDeflectUsed: null,
            lastRevealAttempt: null, // كولداون أمر .كشف-مغتال
            recentlyAmbushedUntil: 0, // فترة "الأثر المكشوف" بعد التعرض لكمين
            dailyAmbushLog: { date: new Date().toISOString().slice(0, 10), targets: {} },
            weeklyAmbush: { week: null, count: 0, claimed: false },
            allyJid: null,          // شريك التحالف المؤقت (مغتال فقط)
            lastAmbushTarget: null,
            weakenedUntil: 0,       // أثر "رشقة" الرامي
            lastVolley: null,
            defMilestones: {}
        };

        await sock.sendMessage(m.key.remoteJid, { text: `✅ تم إنشاء مملكتك يا ملك ${db[sender].name}! استعد للمغامرة.` }, { quoted: m });
    }
};

