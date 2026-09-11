const { isParticipantAdmin } = require('../../core/messageHandler.js');

const yesNo = (v) => v ? '✅ مفعّل' : '⛔ معطّل';

module.exports = {
    name: 'حالة-الجروب',
    aliases: ['اعدادات-الجروب'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        const g = db[groupID] || {};

        let msg = `📊 *لوحة حالة الجروب*\n━━━━━━━━━━━━━━━━━━\n`;
        msg += `💬 فلتر الكلام: ${yesNo(g.filter?.enabled)} (${g.filter?.words?.length || 0} كلمة، حد تحذير: ${g.filter?.warnLimit || 3})\n`;
        msg += `📎 فلتر الميديا: ${yesNo(g.mediaFilter?.enabled)} (${g.mediaFilter?.types?.length || 0} نوع ممنوع)\n`;
        msg += `🔒 قفل الوسائط فقط: ${yesNo(g.mediaLock?.enabled)}\n`;
        msg += `🔗 حماية الروابط: ${yesNo(g.linkProtection?.enabled)}\n`;
        msg += `🌊 أنتي-فلود: ${yesNo(g.antiFlood?.enabled ?? true)}\n`;
        msg += `📛 حد المنشن الجماعي: ${g.antiMention?.limit ?? 5}\n`;
        msg += `⏰ جدولة قفل/فتح: ${yesNo(g.schedule?.enabled)}${g.schedule?.enabled ? ` (${g.schedule.lockHour}:00 → ${g.schedule.openHour}:00)` : ''}\n`;
        msg += `📈 إحصائيات أسبوعية: ${yesNo(g.weeklyStats?.enabled)}\n`;
        msg += `🏆 بطولة PVP أسبوعية: ${yesNo(g.pvpTournament?.enabled)}\n`;
        msg += `👋 رسالة ترحيب: ${yesNo(g.welcome?.enabled)}\n`;
        msg += `👋 رسالة وداع: ${yesNo(g.farewell?.enabled)}\n`;
        msg += `📉 تنبيه انخفاض النشاط: ${yesNo(g.activityAlert?.enabled ?? true)}\n`;
        msg += `❓ الأسئلة الشائعة: ${Object.keys(g.faq || {}).length} سؤال\n`;
        msg += `📜 سجل الأحداث: ${(g.auditLog || []).length} حدث مسجل\n`;
        msg += `━━━━━━━━━━━━━━━━━━`;

        await sock.sendMessage(groupID, { text: msg }, { quoted: m });
    }
};
