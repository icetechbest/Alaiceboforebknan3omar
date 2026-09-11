module.exports = {
    name: 'جدولة-الجروب',
    aliases: ['جدولة-القفل'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        const participantInfo = groupMetadata?.participants?.find(p => p.id === sender);
        const isAdmin = participantInfo?.admin === 'admin' || participantInfo?.admin === 'superadmin';
        if (!isAdmin && !isOwner) {
            return sock.sendMessage(groupID, { text: "🚫 هذا الأمر للمشرفين أو المالك فقط!" }, { quoted: m });
        }

        const sub = (args[0] || '').trim();

        if (sub === 'الغاء' || sub === 'إلغاء' || sub === 'off') {
            db[groupID] ??= {};
            db[groupID].schedule ??= {};
            db[groupID].schedule.enabled = false;
            return sock.sendMessage(groupID, { text: "🔕 تم إلغاء جدولة قفل/فتح هذا الجروب." }, { quoted: m });
        }

        if (sub === 'عرض' || sub === 'status') {
            const cfg = db[groupID]?.schedule;
            if (!cfg?.enabled) {
                return sock.sendMessage(groupID, { text: "🔕 لا توجد جدولة مفعّلة حاليًا لهذا الجروب." }, { quoted: m });
            }
            return sock.sendMessage(groupID, {
                text: `⏰ *جدولة الجروب الحالية*\n━━━━━━━━━━━━━━\n🔒 يقفل الساعة: ${cfg.lockHour}:00\n🔓 يفتح الساعة: ${cfg.openHour}:00`
            }, { quoted: m });
        }

        const lockHour = parseInt(args[0]);
        const openHour = parseInt(args[1]);

        if (isNaN(lockHour) || isNaN(openHour) || lockHour < 0 || lockHour > 23 || openHour < 0 || openHour > 23) {
            return sock.sendMessage(groupID, {
                text: "📖 *طريقة الاستخدام:*\n" +
                      ".جدولة-الجروب [ساعة القفل] [ساعة الفتح]\n" +
                      "مثال: .جدولة-الجروب 0 8  (يقفل الساعة 12 بالليل، يفتح 8 الصبح)\n\n" +
                      "أوامر تانية:\n.جدولة-الجروب عرض — تشوف الجدولة الحالية\n.جدولة-الجروب الغاء — توقف الجدولة\n\n" +
                      "⚠️ الساعات بتوقيت السيرفر (24 ساعة)."
            }, { quoted: m });
        }

        db[groupID] ??= {};
        db[groupID].schedule = {
            enabled: true,
            lockHour,
            openHour,
            lastState: db[groupID]?.schedule?.lastState || null
        };

        await sock.sendMessage(groupID, {
            text: `✅ تم ضبط جدولة الجروب:\n🔒 يقفل الساعة ${lockHour}:00\n🔓 يفتح الساعة ${openHour}:00\n\n(هيتنفذ تلقائيًا كل دقيقة، ممكن ياخد لحظات لحد أول تشغيل)`
        }, { quoted: m });
    }
};
