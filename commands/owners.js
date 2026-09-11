// مابات لتخزين البيانات في الذاكرة لسرعة الاستجابة (RAM Protection)
const antiNuke = new Map();
const messageLog = new Map();

module.exports = {
    name: 'حماية',
    aliases: ['shield', 'حمايه'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        // 1. التأكد أن المرسل أونر (انت يا ايس)
        if (!isOwner) return sock.sendMessage(id, { text: "🚫 ┇ هذا الأمر مخصص للإدارة العليا لـ *سونج*." }, { quoted: m });

        if (!db[id]) db[id] = { protection: false };

        const action = args[0];

        // --- تفعيل الحماية ---
        if (action === 'فتح') {
            db[id].protection = true;
            return sock.sendMessage(id, { 
                text: `🛡️ ┇ *بـروتوكول سونج الدفاعي: نَـشط*\n━━━━━━━━━━━━━━\nتم تفعيل الرادار الملكي بنجاح:\n✅ منع التصفية (3 أشخاص/دقيقة)\n✅ طرد ناشري الروابط والتاغ الجماعي\n✅ إعدام حسابات السبام تلقائياً\n✅ إرسال سجل العمليات للأونر` 
            }, { quoted: m });
        } 
        
        // --- إيقاف الحماية ---
        else if (action === 'قفل') {
            db[id].protection = false;
            return sock.sendMessage(id, { text: "🔓 ┇ تم إيقاف كافة أنظمة الحماية في هذه المجموعة." }, { quoted: m });
        } 
        
        else {
            return sock.sendMessage(id, { text: "❓ ┇ استخدم: *.حماية فتح* أو *.حماية قفل*" }, { quoted: m });
        }
    },

    // --- [هذا الجزء هو المحرك الذي يراقب الشات] ---
    async monitor(sock, m, db) {
        const id = m.key.remoteJid;
        if (!id.endsWith('@g.us') || !db[id]?.protection) return;

        const sender = m.key.participant || m.key.remoteJid;
        const text = (m.message?.conversation || m.message?.extendedTextMessage?.text || "").trim();
        const now = Date.now();

        // [أ] حماية الروابط والمنشن الجماعي
        if (text.includes('chat.whatsapp.com/') || text.includes('@everyone') || text.includes('@here')) {
            const groupMetadata = await sock.groupMetadata(id);
            const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;
            
            if (!isAdmin) {
                await sock.sendMessage(id, { delete: m.key });
                await sock.groupParticipantsUpdate(id, [sender], "remove");
                // إرسال سجل للاونر ايس
                await sock.sendMessage("201220800288@s.whatsapp.net", { text: `🚨 *سجل سونج*\nطردت شخص نشر رابط/تاغ في جروب: ${groupMetadata.subject}` });
                return;
            }
        }

        // [ب] حماية السبام (أكثر من 5 رسائل في 3 ثواني)
        if (!messageLog.has(sender)) messageLog.set(sender, []);
        const logs = messageLog.get(sender);
        logs.push(now);
        const recent = logs.filter(t => now - t < 3000);
        messageLog.set(sender, recent);

        if (recent.length > 5) {
            const groupMetadata = await sock.groupMetadata(id);
            const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;
            if (!isAdmin) {
                await sock.sendMessage(id, { delete: m.key });
                await sock.groupParticipantsUpdate(id, [sender], "remove");
                await sock.sendMessage("201220800288@s.whatsapp.net", { text: `⚡ *سجل سونج*\nطردت شخص بسبب السبام في جروب: ${groupMetadata.subject}` });
            }
        }
    }
};
