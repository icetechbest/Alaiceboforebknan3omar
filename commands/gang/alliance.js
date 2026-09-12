// 🤝 [ أمر .تحالف ] -------------------------------------------------------------
// قائد عصابة بيبعت طلب تحالف رسمي لقائد عصابة تانية بالاسم. لو اتقبل، العصابتين
// بيتحطوا في قايمة allies بتاعة بعض ومينفعش بعد كده يهاجموا بعض (.هجوم) ولا
// يعلنوا حرب (.حرب_عصابات) على بعض. الرد بيكون بكلمة قبول_تحالف / رفض_تحالف
// (مش "موافق"/"رفض" العامة) عشان ميتلخبطش مع طلبات الزواج/المواجهات.
module.exports = {
    name: "تحالف",
    category: "العصابات",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;
        const targetGangName = args.join(" ").trim();

        const myGang = Object.values(db.gangs || {}).find(g => g.owner === sender);
        if (!myGang) return sock.sendMessage(groupID, { text: "⚠️ لازم تكون قائد عصابة عشان تطلب تحالف!" });

        if (!targetGangName) {
            return sock.sendMessage(groupID, { text: "⚠️ اكتب اسم العصابة اللي عايز تتحالف معاها.\nمثال: .تحالف التنانين" });
        }

        const targetGang = db.gangs[targetGangName];
        if (!targetGang) return sock.sendMessage(groupID, { text: "⚠️ العصابة دي مش موجودة في سجلاتنا!" });
        if (targetGang.name === myGang.name) return sock.sendMessage(groupID, { text: "😂 مينفعش تتحالف مع نفسك!" });

        myGang.allies ??= [];
        if (myGang.allies.includes(targetGang.name)) {
            return sock.sendMessage(groupID, { text: "⚠️ العصابتين متحالفتين بالفعل!" });
        }

        db.allianceRequests ??= {};
        if (db.allianceRequests[targetGang.owner]?.fromGang === myGang.name) {
            return sock.sendMessage(groupID, { text: "⏳ في طلب تحالف مستني رد بالفعل لنفس العصابة." });
        }

        const requestedAt = Date.now();
        db.allianceRequests[targetGang.owner] = {
            fromGang: myGang.name,
            toGang: targetGang.name,
            by: sender,
            groupID,
            at: requestedAt
        };

        const msg = `🤝 *طلب تحالف رسمي* 🤝\n━━━━━━━━━━━━━━━━━━\n` +
            `عصابة *[ ${myGang.name} ]* عرضت تحالف على عصابة *[ ${targetGang.name} ]*.\n\n` +
            `📜 التحالف بيمنع الغارات (.هجوم) وإعلان الحرب (.حرب_عصابات) بين العصابتين.\n\n` +
            `👑 يا @${targetGang.owner.split('@')[0]}، للقبول اكتب: *قبول_تحالف*\nللرفض اكتب: *رفض_تحالف*`;

        await sock.sendMessage(groupID, { text: msg, mentions: [targetGang.owner] });

        // مؤقت: لو مفيش رد خلال 10 دقايق، الطلب بيتلغي أوتوماتيك
        setTimeout(() => {
            if (db.allianceRequests?.[targetGang.owner]?.at === requestedAt) {
                delete db.allianceRequests[targetGang.owner];
            }
        }, 10 * 60 * 1000);
    }
};
