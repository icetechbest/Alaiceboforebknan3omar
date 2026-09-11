const fs = require('fs');
const path = require('path');
const { isParticipantAdmin } = require('../../core/messageHandler.js');

const TRIVIA_PATH = path.join(__dirname, '../../data/trivia.json');
const ANSWER_SECONDS = 30;

module.exports = {
    name: 'ابدأ-مسابقة',
    aliases: ['ابدا-مسابقة', 'تريفيا'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        if (db.puzzles[groupID]) {
            return sock.sendMessage(groupID, { text: "⚠️ فيه مسابقة شغالة بالفعل في هذا الجروب." }, { quoted: m });
        }

        let bank = [];
        try { bank = JSON.parse(fs.readFileSync(TRIVIA_PATH, 'utf-8')); } catch (e) { bank = []; }
        if (bank.length === 0) {
            return sock.sendMessage(groupID, { text: "❌ بنك أسئلة التريفيا فاضي حاليًا." }, { quoted: m });
        }

        const q = bank[Math.floor(Math.random() * bank.length)];
        const correctAnswer = q.options[q.answerIndex];

        // بنسجلها بنفس شكل db.puzzles العادي (answer + reward) عشان تتفحص بنفس منطق
        // حل الألغاز الموجود في core/messageHandler.js من غير أي تعديل إضافي هناك،
        // بس بنسمح إن الإجابة تبقى رقم الاختيار أو نصه بالظبط.
        db.puzzles[groupID] = { answer: correctAnswer, reward: q.reward || 500, trivia: true };

        let msg = `🧠 *مسابقة تريفيا!* 🧠\n━━━━━━━━━━━━━━━━━━\n${q.question}\n\n`;
        q.options.forEach((opt, i) => { msg += `${i + 1}. ${opt}\n`; });
        msg += `━━━━━━━━━━━━━━━━━━\n✍️ اكتب نص الإجابة الصح عشان تكسب ${q.reward || 500} ذهبة.\n⏳ عندك ${ANSWER_SECONDS} ثانية.`;

        await sock.sendMessage(groupID, { text: msg }, { quoted: m });

        setTimeout(async () => {
            if (db.puzzles[groupID]?.trivia && db.puzzles[groupID]?.answer === correctAnswer) {
                delete db.puzzles[groupID];
                await sock.sendMessage(groupID, { text: `⌛ خلص الوقت! محدش جاوب صح.\nالإجابة الصحيحة كانت: *${correctAnswer}*` }).catch(() => {});
            }
        }, ANSWER_SECONDS * 1000);
    }
};
