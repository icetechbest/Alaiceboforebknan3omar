module.exports = {
    name: 'رد-شكوى',
    aliases: ['رد_شكوى'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;

        if (!isOwner) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده للمالك فقط." }, { quoted: m });
        }

        const ticketId = parseInt(args[0], 10);
        const replyText = args.slice(1).join(' ').trim();

        if (!ticketId || !replyText) {
            return sock.sendMessage(groupID, {
                text: "📖 *طريقة الاستخدام:*\n.رد-شكوى [رقم التذكرة] [النص]\n\nمثال: .رد-شكوى 3 تم التعامل مع المشكلة، شكرًا لإبلاغك"
            }, { quoted: m });
        }

        const complaint = db.complaints?.list?.[ticketId];
        if (!complaint) {
            return sock.sendMessage(groupID, { text: "❌ مفيش تذكرة شكوى بالرقم ده." }, { quoted: m });
        }

        complaint.status = 'answered';
        complaint.answer = replyText;

        try {
            await sock.sendMessage(complaint.from, {
                text: `📩 *رد على شكواك #${ticketId}*\n━━━━━━━━━━━━━━\n${replyText}\n━━━━━━━━━━━━━━\n\nقيّم تعامل الإدارة مع شكواك:\n👍 راضٍ    👎 غير راضٍ`
            });
            db.complaints.pendingRating ??= {};
            db.complaints.pendingRating[complaint.from] = ticketId;
        } catch (e) {
            console.error("❌ تعذر إرسال رد الشكوى لصاحبها:", e.message);
        }

        await sock.sendMessage(groupID, { text: `✅ تم إرسال الرد على تذكرة #${ticketId} وتحديث حالتها.` }, { quoted: m });
    }
};
