module.exports = {
    name: 'تصفير-كل',
    aliases: ['تصفير-الكل', 'reset-all'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        // التحقق من أن المستخدم هو المطور (أيس أو المطورين المسجلين)
        const ownerLid = "232620008976456@lid"; // حسابك كأونر أساسي
        const isAuthorized = m.key.fromMe || sender === ownerLid || (db.owners && db.owners.includes(sender));

        if (!isAuthorized) {
            return sock.sendMessage(id, { text: "❌ هذا الأمر مخصص للإمبراطور *أيس* فقط! 👑" }, { quoted: m });
        }

        // طلب التأكيد لمنع الخطأ
        if (args[0] !== "تأكيد") {
            return sock.sendMessage(id, { 
                text: "⚠️ *تحذير إداري*\n\nسيتم مسح ثروات ومستويات الجميع وإعادتهم للبداية.\nللتنفيذ اكتب: *.تصفير-كل تأكيد*" 
            }, { quoted: m });
        }

        // قائمة المفاتيح التي لا نريد تصفيرها (النظام والمطورين)
        const systemKeys = ['owners', 'settings', 'customReplies', 'banned', 'bannedGroups', 'puzzles', 'marryRequests', 'pvpRequests', 'muted', 'welcome'];

        let count = 0;
        for (let key in db) {
            // نتحقق أن المفتاح ليس من مفاتيح النظام وليس مصفوفة أو كائن إعدادات
            if (!systemKeys.includes(key) && (key.endsWith('@lid') || key.endsWith('@s.whatsapp.net'))) {
                
                // إعادة ضبط بيانات اللاعب لنقطة الصفر
                db[key] = {
                    name: db[key].name || "لاعب",
                    level: 1,
                    gold: 0,
                    xp: 0,
                    hp: 100,
                    maxHp: 100,
                    atk: 10,        // كافية لوحش لفل 1
                    def: 5,         // دفاع أساسي
                    defense: 5,     // لضمان التوافق مع نظامك
                    inventory: [],
                    pets: [],
                    currentPet: "لا يوجد"
                };
                count++;
            }
        }

        let successMsg = `⚠️ *تَمَّتْ تصفية الممالك!* ⚠️\n\n`;
        successMsg += `🔄 تَمَّتْ إعَادَةُ ضَبْطِ *${count}* حِسَابًا.\n`;
        successMsg += `⚔️ القوة الأساسية الآن: [10] (مناسبة لوحش لفل 1).\n`;
        successMsg += `💰 الذهب: [0].\n\n`;
        successMsg += `👑 *بأمر من القائد أيس*`;

        await sock.sendMessage(id, { text: successMsg }, { quoted: m });
    }
};
