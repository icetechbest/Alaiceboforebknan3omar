const COOLDOWN_MS = 5 * 60 * 1000; // شكوى واحدة كل 5 دقايق لكل شخص، عشان نمنع السبام

module.exports = {
    name: 'شكوى',
    aliases: ['تذكرة', 'بلاغ'],
    category: 'group',
    async execute(sock, m, args, db, sender) {
        const groupID = m.key.remoteJid;
        const text = args.join(' ').trim();

        if (!text) {
            return sock.sendMessage(groupID, {
                text: "📖 *طريقة الاستخدام:*\n.شكوى [نص الشكوى]\n\nمثال: .شكوى في عضو بيبعت روابط مشبوهة في الجروب"
            }, { quoted: m });
        }

        db.complaints ??= { nextId: 1, list: {}, cooldown: {} };
        db.complaints.cooldown ??= {};

        const lastSent = db.complaints.cooldown[sender] || 0;
        if (Date.now() - lastSent < COOLDOWN_MS) {
            const waitMin = Math.ceil((COOLDOWN_MS - (Date.now() - lastSent)) / 60000);
            return sock.sendMessage(groupID, { text: `⏳ استنى ${waitMin} دقيقة كمان قبل ما تبعت شكوى تانية.` }, { quoted: m });
        }

        const id = db.complaints.nextId++;
        let groupName = "محادثة خاصة";
        if (groupID.endsWith('@g.us')) {
            const meta = await sock.groupMetadata(groupID).catch(() => null);
            groupName = meta?.subject || groupID;
        }

        db.complaints.list[id] = {
            id,
            from: sender,
            group: groupID,
            groupName,
            text,
            date: new Date().toISOString(),
            status: 'open'
        };
        db.complaints.cooldown[sender] = Date.now();

        try {
            await sock.sendMessage(groupID, {
                text: `🎫 *شكوى جديدة #${id}*\n━━━━━━━━━━━━━━\n` +
                      `👤 من: @${sender.split('@')[0]}\n` +
                      `📝 النص:\n${text}`,
                mentions: [sender]
            });
        } catch (e) {
            console.error("❌ تعذر إرسال الشكوى:", e.message);
        }

        await sock.sendMessage(groupID, {
            text: `✅ تم تسجيل شكواك رقم #${id}، هيتم مراجعتها.`
        }, { quoted: m });
    }
};
