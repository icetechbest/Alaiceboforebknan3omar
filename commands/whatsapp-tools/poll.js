// .تصويت "السؤال" "خيار1" "خيار2" ...
// بيستخدم نوع رسالة poll بتاع Baileys مباشرة (sock.sendMessage(chatId, { poll: {...} })).
// لازم كل جزء (السؤال وكل خيار) يكون بين علامتي تنصيص "..." عشان نقدر نفصلهم
// حتى لو فيهم مسافات.
module.exports = {
    name: 'تصويت',
    aliases: ['استطلاع', 'بول', 'استفتاء'],
    category: 'whatsapp-tools',
    async execute(sock, m, args, db, sender, isOwner) {
        const chatId = m.key.remoteJid;
        const raw = args.join(' ');
        const parts = [...raw.matchAll(/"([^"]+)"/g)].map(match => match[1].trim()).filter(Boolean);

        if (parts.length < 3) {
            return sock.sendMessage(chatId, {
                text: '📖 *طريقة الاستخدام:*\n.تصويت "السؤال" "خيار1" "خيار2"\n\n' +
                      'مثال:\n.تصويت "فين نروح النهارده؟" "السينما" "الشاطئ" "نقعد البيت"\n\n' +
                      '⚠️ لازم سؤال واحد + خياريين على الأقل، وكل جزء بين علامتي تنصيص.'
            }, { quoted: m });
        }

        const [question, ...pollOptions] = parts;

        if (pollOptions.length > 12) {
            return sock.sendMessage(chatId, { text: '⚠️ أقصى عدد خيارات مسموح بيه في واتساب هو 12 خيار.' }, { quoted: m });
        }

        try {
            await sock.sendMessage(chatId, {
                poll: {
                    name: question,
                    values: pollOptions,
                    selectableCount: 1 // خيار واحد بس مسموح لكل شخص؛ غيّرها لو عايز تصويت متعدد الاختيار
                }
            }, { quoted: m });
        } catch (e) {
            console.error('❌ خطأ في إنشاء التصويت:', e);
            await sock.sendMessage(chatId, { text: '❌ حصل خطأ أثناء إنشاء التصويت.' }, { quoted: m });
        }
    }
};
