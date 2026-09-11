module.exports = {
    name: 'عدل-ترحيب',
    aliases: ['تغيير-ترحيب'],
    category: 'admin',
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        const isGroup = groupID.endsWith('@g.us');
        
        // التحقق من صلاحيات المشرفين
        const groupMetadata = isGroup ? await sock.groupMetadata(groupID) : {};
        const participants = isGroup ? groupMetadata.participants : [];
        const isAdmin = participants.find(p => p.id === sender)?.admin || isOwner;

        if (!isAdmin) return sock.sendMessage(groupID, { text: "❌ هذا الأمر للمشرفين فقط." });

        const newMsg = args.join(" ");
        if (!newMsg) {
            return sock.sendMessage(groupID, { 
                text: `📖 *طريقة الاستخدام:*\n.عدل-ترحيب [نص الترحيب]\n\n*المتغيرات المتاحة:*\n- $user : منشن العضو\n- $username : اسمه\n- $name : لقبه المسجل\n- $group : اسم الجروب` 
            });
        }

        db[groupID] ??= {};
        db[groupID].welcome = { message: newMsg };

        await sock.sendMessage(groupID, { text: "✅ تم تحديث رسالة الترحيب بنجاح لهذا الجروب." });
    }
};
