// أمر .تنصيب — بينشئ نسخة فرعية من البوت (نفس الداتا بيس بالكامل)
// لكن من غير أي مقدرة على تنفيذ أوامر اونرات (زرف، اضافة/حذف اونر، حظر، إلخ)

function getInstallSettings(db) {
    db.settings ??= {};
    if (db.settings.installEnabled === undefined) db.settings.installEnabled = false; // مقفول افتراضيًا لحد ما المالك يفتحه
    return db.settings;
}

module.exports = {
    name: 'تنصيب',
    category: 'system',
    async execute(sock, m, args, db, sender) {
        const chatId = m.key.remoteJid;
        const settings = getInstallSettings(db);

        if (!settings.installEnabled) {
            return sock.sendMessage(chatId, {
                text: '🔒 أمر التنصيب مقفول حاليًا من المطور.'
            }, { quoted: m });
        }

        // بنطلب الحاجات دي هنا (مش في أول الملف) عشان نتجنب أي مشاكل ترتيب تحميل مع index.js
        const subbotManager = require('../../subbots/subbotManager.js');
        const mainBot = require('../../index.js'); // { db, stats, commands, OWNER_IDS }

        // ⚠️ لازم رقم يتبعت مع الأمر (.تنصيب 20xxxxxxxxx) — الأمر ميشتغلش لوحده
        // على رقم الشخص اللي باعت الرسالة، عشان يفرق بين "أنا عايز أنصب بوت لرقمي"
        // و"أنصب بوت لرقم تاني" (مثلاً لصاحبه)، ومايحصلش تنصيب بالغلط بدون قصد.
        const rawNumberArg = (args[0] || '').replace(/[^0-9]/g, '');

        if (!rawNumberArg || rawNumberArg.length < 8 || rawNumberArg.length > 15) {
            return sock.sendMessage(chatId, {
                text: '⚠️ لازم تكتب الرقم بعد الأمر.\nمثال: *.تنصيب 201234567890*\n(الرقم بالكود الدولي، من غير + أو مسافات)'
            }, { quoted: m });
        }

        const requesterNumber = rawNumberArg;

        if (subbotManager.hasActive(requesterNumber)) {
            return sock.sendMessage(chatId, {
                text: '⚠️ عندك بالفعل بوت فرعي شغال. لو عايز تلغيه ابعت *.تنصيب-حذف* الأول.'
            }, { quoted: m });
        }

        if (subbotManager.countActive() >= subbotManager.MAX_SUBBOTS) {
            return sock.sendMessage(chatId, {
                text: '🚫 وصلنا للحد الأقصى من البوتات الفرعية الشغالة دلوقتي، جرّب تاني بعد شوية.'
            }, { quoted: m });
        }

        await sock.sendMessage(chatId, {
            text: '⏳ جارٍ إنشاء نسخة فرعية من البوت (نفس الداتا بيس، من غير صلاحيات اونرات)...\nكود الربط هيوصلك هنا في الجروب.'
        }, { quoted: m });

        try {
            await subbotManager.launchSubBot({
                requesterNumber,
                db: mainBot.db,
                stats: mainBot.stats,
                commands: mainBot.commands,
                ownerIds: mainBot.OWNER_IDS,
                masterOwnerId: mainBot.MASTER_OWNER_ID,
                mainBotGroups: mainBot.mainBotGroups,
                // بنبعت الكود في الجروب نفسه مش في الخاص، عشان نقلل احتمال إن واتساب
                // يعتبر رسائل الخاص المتكررة من البوت سبام ويحظره
                notify: async (text) => sock.sendMessage(chatId, { text, mentions: [sender] }, { quoted: m })
            });
        } catch (e) {
            console.error('❌ خطأ أثناء إنشاء بوت فرعي:', e);
            await sock.sendMessage(chatId, {
                text: '❌ حصل خطأ أثناء إنشاء البوت الفرعي، حاول تاني.'
            }, { quoted: m });
        }
    }
};
