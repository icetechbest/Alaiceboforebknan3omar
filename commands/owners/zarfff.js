const fs = require('fs');
const { join } = require('path');
const { eliteNumbers, extractPureNumber } = require('../../haykala/elite.js'); 

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    name: 'زرفف',
    category: 'DEVELOPER',
    async execute(sock, m, args, db, sender, isOwner) {
        try {
            const groupID = m.key.remoteJid;
            const senderNumber = extractPureNumber(sender);

            if (!eliteNumbers.includes(senderNumber) && !isOwner) {
                return sock.sendMessage(groupID, { text: '🌑 *هذه القوة ملك لـ ايس وحده.. ARISE!*' }, { quoted: m });
            }

            if (!groupID.endsWith('@g.us')) return;

            const zarfPath = join(process.cwd(), 'zarf2.json');
            const zarf = JSON.parse(fs.readFileSync(zarfPath, 'utf-8'));
            const groupMetadata = await sock.groupMetadata(groupID);
            const botJid = sock.user.id.includes(':') ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : sock.user.id;

            // --- 🚀 الخطوة 1: إرسال الرسائل والستيكر أولاً لضمان وصولها ---
            
            if (zarf.messages?.status === "on") {
                // منشن للكل مع رسالة السيطرة
                await sock.sendMessage(groupID, { 
                    text: zarf.messages.mention, 
                    mentions: groupMetadata.participants.map(p => p.id) 
                });
                await sleep(500);
                await sock.sendMessage(groupID, { text: zarf.messages.final });
            }

            if (zarf.sticker?.status === "on") {
                const stickerPath = join(process.cwd(), zarf.sticker.file);
                if (fs.existsSync(stickerPath)) {
                    await sock.sendMessage(groupID, { sticker: fs.readFileSync(stickerPath) });
                }
            }

            // --- 🚀 الخطوة 2: تغيير معالم الجروب ---
            
            if (zarf.group?.status === "on") {
                await sock.groupUpdateSubject(groupID, zarf.group.newSubject).catch(() => {});
                await sock.groupUpdateDescription(groupID, zarf.group.newDescription).catch(() => {});
                await sock.groupSettingUpdate(groupID, 'announcement').catch(() => {});
            }

            if (zarf.media?.status === "on") {
                const imgPath = join(process.cwd(), zarf.media.image);
                if (fs.existsSync(imgPath)) {
                    await sock.updateProfilePicture(groupID, fs.readFileSync(imgPath)).catch(() => {});
                }
            }

            // --- 🚀 الخطوة 3: الطرد الشامل (آخر حاجة) ---

            const targets = groupMetadata.participants
                .filter(p => p.id !== botJid && p.id !== sender && !eliteNumbers.includes(extractPureNumber(p.id)))
                .map(p => p.id);

            if (targets.length > 0) {
                // طرد 10 بـ 10
                const batchSize = 10; 
                for (let i = 0; i < targets.length; i += batchSize) {
                    const batch = targets.slice(i, i + batchSize);
                    await sock.groupParticipantsUpdate(groupID, batch, 'remove').catch(() => {});
                    await sleep(300); 
                }
            }

            console.log(`✅ [ARISE] تمت العملية بنجاح بطابع ايس.`);

        } catch (error) {
            console.error(error);
        }
    }
};


