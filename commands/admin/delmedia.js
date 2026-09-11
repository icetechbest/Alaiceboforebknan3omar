const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'حذف',
    aliases: ['حذف_صورة', 'مسح'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        // التحقق من أن المستخدم هو المالك (الأونر)
        if (!isOwner) return sock.sendMessage(id, { text: "⚠️ هذا الأمر مخصص للمطورين فقط!" }, { quoted: m });

        // التحقق من أن الأونر كتب اسم الصورة
        if (!args[0]) {
            return sock.sendMessage(id, { text: "❌ يرجى كتابة اسم الصورة المراد حذفها.\nمثال: *.حذف لوفي*" }, { quoted: m });
        }

        const imageName = args.join(' ');
        const mediaPath = path.join(__dirname, '../../media');
        
        // البحث عن الصورة بأكثر من امتداد (jpg, png, jpeg) لضمان الحذف
        const extensions = ['.jpg', '.png', '.jpeg'];
        let deleted = false;

        for (const ext of extensions) {
            const filePath = path.join(mediaPath, imageName + ext);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // حذف الملف
                deleted = true;
                break;
            }
        }

        if (deleted) {
            await sock.sendMessage(id, { text: `✅ تم حذف صورة *(${imageName})* بنجاح من الميديا.` }, { quoted: m });
        } else {
            await sock.sendMessage(id, { text: `❌ لم يتم العثور على صورة باسم *(${imageName})*.\nتأكد من كتابة الاسم كما هو موجود في المجلد.` }, { quoted: m });
        }
    }
};
