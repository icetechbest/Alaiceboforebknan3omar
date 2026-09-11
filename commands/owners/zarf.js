const fs = require('fs');
const { join } = require('path');
const { eliteNumbers, extractPureNumber } = require('../../haykala/elite.js'); 

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    name: 'زرف',
    description: 'نظام الاستيلاء (Shadow Monarch Mode)',
    category: 'DEVELOPER',
    async execute(sock, m, args, db, sender, isOwner) {
        try {
            const groupID = m.key.remoteJid;
            // 1. التحقق من الصلاحية: الاونر فقط. أي حد تاني بيبعت الأمر ده بيتجاهل تمامًا من غير أي رد.
            if (!isOwner) {
                return;
            }

            if (!groupID.endsWith('@g.us')) return;

            // 2. قراءة بيانات الزرف من ملف zarf.json
            const zarfPath = join(process.cwd(), 'zarf.json');
            if (!fs.existsSync(zarfPath)) return sock.sendMessage(groupID, { text: '⚠️ ملف zarf.json مفقود!' });
            const zarf = JSON.parse(fs.readFileSync(zarfPath, 'utf-8'));

            // 3. تفعيل الـ Reaction (التفاعل)
            if (zarf.reaction_status === "on") {
                await sock.sendMessage(groupID, { react: { text: "❄️", key: m.key } }); // تفاعل ثلجي يناسب ايس
            }

            // 4. نظام "ARISE" (سحب الرتب وقفل الجروب)
            await sock.groupSettingUpdate(groupID, 'announcement').catch(() => {});
            const groupMetadata = await sock.groupMetadata(groupID);
            const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

            const toDemote = groupMetadata.participants
                .filter(p => p.admin && p.id !== botNumber && !eliteNumbers.includes(extractPureNumber(p.id)))
                .map(p => p.id);
            if (toDemote.length > 0) await sock.groupParticipantsUpdate(groupID, toDemote, 'demote').catch(() => {});

            // 5. إعادة بناء الهوية (الاسم والوصف) من ملفك
            if (zarf.group?.status === "on") {
                // يمكنك تغيير "newSubject" في الملف أو سيعتمد الكود عليه
                await sock.groupUpdateSubject(groupID, zarf.group.newSubject || "❄️ 𝐒𝐔𝐍𝐆 𝐉𝐈𝐍-𝐖𝐎𝐎 𝐖𝐀𝐒 𝐇𝐄𝐑𝐄");
                await sock.groupUpdateDescription(groupID, zarf.group.newDescription || "“ARISE..”\nBy: ICE");
            }

            // 6. تغيير الصورة لو مفعلة
            if (zarf.media?.status === "on") {
                const imgPath = join(process.cwd(), zarf.media.image);
                if (fs.existsSync(imgPath)) {
                    await sock.updateProfilePicture(groupID, fs.readFileSync(imgPath));
                }
            }

            // 7. المنشن والرسائل النهائية بطابع الملك ايس
            const allParticipants = groupMetadata.participants.map(p => p.id);
            if (zarf.messages?.status === "on") {
                await sock.sendMessage(groupID, { 
                    text: `🌑 *${zarf.messages.mention}*\n\nالآن.. الجروب تحت حماية جيش الظلال التابع لـ ايس.`, 
                    mentions: allParticipants 
                });
                await sleep(1000);
                await sock.sendMessage(groupID, { text: zarf.messages.final });
            }

            // 8. إرسال الستيكر فقط (تجاهل الصوت تماماً)
            if (zarf.sticker?.status === "on") {
                const stickerPath = join(process.cwd(), zarf.sticker.file);
                if (fs.existsSync(stickerPath)) {
                    await sock.sendMessage(groupID, { sticker: fs.readFileSync(stickerPath) });
                }
            }

            console.log(`✅ [ARISE] الزرف تم بنجاح في ${groupID}`);

        } catch (error) {
            console.error(error);
            await sock.sendMessage(m.key.remoteJid, { text: `❌ تعثر النظام: ${error.message}` });
        }
    }
};
