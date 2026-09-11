module.exports = {
    name: 'احصائيات-اسبوعية',
    aliases: ['الاحصائيات-الاسبوعية'],
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
        db[groupID] ??= {};
        db[groupID].weeklyStats ??= {};

        if (sub === 'تعطيل' || sub === 'off') {
            db[groupID].weeklyStats.enabled = false;
            return sock.sendMessage(groupID, { text: "🔕 تم تعطيل الإحصائيات الأسبوعية التلقائية." }, { quoted: m });
        }

        if (sub === 'تفعيل' || sub === 'on' || !sub) {
            db[groupID].weeklyStats.enabled = true;
            return sock.sendMessage(groupID, {
                text: "✅ تم تفعيل الإحصائيات الأسبوعية التلقائية.\n📊 هيتبعت ملخص لأنشط 5 أعضاء كل يوم جمعة الساعة 8 بالليل تلقائيًا."
            }, { quoted: m });
        }

        return sock.sendMessage(groupID, {
            text: "📖 الاستخدام: .احصائيات-اسبوعية تفعيل  أو  .احصائيات-اسبوعية تعطيل"
        }, { quoted: m });
    }
};
