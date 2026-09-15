// .تحميل-حاله
// بينزل آخر حالة (status/story) محفوظة لجهة اتصال معينة، سواء بالرد (reply) على
// أي رسالة منها، أو بكتابة رقمها بعد الأمر.
//
// ⚠️ ملاحظة مهمة: البوت مش بيقدر "يجيب" حالة أي حد في أي وقت — واتساب مبيوفرش API
// زي كده. اللي بيحصل فعليًا إن core/messageHandler.js بقى (بعد التعديل المطلوب)
// بيحفظ آخر حالة استقبلها البوت من كل جهة اتصال في كاش داخلي (statusCache) وقت ما
// توصله فعليًا لحظة نشرها، والأمر ده بيرجع النسخة المحفوظة دي. يعني:
//   - لازم البوت يكون "شايف" حالة الشخص ده أصلاً وقت ما نزلها (البوت شغال وبرقم
//     ظاهر لصاحب الحالة، مش محظور عنده).
//   - لو البوت اتقفل أو اتعمله إعادة تشغيل، الكاش بيتصفر وهيبدأ يحفظ من جديد.
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { getCachedStatus, resolveTargetJid, extractPureNumber } = require('../../core/messageHandler.js');

module.exports = {
    name: 'تحميل-حاله',
    aliases: ['تنزيل-حاله', 'حفظ-حاله'],
    category: 'whatsapp-tools',
    async execute(sock, m, args, db, sender, isOwner) {
        const chatId = m.key.remoteJid;

        // 1) تحديد الشخص المطلوب: رد على رسالته، أو منشن ليه، أو رقمه مكتوب كـ argument
        let targetJid = null;

        const groupMetadata = chatId.endsWith('@g.us')
            ? await sock.groupMetadata(chatId).catch(() => null)
            : null;

        targetJid = resolveTargetJid(m, db, groupMetadata);

        if (!targetJid && args[0]) {
            const rawNumber = args[0].replace(/[^0-9]/g, '');
            if (rawNumber.length >= 8) {
                targetJid = `${rawNumber}@s.whatsapp.net`;
            }
        }

        if (!targetJid) {
            return sock.sendMessage(chatId, {
                text: '📖 *طريقة الاستخدام:*\n' +
                      '• رد (reply) على أي رسالة من الشخص + اكتب: .تحميل-حاله\n' +
                      '• أو اكتب: .تحميل-حاله 201234567890'
            }, { quoted: m });
        }

        const cached = getCachedStatus(targetJid);
        if (!cached) {
            return sock.sendMessage(chatId, {
                text: `⚠️ معنديش حالة محفوظة لـ @${extractPureNumber(targetJid)} لحد دلوقتي.\n` +
                      'ده بيحصل لو الشخص ده لسه ما حطش حالة من وقت ما البوت اشتغل، أو حسابه مخفي الحالة عن البوت.',
                mentions: [targetJid]
            }, { quoted: m });
        }

        try {
            const statusMsg = cached.message;
            const innerType = Object.keys(statusMsg.message)[0];
            const caption = statusMsg.message[innerType]?.caption || '';
            const namePart = `📥 حالة @${extractPureNumber(targetJid)}${caption ? `\n\n${caption}` : ''}`;

            if (innerType === 'imageMessage') {
                const buffer = await downloadMediaMessage(statusMsg, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
                await sock.sendMessage(chatId, { image: buffer, caption: namePart, mentions: [targetJid] }, { quoted: m });
            } else if (innerType === 'videoMessage') {
                const buffer = await downloadMediaMessage(statusMsg, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
                await sock.sendMessage(chatId, { video: buffer, caption: namePart, mentions: [targetJid] }, { quoted: m });
            } else if (innerType === 'extendedTextMessage' || innerType === 'conversation') {
                const text = statusMsg.message.conversation || statusMsg.message.extendedTextMessage?.text || '';
                await sock.sendMessage(chatId, { text: `📥 حالة نصية من @${extractPureNumber(targetJid)}:\n\n${text}`, mentions: [targetJid] }, { quoted: m });
            } else {
                return sock.sendMessage(chatId, { text: '⚠️ نوع الحالة ده مش مدعوم للتنزيل حاليًا.' }, { quoted: m });
            }
        } catch (e) {
            console.error('❌ خطأ في تحميل الحالة:', e);
            await sock.sendMessage(chatId, { text: '❌ حصل خطأ أثناء تنزيل الحالة، جرب تاني.' }, { quoted: m });
        }
    }
};
