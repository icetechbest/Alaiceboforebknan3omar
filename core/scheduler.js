const fs = require("fs");
const path = require("path");
const { getWeekKey } = require("./utils.js");

// 🗺️ خريطة "آخر sock شاف رسالة من الجروب ده" — بتتحدث من createMessageHandler في
// core/messageHandler.js كل ما تجيله رسالة من أي جروب. بنستخدمها هنا عشان نعرف
// نبعت رسالة/نغيّر إعدادات الجروب من نفس البوت (أساسي أو فرعي) اللي فعليًا عضو فيه،
// من غير ما نحتاج كل بوت يعرف عن باقي البوتات حاجة.
const groupSockMap = new Map();

function recordGroupSock(groupID, sock) {
    if (!groupID?.endsWith("@g.us") || !sock) return;
    groupSockMap.set(groupID, sock);
}

function getSockForGroup(groupID) {
    return groupSockMap.get(groupID) || null;
}

// بيحدد هل الساعة الحالية (0-23) لازم تكون "مقفولة" حسب ساعة القفل والفتح المضبوطين،
// وبيدعم النطاق العابر لمنتصف الليل (مثلاً يقفل 0 ويفتح 8: النطاق المقفول 0 → 8).
function isHourLocked(hour, lockHour, openHour) {
    if (lockHour === openHour) return false;
    if (lockHour < openHour) {
        return hour >= lockHour && hour < openHour;
    }
    return hour >= lockHour || hour < openHour;
}

async function tickLockSchedule(db) {
    for (const groupID of Object.keys(db)) {
        const cfg = db[groupID]?.schedule;
        if (!cfg?.enabled) continue;

        const sock = getSockForGroup(groupID);
        if (!sock) continue; // لسه معندناش أي بوت شاف رسالة من الجروب ده يبقى نعرف نستخدمه

        const hour = new Date().getHours();
        const shouldBeLocked = isHourLocked(hour, cfg.lockHour, cfg.openHour);
        const targetState = shouldBeLocked ? "locked" : "open";
        if (cfg.lastState === targetState) continue;

        try {
            await sock.groupSettingUpdate(groupID, shouldBeLocked ? "announcement" : "not_announcement");
            cfg.lastState = targetState;
            await sock.sendMessage(groupID, {
                text: shouldBeLocked
                    ? `🔒 تم قفل الجروب تلقائيًا حسب الجدولة (هيفتح الساعة ${cfg.openHour}:00).`
                    : `🔓 تم فتح الجروب تلقائيًا حسب الجدولة (هيقفل الساعة ${cfg.lockHour}:00).`
            });
        } catch (e) {
            console.error(`❌ تعذر تنفيذ جدولة القفل/الفتح لجروب ${groupID}:`, e.message);
        }
    }
}

