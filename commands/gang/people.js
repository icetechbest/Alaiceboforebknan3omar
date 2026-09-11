module.exports = {
    name: "اعضاء",
    category: "العصابات",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;

        // 1. البحث عن عصابة العضو (سواء كان المالك أو عضو عادي)
        const gang = Object.values(db.gangs || {}).find(g => g.members && g.members.includes(sender));

        if (!gang) {
            return sock.sendMessage(groupID, { text: "⚠️ أنت لست عضواً في أي عصابة حالياً." }, { quoted: m });
        }

        // 2. تجهيز الرسالة والمنشنات
        let listMsg = `🏰 *سجل عصابة [ ${gang.name} ]* 🏰\n`;
        listMsg += `━━━━━━━━━━━━━━━\n`;
        listMsg += `👑 *الزعيم:* @${gang.owner.split('@')[0]}\n\n`;
        listMsg += `🤺 *قائمة المحاربين:*\n`;

        const mentions = [gang.owner];
        
        // 3. ترتيب القائمة وإظهار الرتبة بجانب كل عضو
        gang.members.forEach((member, index) => {
            // استثناء الزعيم من التكرار تحت لأنه مكتوب فوق
            if (member !== gang.owner) {
                // التحقق إذا كان للعضو رتبة مخصصة
                const rank = (gang.ranks && gang.ranks[member]) ? ` ✨ *[ ${gang.ranks[member]} ]*` : "";
                
                listMsg += `${index + 1} - @${member.split('@')[0]}${rank}\n`;
                mentions.push(member);
            }
        });

        // 4. حالة العصابة لو مفيش أعضاء غير الزعيم
        if (gang.members.length === 1) {
            listMsg += `_(لا يوجد أعضاء آخرون حالياً)_\n`;
        }

        listMsg += `━━━━━━━━━━━━━━━\n`;
        listMsg += `📊 *المستوى:* ${gang.level || 1}\n`;
        listMsg += `💰 *الخزينة:* ${Number(gang.gold || 0).toLocaleString()} ذهبة\n`;
        listMsg += `👥 *إجمالي العدد:* ${gang.members.length} أعضاء`;

        return sock.sendMessage(groupID, { 
            text: listMsg, 
            mentions: mentions 
        }, { quoted: m });
    }
};
