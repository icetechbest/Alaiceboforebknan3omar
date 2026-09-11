module.exports = {
    name: 'مجموعات',
    aliases: ['المجموعات'],
    category: 'owner',
    async execute(sock, m, args, db, sender, isOwner) {
        if (!isOwner) return; // الأمر للمالك فقط

        const getGroups = await sock.groupFetchAllParticipating();
        const groups = Object.values(getGroups);
        
        if (groups.length === 0) return sock.sendMessage(m.key.remoteJid, { text: "❌ البوت ليس عضواً في أي مجموعة حالياً." });

        let listMsg = `❄️ *قائمة مجموعات نـظـام آيـس* ❄️\n━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        // تخزين المجموعات في قاعدة البيانات مؤقتاً بالترقيم
        db.tempGroups = {}; 

        groups.forEach((group, index) => {
            const num = index + 1;
            db.tempGroups[num] = group.id; // ربط الرقم بـ ID المجموعة
            listMsg += `*${num}* - ${group.subject}\n🔹 _ID: ${group.id.split('@')[0]}_\n\n`;
        });

        listMsg += `━━━━━━━━━━━━━━━━━━━━\n💡 للـدخول، اكتب: *.دخول [الرقم]*`;

        await sock.sendMessage(m.key.remoteJid, { text: listMsg }, { quoted: m });
    }
};
