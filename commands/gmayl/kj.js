const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'dkj',
    aliases: ['DKJ'],
    category: 'special',

    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        const dkjMsg = `𝑹𝒖𝒅𝒚 𝒘𝒂𝒔 𝒏𝒐𝒕 𝒋𝒖𝒔𝒕 𝒑𝒂𝒓𝒕 𝒐𝒇 𝒕𝒉𝒆 𝒔𝒕𝒐𝒓𝒚.
𝑹𝒖𝒅𝒚 𝒘𝒂𝒔 𝒕𝒉𝒆 𝒅𝒓𝒆𝒂𝒎 𝑰 𝒌𝒆𝒑𝒕 𝒓𝒆𝒂𝒅𝒊𝒏𝒈 𝒇𝒐𝒓.

𝑯𝒆 𝒘𝒂𝒔 𝟒𝟗% 𝒐𝒇 𝒕𝒉𝒆 𝒔𝒕𝒐𝒓𝒚 —
𝒕𝒉𝒆 𝒑𝒂𝒓𝒕 𝒕𝒉𝒂𝒕 𝒄𝒂𝒓𝒓𝒊𝒆𝒅 𝒕𝒉𝒆 𝒅𝒓𝒆𝒂𝒎.

𝑨𝒏𝒅 𝒕𝒉𝒆 𝒐𝒕𝒉𝒆𝒓 𝟓𝟏%
𝒘𝒂𝒔 𝑲𝒐𝒖 —
𝒕𝒉𝒆 𝒑𝒂𝒓𝒕 𝒕𝒉𝒂𝒕 𝒌𝒆𝒑𝒕 𝒕𝒉𝒆 𝒅𝒓𝒆𝒂𝒎 𝒂𝒍𝒊𝒗𝒆.

𝑴𝒂𝒚𝒃𝒆 𝒕𝒉𝒂𝒕 𝒊𝒔 𝒘𝒉𝒂𝒕 𝒂 𝒅𝒓𝒆𝒂𝒎 𝒓𝒆𝒂𝒍𝒍𝒚 𝒊𝒔 —
𝒂 𝒔𝒕𝒐𝒓𝒚 𝒕𝒉𝒂𝒕 𝒃𝒆𝒍𝒐𝒏𝒈𝒔 𝒑𝒂𝒓𝒕𝒍𝒚 𝒕𝒐 𝒕𝒉𝒆 𝒅𝒓𝒆𝒂𝒎𝒆𝒓,
𝒂𝒏𝒅 𝒑𝒂𝒓𝒕𝒍𝒚 𝒕𝒐 𝒕𝒉𝒆 𝒐𝒏𝒆 𝒘𝒉𝒐 𝒌𝒆𝒆𝒑𝒔 𝒊𝒕 𝒂𝒍𝒊𝒗𝒆.

𝟒𝟗% 𝑹𝒖𝒅𝒚.
𝟓𝟏% 𝑲𝒐𝒖.

𝑵𝒐𝒕 𝒕𝒘𝒐 𝒔𝒕𝒐𝒓𝒊𝒆𝒔.
𝑵𝒐𝒕 𝒕𝒘𝒐 𝒅𝒓𝒆𝒂𝒎𝒔.

𝑱𝒖𝒔𝒕 𝒐𝒏𝒆 𝒅𝒓𝒆𝒂𝒎 —
𝒔𝒉𝒂𝒓𝒆𝒅 𝒃𝒆𝒕𝒘𝒆𝒆𝒏 𝟒𝟗% 𝑹𝒖𝒅𝒚
𝒂𝒏𝒅 𝟓𝟏% 𝑲𝒐𝒖.

⸙͎ꪶ  𖦹 𝑹𝑼𝑫𝒀 ⏤͟͟͞͞🌀 𝑺𝑻𝑰𝑪𝑲⃟𝑬𝑹𝑺 ˚⭒


> 𝒃𝒚 𝒌𝒐𝒖`;

        const imageUrl = "https://cdn.phototourl.com/free/2026-09-18-412576fe-24af-4a8f-b6e6-36461c3cd181.jpg";

        try {
            await sock.sendMessage(id, {
                image: { url: imageUrl },
                caption: dkjMsg,
                mentions: [sender]
            }, { quoted: m });

            await sock.sendMessage(id, {
                react: {
                    text: "🌀",
                    key: m.key
                }
            });

        } catch (e) {
            console.error('DKJ Error:', e);

            await sock.sendMessage(id, {
                text: dkjMsg
            }, { quoted: m });
        }
    }
};