async function tickWeeklyStats(db, stats) {
    const now = new Date();
    // بنبعت الملخص مرة واحدة بس كل أسبوع: يوم الجمعة الساعة 8 بالليل (وقت السيرفر).
    if (now.getDay() !== 5 || now.getHours() !== 20) return;

    const weekKey = getWeekKey(now);

    for (const groupID of Object.keys(db)) {
        const cfg = db[groupID]?.weeklyStats;
        if (!cfg?.enabled) continue;
        if (cfg.lastSentWeek === weekKey) continue;

        const sock = getSockForGroup(groupID);
        if (!sock) continue;

        const groupStats = stats[groupID] || {};
        const entries = Object.keys(groupStats)
            .map(jid => ({ jid, count: groupStats[jid]?.weekly?.[weekKey] || 0 }))
            .filter(e => e.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        cfg.lastSentWeek = weekKey; // بنسجلها حتى لو مفيش نشاط، عشان منحاولش نبعت تاني النهاردة

        if (entries.length === 0) continue;

        let msg = `📊 *ملخص نشاط الجروب الأسبوعي*\n━━━━━━━━━━━━━━━━━━\n`;
        entries.forEach((e, i) => {
            msg += `${i + 1}. @${e.jid.split("@")[0]} — ${e.count.toLocaleString()} رسالة\n`;
        });
        msg += `━━━━━━━━━━━━━━━━━━\n💪 استمروا في التفاعل!`;

        try {
            await sock.sendMessage(groupID, { text: msg, mentions: entries.map(e => e.jid) });
        } catch (e) {
            console.error(`❌ تعذر إرسال الإحصائيات الأسبوعية لجروب ${groupID}:`, e.message);
        }
    }
}

let started = false;

// 💾 [ 1.5 نسخ احتياطي تلقائي لقاعدة البيانات ] ---------------------------------
// كل 24 ساعة، بنعمل نسخة من database.json و stats.json بتاريخ في اسم الملف،
// وبنحتفظ بآخر 7 نسخ بس (بنمسح الأقدم). لو فيه مالك متسجل (owner JID) وsock
// متاح لأي جروب، بنحاول نبعتله النسخة كملف في الخاص (اختياري، ومفيش مشكلة لو فشل).
const BACKUP_DIR = path.join(process.cwd(), "backups");
const MAX_BACKUPS = 7;

function dateStamp(d = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function tickBackup(db, stats, { ownerJid } = {}) {
    try {
        if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

        const stamp = dateStamp();
        const dbBackupPath = path.join(BACKUP_DIR, `database-${stamp}.json`);
        const statsBackupPath = path.join(BACKUP_DIR, `stats-${stamp}.json`);

        // متعملش نسخة تانية لو خدنا نسخة النهاردة أصلاً
        if (fs.existsSync(dbBackupPath)) return;

        fs.writeFileSync(dbBackupPath, JSON.stringify(db, null, 2));
        fs.writeFileSync(statsBackupPath, JSON.stringify(stats, null, 2));
        console.log(`💾 تم عمل نسخة احتياطية: database-${stamp}.json`);

        // 🧹 نحتفظ بآخر 7 نسخ بس (لكل ملف لوحده) ونمسح الأقدم
        for (const prefix of ["database-", "stats-"]) {
            const files = fs.readdirSync(BACKUP_DIR)
                .filter(f => f.startsWith(prefix) && f.endsWith(".json"))
                .sort(); // الأسماء فيها تاريخ ISO فبترتب زمنيًا أوتوماتيك
            while (files.length > MAX_BACKUPS) {
                const oldest = files.shift();
                try { fs.unlinkSync(path.join(BACKUP_DIR, oldest)); } catch (e) { /* تجاهل */ }
            }
        }

        // 📤 اختياري: بعت النسخة للمالك في الخاص لو عندنا sock وجروب مشترك معاه
        if (ownerJid) {
            const sock = getSockForGroup([...groupSockMap.keys()][0]) || null;
            if (sock) {
                await sock.sendMessage(ownerJid, {
                    document: fs.readFileSync(dbBackupPath),
                    fileName: `database-${stamp}.json`,
                    mimetype: "application/json"
                }).catch(() => {});
            }
        }
    } catch (e) {
        console.error("❌ خطأ في تيك النسخ الاحتياطي:", e.message);
    }
}

// 🏆 [ 2.4 بطولة PVP أسبوعية ] ---------------------------------------------------
// نفس توقيت الإحصائيات الأسبوعية (الجمعة 8 بالليل)، بيعلن أعلى 3 لاعبين حسب
// db[groupID].pvpWeekly[weekKey] (بيتسجل من core/messageHandler.js عند كل فوز PVP)
async function tickPvpTournament(db) {
    const now = new Date();
    if (now.getDay() !== 5 || now.getHours() !== 20) return;

    const weekKey = getWeekKey(now);

    for (const groupID of Object.keys(db)) {
        const cfg = db[groupID]?.pvpTournament;
        if (!cfg?.enabled) continue;
        if (cfg.lastAnnouncedWeek === weekKey) continue;

        const sock = getSockForGroup(groupID);
        if (!sock) continue;

        cfg.lastAnnouncedWeek = weekKey;

        const weekData = db[groupID]?.pvpWeekly?.[weekKey] || {};
        const ranking = Object.entries(weekData)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        if (ranking.length === 0) continue;

        const rewards = [5000, 3000, 1000];
        let msg = `🏆 *بطولة الـ PVP الأسبوعية* 🏆\n━━━━━━━━━━━━━━━━━━\n`;
        ranking.forEach(([jid, wins], i) => {
            const reward = rewards[i] || 0;
            db[jid] ??= { gold: 0 };
            db[jid].gold = (db[jid].gold || 0) + reward;
            msg += `${i + 1}. @${jid.split("@")[0]} — ${wins} انتصار 🏅 +${reward.toLocaleString()} ذهبة\n`;
        });
        msg += `━━━━━━━━━━━━━━━━━━`;

        try {
            await sock.sendMessage(groupID, { text: msg, mentions: ranking.map(([jid]) => jid) });
        } catch (e) {
            console.error(`❌ تعذر إعلان بطولة PVP لجروب ${groupID}:`, e.message);
        }
    }
}

// 📉 [ 3.3 تنبيه انخفاض النشاط ] --------------------------------------------------
// بنقارن عدد رسائل الأسبوع الحالي بمتوسط آخر 4 أسابيع اللي قبله، ولو في انخفاض
// حاد (أكتر من 50%) بنبعت تنبيه للأدمن. بتشتغل في نفس تيك الإحصائيات الأسبوعية.
async function tickActivityAlert(db, stats) {
    const now = new Date();
    if (now.getDay() !== 5 || now.getHours() !== 20) return;

    const weekKey = getWeekKey(now);
    const pastWeekKeys = [];
    for (let i = 1; i <= 4; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        pastWeekKeys.push(getWeekKey(d));
    }

    for (const groupID of Object.keys(db)) {
        const cfg = db[groupID]?.activityAlert ?? { enabled: true };
        if (cfg.enabled === false) continue;
        if (cfg.lastCheckedWeek === weekKey) continue;
        cfg.lastCheckedWeek = weekKey;
        db[groupID].activityAlert = cfg;

        const sock = getSockForGroup(groupID);
        if (!sock) continue;

        const groupStats = stats[groupID] || {};
        const totalForWeek = (wk) => Object.values(groupStats)
            .reduce((sum, u) => sum + (u?.weekly?.[wk] || 0), 0);

        const currentTotal = totalForWeek(weekKey);
        const pastTotals = pastWeekKeys.map(totalForWeek).filter(t => t > 0);
        if (pastTotals.length === 0) continue;

        const avgPast = pastTotals.reduce((a, b) => a + b, 0) / pastTotals.length;
        if (avgPast === 0) continue;

        const dropRatio = 1 - (currentTotal / avgPast);
        if (dropRatio > 0.5) {
            try {
                const groupMeta = await sock.groupMetadata(groupID).catch(() => null);
                const admins = groupMeta?.participants?.filter(p => p.admin).map(p => p.id) || [];
                await sock.sendMessage(groupID, {
                    text: `📉 *تنبيه انخفاض نشاط*\nنشاط الجروب الأسبوع ده (${currentTotal} رسالة) قل بنسبة ${Math.round(dropRatio * 100)}% عن متوسط الأسابيع اللي فاتت (${Math.round(avgPast)} رسالة تقريبًا).`,
                    mentions: admins
                });
            } catch (e) {
                console.error(`❌ تعذر إرسال تنبيه انخفاض النشاط لجروب ${groupID}:`, e.message);
            }
        }
    }
}

// 📅 [ 4.3 رسائل مجدولة ] ---------------------------------------------------------
// كل دقيقة، بنفحص db.scheduledMessages ونبعت أي رسالة وصل وقتها، وبعدين بنحذفها.
async function tickScheduledMessages(db) {
    if (!Array.isArray(db.scheduledMessages) || db.scheduledMessages.length === 0) return;
    const now = Date.now();
    const remaining = [];

    for (const item of db.scheduledMessages) {
        if (item.time <= now) {
            const sock = getSockForGroup(item.groupID);
            if (sock) {
                try {
                    await sock.sendMessage(item.groupID, { text: item.text });
                } catch (e) {
                    console.error(`❌ تعذر إرسال رسالة مجدولة لجروب ${item.groupID}:`, e.message);
                }
            }
            // لو معندناش sock للجروب ده لسه، بنسيبها تحاول تاني الدقيقة الجاية بدل ما نضيعها
            if (sock) continue;
        }
        remaining.push(item);
    }
    db.scheduledMessages = remaining;
}

// 🎂 [ 6.2 تهنئة أعياد الميلاد ] ---------------------------------------------------
// تيك يومي (بنفحصه كل ساعة بس بنشتغل مرة واحدة بس في اليوم عند الساعة 9 الصبح)
async function tickBirthdays(db) {
    const now = new Date();
    if (now.getHours() !== 9) return;

    const todayKey = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const todayDateKey = dateStamp(now);

    const birthdayPlayers = Object.keys(db).filter(jid =>
        jid.endsWith("@s.whatsapp.net") && db[jid]?.birthday === todayKey
    );
    if (birthdayPlayers.length === 0) return;

    for (const groupID of Object.keys(db)) {
        if (!groupID.endsWith("@g.us")) continue;
        if (db[groupID]?.birthdaysAnnouncedOn === todayDateKey) continue;

        const sock = getSockForGroup(groupID);
        if (!sock) continue;

        let groupMembers = [];
        try {
            const meta = await sock.groupMetadata(groupID);
            groupMembers = meta?.participants?.map(p => p.id) || [];
        } catch (e) { continue; }

        const celebrants = birthdayPlayers.filter(jid => groupMembers.includes(jid));
        if (celebrants.length === 0) continue;

        db[groupID].birthdaysAnnouncedOn = todayDateKey;
        try {
            await sock.sendMessage(groupID, {
                text: `🎂 *النهارده عيد ميلاد:*\n${celebrants.map(j => `🎉 @${j.split("@")[0]}`).join("\n")}\n\nكل سنة وانتوا طيبين! 🥳`,
                mentions: celebrants
            });
        } catch (e) {
            console.error(`❌ تعذر إرسال تهنئة الميلاد لجروب ${groupID}:`, e.message);
        }
    }
}

// بتتنادى مرة واحدة بس (من index.js) عشان تشغّل التيكات الدورية. آمنة تتنادى أكتر من
// مرة بالغلط بفضل الـ started flag.
function startScheduler(db, stats, options = {}) {
    if (started) return;
    started = true;

    // كل دقيقة: نفحص جدولة قفل/فتح الجروبات + الرسائل المجدولة
    setInterval(() => {
        tickLockSchedule(db).catch(e => console.error("❌ خطأ في تيك جدولة القفل/الفتح:", e.message));
        tickScheduledMessages(db).catch(e => console.error("❌ خطأ في تيك الرسائل المجدولة:", e.message));
    }, 60 * 1000);

    // كل ساعة: نفحص هل وقت الإحصائيات الأسبوعية/بطولة PVP/تنبيه النشاط/أعياد الميلاد جه
    setInterval(() => {
        tickWeeklyStats(db, stats).catch(e => console.error("❌ خطأ في تيك الإحصائيات الأسبوعية:", e.message));
        tickPvpTournament(db).catch(e => console.error("❌ خطأ في تيك بطولة PVP:", e.message));
        tickActivityAlert(db, stats).catch(e => console.error("❌ خطأ في تيك تنبيه انخفاض النشاط:", e.message));
        tickBirthdays(db).catch(e => console.error("❌ خطأ في تيك أعياد الميلاد:", e.message));
    }, 60 * 60 * 1000);

    // كل 24 ساعة: نسخة احتياطية من قاعدة البيانات
    setInterval(() => {
        tickBackup(db, stats, options).catch(e => console.error("❌ خطأ في تيك النسخ الاحتياطي:", e.message));
    }, 24 * 60 * 60 * 1000);
    // وناخد نسخة أول مرة بعد دقيقة من التشغيل (متستناش يوم كامل)
    setTimeout(() => {
        tickBackup(db, stats, options).catch(e => console.error("❌ خطأ في تيك النسخ الاحتياطي:", e.message));
    }, 60 * 1000);

    console.log("⏰ نظام الجدولة (قفل/فتح، إحصائيات أسبوعية، بطولة PVP، نسخ احتياطي، رسائل مجدولة، أعياد ميلاد) شغال.");
}

module.exports = {
    recordGroupSock,
    getSockForGroup,
    isHourLocked,
    startScheduler
};
