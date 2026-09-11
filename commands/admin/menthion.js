module.exports = {
    name: 'منشن',
    aliases: ['نداء', 'الكل', 'tagall'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        // 1. التحقق من أن الأمر في مجموعة
        if (!id.endsWith('@g.us')) {
            return sock.sendMessage(id, { text: "❌ هذا الأمر مخصص للمجموعات فقط." });
        }

        // 2. التحقق من صلاحيات المشرفين أو المطور
        const groupMetadata = await sock.groupMetadata(id);
        const participants = groupMetadata.participants;
        const isAdmin = participants.find(p => p.id === sender)?.admin;

        if (!isOwner && !isAdmin) {
            return sock.sendMessage(id, { text: "🚫 عذراً، هذا الأمر للمدراء فقط لمنع الإزعاج." });
        }

        // 3. جمع الـ IDs لكل الأعضاء
        const allParticipants = participants.map(p => p.id);

        // 4. فحص إذا كان هناك رد على رسالة (Quoted Message)
        const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;

        if (quoted) {
            // إذا رد على رسالة، نرسل المنشن كتعقيب (Forward/Reply) على الرسالة المقتبسة
            let messageContent = {
                text: args.join(' ') || "📣 نداء للجميع!",
                mentions: allParticipants,
                contextInfo: {
                    externalAdReply: {
                        title: `📢 نـداء مـن: ${m.pushName || 'المدير'}`,
                        body: groupMetadata.subject,
                        mediaType: 1,
                        sourceUrl: db.settings?.mainGroup || ""
                    },
                    // ربط المنشن بالرسالة التي تم الرد عليها
                    quotedMessage: quoted,
                    participant: m.message.extendedTextMessage.contextInfo.participant,
                    remoteJid: id
                }
            };
            await sock.sendMessage(id, messageContent);
        } else {
            // إذا لم يكن هناك رد، نرسل نصاً عادياً مع منشن
            const text = args.join(' ') || "📣 نداء للجميع!";
            await sock.sendMessage(id, { 
                text: `✨ *﹝ نِـدَاءٌ جَـمَـاعِي ﹞* ✨\n\n${text}`, 
                mentions: allParticipants 
            }, { quoted: m });
        }
    }
};
