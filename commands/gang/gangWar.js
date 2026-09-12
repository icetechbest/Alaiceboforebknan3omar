// ⚔️ [ أمر .حرب_عصابات ] --------------------------------------------------------
// بيعلن حرب "مجدولة" بين عصابتين تفضل 24 ساعة، خلالها أعضاء العصابتين يقدروا
// يساهموا بنقط لعصابتهم بأمر .مساهمة (في commands/gang/gangWarAttack.js).
// النتيجة بتتحسم تلقائيًا في core/scheduler.js (tickGangWars) لما الوقت يخلص،
// وده مختلف عن .هجوم اللي نتيجته فورية للحظة واحدة بس.
const WAR_DURATION_MS = 24 * 60 * 60 * 1000;

module.exports = {
    name: "حرب_عصابات",
    aliases: ["اعلان_حرب"],
    category: "العصابات",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;
        const targetGangName = args.join(" ").trim();

        const myGang = Object.values(db.gangs || {}).find(g => g.owner === sender);
        if (!myGang) return sock.sendMessage(groupID, { text: "⚠️ لازم تكون قائد عصابة عشان تعلن حرب!" });

        if (myGang.activeWarId) {
            return sock.sendMessage(groupID, { text: "⚔️ عصابتك في حرب شغالة بالفعل! استنى تخلص الأول." });
        }

        if (!targetGangName) {
            return sock.sendMessage(groupID, { text: "⚠️ اكتب اسم العصابة اللي عايز تعلن الحرب عليها.\nمثال: .حرب_عصابات التنانين" });
        }

        const targetGang = db.gangs[targetGangName];
        if (!targetGang) return sock.sendMessage(groupID, { text: "⚠️ العصابة دي مش موجودة في سجلاتنا!" });
        if (targetGang.name === myGang.name) return sock.sendMessage(groupID, { text: "😂 مينفعش تعلن حرب على نفسك!" });
        if (myGang.allies?.includes(targetGang.name)) {
            return sock.sendMessage(groupID, { text: "🤝 دي عصابة حليفة! فك التحالف الأول لو عايز تحاربها." });
        }
        if (targetGang.activeWarId) {
            return sock.sendMessage(groupID, { text: "⚠️ العصابة دي في حرب تانية شغالة حاليًا." });
        }

        const warId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const now = Date.now();
        db.gangWars ??= {};
        db.gangWars[warId] = {
            id: warId,
            gangA: myGang.name,
            gangB: targetGang.name,
            groupID,
            startedAt: now,
            endsAt: now + WAR_DURATION_MS,
            score: { [myGang.name]: 0, [targetGang.name]: 0 },
            startedBy: sender
        };
        myGang.activeWarId = warId;
        targetGang.activeWarId = warId;

        const msg = `⚔️ *إِعْلَانُ حَرْبٍ رَسْمِيّ!* ⚔️\n━━━━━━━━━━━━━━━━━━\n` +
            `🏰 [ ${myGang.name} ] أعلنت الحرب على [ ${targetGang.name} ]!\n\n` +
            `⏳ المدة: 24 ساعة.\n` +
            `📜 أعضاء العصابتين يقدروا يساهموا بنقط للحرب بأمر *.مساهمة*.\n` +
            `🏆 العصابة صاحبة أعلى نقط في نهاية الحرب بتنهب 15% من خزنة الخصم!`;

        await sock.sendMessage(groupID, { text: msg });
    }
};
