// .رفض-المكالمات on/off
// بيتحكم في db.settings.rejectCalls (إعداد عام للبوت كله، مش لجروب معين، لأن
// المكالمات بتيجي لرقم البوت نفسه مش لجروب). لصاحب البوت (isOwner) بس.
//
// ⚠️ التفعيل هنا مجرد ضبط إعداد — الرفض الفعلي للمكالمة محتاج مستمع حدث 'call'
// مسجّل مرة واحدة على الـ sock نفسه وقت الاتصال، مش جوه كوماند بيتنفذ لما حد يكتب
// أمر. لازم تضيف الكود ده في core/messageHandler.js أو في index.js (وسوببوتمانجر.js
// لو عايز نفس السلوك في البوتات الفرعية) — شوف التعديل المطلوب بالظبط في index.js
// اللي اتبعته معاك في الرد، فيه شرح بالتفصيل.
module.exports = {
    name: 'رفض-المكالمات',
    aliases: ['رفض-مكالمات', 'حظر-المكالمات'],
    category: 'whatsapp-tools',
    async execute(sock, m, args, db, sender, isOwner) {
        const chatId = m.key.remoteJid;

        if (!isOwner) {
            return sock.sendMessage(chatId, { text: '❌ الأمر ده لصاحب البوت بس.' }, { quoted: m });
        }

        db.settings ??= {};

        const opt = (args[0] || '').toLowerCase();
        if (['on', 'تشغيل', 'تفعيل', 'فعل'].includes(opt)) {
            db.settings.rejectCalls = true;
            return sock.sendMessage(chatId, { text: '📵 تم تفعيل الرفض التلقائي لأي مكالمة صوت/فيديو تيجي للبوت.' }, { quoted: m });
        }
        if (['off', 'ايقاف', 'إيقاف', 'الغاء', 'إلغاء'].includes(opt)) {
            db.settings.rejectCalls = false;
            return sock.sendMessage(chatId, { text: '📞 تم إيقاف الرفض التلقائي للمكالمات.' }, { quoted: m });
        }

        const state = db.settings.rejectCalls ? 'مفعّل ✅' : 'متوقف ⛔';
        return sock.sendMessage(chatId, {
            text: `📖 الحالة الحالية: ${state}\n\nطريقة الاستخدام:\n.رفض-المكالمات on\n.رفض-المكالمات off`
        }, { quoted: m });
    }
};
