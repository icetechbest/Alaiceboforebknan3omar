const { resolveRealJid } = require('../../core/messageHandler.js');

module.exports = {
    name: "lid",
    description: "استخراج معرف الحساب المخفي (LID)",
    category: "tools",
    async execute(sock, m, args, db, sender, isOwner) {
        try {
            const groupID = m.key.remoteJid;

            // 1. التحقق من صلاحيات الأدمن أو المطور
            const groupMetadata = m.isGroup ? await sock.groupMetadata(groupID) : null;
            if (m.isGroup) {
                const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;
                if (!isAdmin && !isOwner) {
                    return sock.sendMessage(groupID, { text: "⚠️ هذا الأمر مخصص للأدمن أو لملك الظلال ايس فقط." }, { quoted: m });
                }
            }

            // 2. تحديد الشخص المستهدف (رد على رسالة أو منشن أو الشخص نفسه)
            // ⚠️ contextInfo.participant ممكن يجيلنا بصيغة "@lid" بدل الرقم الحقيقي
            const lidContext = m.message.extendedTextMessage?.contextInfo;
            let target;
            if (lidContext?.mentionedJid?.length > 0) {
                // لو فيه منشن
                target = lidContext.mentionedJid[0];
            } else if (lidContext?.participant) {
                // لو فيه رد على رسالة (Reply)
                target = resolveRealJid(lidContext.participant, lidContext?.participantPn || lidContext?.participantAlt, groupMetadata, db.lidMap);
            } else {
                // لو مفيش ده ولا ده، يجيب بيانات اللي بعت الأمر
                target = sender;
            }

            // 3. استخراج الـ LID (في Baileys غالباً الـ participant هو اللي بيحمل المعرف)
            const responseText = `
╭─❖ 『 🆔 **𝐈𝐃 𝐃𝐄𝐓𝐄𝐂𝐓𝐎𝐑** 』 ❖─╮
│
│ *👤 المستخدم:* @${target.split('@')[0]}
│ *🔢 المعرف (𝐋𝐈𝐃):* │ ${target}
│
╰────────────╯`.trim();

            await sock.sendMessage(groupID, { 
                text: responseText,
                mentions: [target]
            }, { quoted: m });

            await sock.sendMessage(groupID, { react: { text: "🔍", key: m.key } });

        } catch (err) {
            console.error("خطأ في أمر lid:", err);
            await sock.sendMessage(m.key.remoteJid, { text: "❌ فشل النظام في العثور على الهوية." }, { quoted: m });
        }
    }
};
