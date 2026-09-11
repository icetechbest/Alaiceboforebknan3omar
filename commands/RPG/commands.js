const { buildCategoryListText, findSection, buildSectionText } = require('../../data/menuSections.js');

module.exports = {
    name: 'اوامر',
    aliases: ['الاوامر', 'menu', 'help'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        // لو الأونر عدّل نص الأوامر بأمر .عدل-الاوامر، ده بديل كامل للنظام الجديد
        // (الأونر مسؤول عن محتواه بنفسه، وبيبعت زي ما هو من غير تقسيم).
        const customMenu = db.settings?.commandsMessage;
        if (customMenu) {
            return sock.sendMessage(id, { text: customMenu }, { quoted: m });
        }

        // لو المستخدم كتب رقم/اسم قسم مباشرة بعد الأمر (زي: .اوامر 3) نبعتله القسم على طول
        const directQuery = args.join(' ').trim();
        if (directQuery) {
            const section = findSection(directQuery);
            if (section) {
                db.pendingMenu ??= {};
                db.pendingMenu[sender] = { at: Date.now() };
                return sock.sendMessage(id, { text: buildSectionText(section) }, { quoted: m });
            }
        }

        // القائمة الرئيسية: نص عادي بسيط (مضمون الوصول 100%).
        // ملحوظة: كنا جربنا قائمة واتساب التفاعلية (زرار يفتح شيت اختيار)، لكن
        // طلعت مش بتوصل خالص عند بعض الحسابات (واتساب بيقلل دعمها بره الـ
        // Business API)، فرجّعناها نص عادي + نظام الرد بالرقم عشان يبقى مضمون.
        db.pendingMenu ??= {};
        db.pendingMenu[sender] = { at: Date.now() };
        await sock.sendMessage(id, { text: buildCategoryListText() }, { quoted: m });
    }
};
