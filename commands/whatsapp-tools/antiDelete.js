// .كاشف-المحذوف [تشغيل|ايقاف]
// بدون args: بيوري الحالة الحالية. بـ"تشغيل"/"on": يفعّل. بـ"ايقاف"/"off": يعطّل.
// الأدمن بس هو اللي يقدر يتحكم فيه، لأنه إعداد بيأثر على كل أعضاء الجروب.
//
// ⚠️ الكشف الفعلي للرسائل المحذوفة (تخزينها مؤقتًا + إعادة إرسالها لما تتمسح) منفّذ
// جوه core/messageHandler.js نفسه، مش هنا — لأن ده لازم يشتغل تلقائيًا على *كل*
// رسالة جاية، مش بس وقت ما حد يكتب أمر. الأمر ده مجرد "مفتاح تشغيل/إيقاف" بيضبط
// db[groupID].antiDelete.enabled، والمنطق اللي بيقرأ الإعداد ده وبيعيد إرسال الرسايل
// المحذوفة موجود في core/messageHandler.js (شوف تعليق "🗑️ [ كشف الرسائل المحذوفة ]").
const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'كاشف-المحذوف',
    aliases: ['مكافح-الحذف', 'ضد-الحذف'],
    category: 'whatsapp-tools',
    async execute(sock, m, args, db, sender, isOwner) {
        const chatId = m.key.remoteJid;
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { text: '⚠️ الأمر ده يشتغل في الجروبات بس.' }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(chatId).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(chatId, { text: '❌ الأمر ده لأدمن الجروب فقط.' }, { quoted: m });
        }

        db[chatId] ??= {};
        db[chatId].antiDelete ??= {};

        const opt = (args[0] || '').toLowerCase();
        if (['on', 'تشغيل', 'تفعيل', 'فعل'].includes(opt)) {
            db[chatId].antiDelete.enabled = true;
            return sock.sendMessage(chatId, { text: '✅ تم تفعيل كاشف الرسائل المحذوفة في هذا الجروب.' }, { quoted: m });
        }
        if (['off', 'ايقاف', 'إيقاف', 'الغاء', 'إلغاء'].includes(opt)) {
            db[chatId].antiDelete.enabled = false;
            return sock.sendMessage(chatId, { text: '🔕 تم إيقاف كاشف الرسائل المحذوفة في هذا الجروب.' }, { quoted: m });
        }

        const state = db[chatId].antiDelete.enabled ? 'مفعّل ✅' : 'متوقف ⛔';
        return sock.sendMessage(chatId, {
            text: `📖 الحالة الحالية: ${state}\n\nطريقة الاستخدام:\n.كاشف-المحذوف تشغيل\n.كاشف-المحذوف ايقاف`
        }, { quoted: m });
    }
};
