// ============================================================
//  نِظَامُ الْفِئَاتِ (مُحَارِبٌ ⚔️  ⇄  مُغْتَالٌ 🥷  ⇄  رَامِي 🏹)
//  ملف موحد: كل أرقام التوازن والشروط هنا فقط. أي تعديل
//  على الشروط أو القوة يتم من هنا وينعكس على كل الأوامر.
//
//  فكرة التوازن (مثلث عادل):
//   - المغتال قوي في الظل ضد المحارب (كريتيكال + اغتيال مباشر).
//   - الرامي قوي في كشف/مقاومة كمائن المغتال (عين الصقر).
//   - المحارب قوي في المواجهة المباشرة ضد الرامي (بيقفل عليه بسرعة).
//  كل ميزة بسيطة وصغيرة، مفيش فئة "تفوق" على الباقي بشكل مطلق.
// ============================================================

const CLASSES = {
    WARRIOR: 'محارب',
    ASSASSIN: 'مغتال',
    ARCHER: 'رامي'
};

// ============================================================
// [ 1 ] المغتال 🥷 - فئة سرّية
// ============================================================

const ASSASSIN_REQUIREMENTS = {
    wins: 6,        // عدد انتصارات المواجهة (PvP) المطلوبة
    gold: 20000,    // أقل رصيد ذهب يلزم الوصول له مرة واحدة على الأقل
    itemId: '19'    // "خنجر مسموم 🗡️" - لازم يشتريه مرة واحدة على الأقل
};

const REQ_LABELS = {
    wins: `⚔️ تحقيق *${ASSASSIN_REQUIREMENTS.wins}* انتصارات في المواجهات (PvP)`,
    gold: `💰 امتلاك *${ASSASSIN_REQUIREMENTS.gold.toLocaleString()}* ذهب في أي وقت`,
    itemId: `🗡️ شراء *الخنجر المسموم* (.شراء ${ASSASSIN_REQUIREMENTS.itemId}) من المتجر`
};

const ASSASSIN_STAT_MULT = { atk: 1.10, def: 0.90 };
const ASSASSIN_CRIT_CHANCE = 0.15;
const ASSASSIN_CRIT_BONUS = 0.30;

const AMBUSH_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const AMBUSH_BASE_CHANCE = 0.495; // كانت 0.55، اتخفضت 10% عشان تبقى أصعب
const AMBUSH_STEAL_PCT = 0.15;
const AMBUSH_STEAL_CAP = 50000;
const AMBUSH_FAIL_PENALTY_PCT = 0.10;

const ASSASSIN_RANKS = [
    { key: 'legend', min: 15, label: 'مغتال أسطوري 🥷👑', reward: 40000 },
    { key: 'pro', min: 5, label: 'مغتال محترف 🥷⚔️', reward: 15000 },
    { key: 'novice', min: 0, label: 'مغتال مبتدئ 🥷', reward: 5000 }
];

const NEW_PLAYER_PROTECTION_MS = 24 * 60 * 60 * 1000;

const DEFLECT_COOLDOWN_MS = 3 * 60 * 60 * 1000;
const DEFLECT_WINDOW_MS = 30 * 60 * 1000;

const STEAL_TAX_PCT = 0.05;

// ============================================================
// [ ضرائب المملكة ] - تُستخدم في .تحويل و.ضريبة و.تبرع (خزينة العصابة)
// ============================================================
// ضريبة التحويل المباشر بين اللاعبين (كانت 6.5%، تم رفعها لتقليل
// الفرق مع تجميد الأموال في خزائن العصابات)
const TRANSFER_TAX_PCT = 0.12;

// ضريبة على التبرع لخزينة العصابة. قبل كده التبرع كان بدون أي ضريبة
// فكان بيتستخدم كثغرة للتهرب من ضريبة التحويل (تبرع لعصابة بدل تحويل مباشر)
const GANG_DONATION_TAX_PCT = 0.08;

// مدة الانتظار بين كل "تطور" و"تطور" تاني، عشان تمنع تكديس نقاط
// الهجوم/الدفاع بالسبام (كانت بدون أي كولداون خالص وده كان بيكسر توازن
// المواجهات/الكمائن لأي حد يمتلك ذهب كفاية)
const UPGRADE_COOLDOWN_MS = 10 * 60 * 1000; // 10 دقايق

const REVEAL_COOLDOWN_MS = 60 * 60 * 1000;
const REVEAL_WRONG_PENALTY = 3000;

const REPENT_COST = 15000;

// اللاعب اللي اتغتال بنجاح يبقى "مكشوف الأثر" لفترة قصيرة، وفرصة نجاح
// أي كمين تاني عليه بتزيد شوية (بيمنع "أمان دائم" بعد أول ضربة فقط ومايشجعش الزنّ المستمر).
const RECENTLY_AMBUSHED_WINDOW_MS = 60 * 60 * 1000; // ساعة
const RECENTLY_AMBUSHED_BONUS = 0.15;

// حد أقصى لعدد مرات اغتيال نفس الشخص في نفس اليوم (يمنع الملاحقة المزعجة)
const DAILY_AMBUSH_LIMIT_PER_TARGET = 2;

// مهمة أسبوعية للمغتال: كمّل عدد اغتيالات ناجحة معينة وخد مكافأة
const WEEKLY_QUEST_TARGET = 3;
const WEEKLY_QUEST_REWARD = 10000;

// تحالف مؤقت بين مغتالين
const ALLIANCE_BONUS = 0.10;                 // زيادة فرصة نجاح لو الشريك ضرب نفس الهدف مؤخراً
const ALLIANCE_WINDOW_MS = 15 * 60 * 1000;   // "مؤخراً" يعني خلال كام دقيقة
const ALLIANCE_REQUEST_TTL_MS = 10 * 60 * 1000; // مدة صلاحية طلب التحالف

// ============================================================
// [ 2 ] الرامي 🏹 - فئة علنية (مش سرّية زي المغتال)
// ============================================================

const ARCHER_REQUIREMENTS = {
    hunts: 15,      // عدد مرات الصيد المطلوبة (خبرة ودقة)
    gold: 12000,
    itemId: '106'   // "قوس الصياد الطويل 🏹"
};

const ARCHER_REQ_LABELS = {
    hunts: `🏹 إتمام *${ARCHER_REQUIREMENTS.hunts}* عملية صيد (.صيد)`,
    gold: `💰 امتلاك *${ARCHER_REQUIREMENTS.gold.toLocaleString()}* ذهب في أي وقت`,
    itemId: `🎯 شراء *قوس الصياد الطويل* (.شراء ${ARCHER_REQUIREMENTS.itemId}) من المتجر`
};

const ARCHER_STAT_MULT = { atk: 1.08, def: 0.95 };
const ARCHER_CRIT_CHANCE = 0.12;   // "ضربة دقيقة"
const ARCHER_CRIT_BONUS = 0.25;

// ميزة الرامي ضد المغتال: عين صقر بتقلل فرصة نجاح أي كمين عليه إضافياً
const ARCHER_ANTI_AMBUSH_BONUS = 0.15;

// ميزة المحارب ضد الرامي: بيقفل عليه بسرعة في المواجهة المباشرة
const WARRIOR_VS_ARCHER_BONUS = 0.10;

// أمر الرامي الحصري: رشقة سهام توهن الخصم مؤقتاً
const VOLLEY_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const VOLLEY_BASE_CHANCE = 0.60;
const VOLLEY_FAIL_PENALTY_PCT = 0.08;
const WEAKEN_WINDOW_MS = 20 * 60 * 1000;
const WEAKEN_PCT = 0.15; // تقليل قوة الخصم المؤقت في المواجهات

// حماية اللاعبين اللي بيطوروا دفاعهم - إشعار عند تخطي عتبات معينة
const DEFENSE_MILESTONES = [50, 150, 300];

// ============================================================
// [ 3 ] دوال عامة مشتركة
// ============================================================

function getDefenseResistance(targetDefense) {
    const def = Math.max(0, targetDefense || 0);
    const raw = def / (def + 300);
    return Math.min(0.7, raw);
}

function getUserClass(user) {
    return (user && user.class) || CLASSES.WARRIOR;
}

function isAssassin(user) { return getUserClass(user) === CLASSES.ASSASSIN; }
function isArcher(user) { return getUserClass(user) === CLASSES.ARCHER; }
function isWarrior(user) { return getUserClass(user) === CLASSES.WARRIOR; }

// لقب معروض حسب الفئة. المغتال بس هو الفئة السرّية.
function classTitle(user) {
    const cls = getUserClass(user);
    if (cls === CLASSES.ASSASSIN) {
        return user && user.revealed ? '🥷 مغتال (مكشوف)' : '⚔️ محارب';
    }
    if (cls === CLASSES.ARCHER) return '🏹 رامي';
    return '⚔️ محارب';
}

function classEmoji(user) {
    const cls = getUserClass(user);
    if (cls === CLASSES.ASSASSIN) return (user && user.revealed) ? '🥷' : '⚔️';
    if (cls === CLASSES.ARCHER) return '🏹';
    return '⚔️';
}

// ============================================================
// [ 4 ] مسار التحول للمغتال
// ============================================================

function checkAssassinProgress(db, jid) {
    const user = db[jid];
    if (!user || isAssassin(user)) return [];

    user.assassinReq = user.assassinReq || { wins: false, gold: false, itemId: false };
    const req = user.assassinReq;
    const newlyCompleted = [];

    if (!req.wins && (user.pvpWins || 0) >= ASSASSIN_REQUIREMENTS.wins) {
        req.wins = true;
        newlyCompleted.push('wins');
    }
    if (!req.gold && (user.gold || 0) >= ASSASSIN_REQUIREMENTS.gold) {
        req.gold = true;
        newlyCompleted.push('gold');
    }
    if (!req.itemId && user.boughtPoisonDagger) {
        req.itemId = true;
        newlyCompleted.push('itemId');
    }

    return newlyCompleted;
}

function isAssassinEligible(db, jid) {
    const user = db[jid];
    if (!user) return false;
    checkAssassinProgress(db, jid);
    const req = user.assassinReq || {};
    return !!(req.wins && req.gold && req.itemId);
}

function buildRequirementsMessage(user) {
    const req = user.assassinReq || { wins: false, gold: false, itemId: false };
    let msg = `🥷 *طريق التحول إلى مُغتال* 🥷\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `لازم تستوفي الشروط التالية كاملةً:\n\n`;
    for (const key of ['wins', 'gold', 'itemId']) {
        msg += `${req[key] ? '✅' : '❌'} ${REQ_LABELS[key]}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📌 حالتك الآن:\n`;
    msg += `   • انتصارات PvP: ${user.pvpWins || 0}/${ASSASSIN_REQUIREMENTS.wins}\n`;
    msg += `   • الذهب: ${(user.gold || 0).toLocaleString()}/${ASSASSIN_REQUIREMENTS.gold.toLocaleString()}\n`;
    msg += `   • الخنجر المسموم: ${user.boughtPoisonDagger ? 'تم شراؤه ✅' : 'لسه ما اشتريتوش ❌'}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `⚔️ ابعت *.مغتال* تاني بعد ما تخلص كل الشروط عشان تتحول فورًا.`;
    return msg;
}

async function notifyIfProgressed(sock, db, jid, chatId) {
    try {
        const user = db[jid];
        if (!user || isAssassin(user)) return;
        const newly = checkAssassinProgress(db, jid);
        if (newly.length === 0) return;

        let msg = `🥷 *تحديث تقدم @${jid.split("@")[0]} نحو المغتال* 🥷\n━━━━━━━━━━━━━━━━━━━━\n`;
        newly.forEach(key => { msg += `✅ تم الانتهاء من مهمة: ${REQ_LABELS[key]}\n`; });
        const req = user.assassinReq;
        const remaining = ['wins', 'gold', 'itemId'].filter(k => !req[k]);
        if (remaining.length > 0) {
            msg += `\n📋 الباقي:\n`;
            remaining.forEach(key => { msg += `❌ ${REQ_LABELS[key]}\n`; });
        } else {
            msg += `\n🎉 استوفيت كل الشروط! ابعت *.مغتال* دلوقتي عشان تتحول فورًا.`;
        }
        await sock.sendMessage(chatId || jid, { text: msg, mentions: [jid] });
    } catch (e) {
        console.error('❌ تعذر إرسال إشعار تقدم المغتال:', e.message);
    }
}

function transformToAssassin(db, jid) {
    const user = db[jid];
    user.class = CLASSES.ASSASSIN;
    user.atk = Math.round((user.atk || 0) * ASSASSIN_STAT_MULT.atk);
    const currentDef = user.defense !== undefined ? user.defense : (user.def || 0);
    const newDef = Math.round(currentDef * ASSASSIN_STAT_MULT.def);
    if (user.defense !== undefined) user.defense = newDef; else user.def = newDef;
    return user;
}

function getAssassinRank(user) {
    const wins = (user && user.ambushWins) || 0;
    return ASSASSIN_RANKS.find(r => wins >= r.min) || ASSASSIN_RANKS[ASSASSIN_RANKS.length - 1];
}

function revertToWarrior(db, jid) {
    const user = db[jid];
    if (!user) return null;

    if (isAssassin(user)) {
        user.atk = Math.round((user.atk || 0) / ASSASSIN_STAT_MULT.atk);
        const currentDef = user.defense !== undefined ? user.defense : (user.def || 0);
        const restoredDef = Math.round(currentDef / ASSASSIN_STAT_MULT.def);
        if (user.defense !== undefined) user.defense = restoredDef; else user.def = restoredDef;
        user.revealed = false;
        user.assassinReq = { wins: false, gold: false, itemId: false };
        breakAllianceIfPartner(db, jid);
    } else if (isArcher(user)) {
        user.atk = Math.round((user.atk || 0) / ARCHER_STAT_MULT.atk);
        const currentDef = user.defense !== undefined ? user.defense : (user.def || 0);
        const restoredDef = Math.round(currentDef / ARCHER_STAT_MULT.def);
        if (user.defense !== undefined) user.defense = restoredDef; else user.def = restoredDef;
        user.archerReq = { hunts: false, gold: false, itemId: false };
    } else {
        return user; // أصلاً محارب، مفيش داعي لأي تعديل
    }

    user.class = CLASSES.WARRIOR;
    return user;
}

// ============================================================
// [ 5 ] مسار التحول للرامي
// ============================================================

function checkArcherProgress(db, jid) {
    const user = db[jid];
    if (!user || isArcher(user)) return [];

    user.archerReq = user.archerReq || { hunts: false, gold: false, itemId: false };
    const req = user.archerReq;
    const newlyCompleted = [];

    if (!req.hunts && (user.huntCount || 0) >= ARCHER_REQUIREMENTS.hunts) {
        req.hunts = true;
        newlyCompleted.push('hunts');
    }
    if (!req.gold && (user.gold || 0) >= ARCHER_REQUIREMENTS.gold) {
        req.gold = true;
        newlyCompleted.push('gold');
    }
    if (!req.itemId && user.boughtLongBow) {
        req.itemId = true;
        newlyCompleted.push('itemId');
    }

    return newlyCompleted;
}

function isArcherEligible(db, jid) {
    const user = db[jid];
    if (!user) return false;
    checkArcherProgress(db, jid);
    const req = user.archerReq || {};
    return !!(req.hunts && req.gold && req.itemId);
}

function buildArcherRequirementsMessage(user) {
    const req = user.archerReq || { hunts: false, gold: false, itemId: false };
    let msg = `🏹 *طريق التحول إلى رامي* 🏹\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `لازم تستوفي الشروط التالية كاملةً:\n\n`;
    for (const key of ['hunts', 'gold', 'itemId']) {
        msg += `${req[key] ? '✅' : '❌'} ${ARCHER_REQ_LABELS[key]}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📌 حالتك الآن:\n`;
    msg += `   • مرات الصيد: ${user.huntCount || 0}/${ARCHER_REQUIREMENTS.hunts}\n`;
    msg += `   • الذهب: ${(user.gold || 0).toLocaleString()}/${ARCHER_REQUIREMENTS.gold.toLocaleString()}\n`;
    msg += `   • قوس الصياد: ${user.boughtLongBow ? 'تم شراؤه ✅' : 'لسه ما اشتريتوش ❌'}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🏹 ابعت *.رامي* تاني بعد ما تخلص كل الشروط عشان تتحول فورًا.`;
    return msg;
}

async function notifyArcherIfProgressed(sock, db, jid, chatId) {
    try {
        const user = db[jid];
        if (!user || isArcher(user) || isAssassin(user)) return;
        const newly = checkArcherProgress(db, jid);
        if (newly.length === 0) return;

        let msg = `🏹 *تحديث تقدم @${jid.split("@")[0]} نحو الرامي* 🏹\n━━━━━━━━━━━━━━━━━━━━\n`;
        newly.forEach(key => { msg += `✅ تم الانتهاء من مهمة: ${ARCHER_REQ_LABELS[key]}\n`; });
        const req = user.archerReq;
        const remaining = ['hunts', 'gold', 'itemId'].filter(k => !req[k]);
        if (remaining.length > 0) {
            msg += `\n📋 الباقي:\n`;
            remaining.forEach(key => { msg += `❌ ${ARCHER_REQ_LABELS[key]}\n`; });
        } else {
            msg += `\n🎉 استوفيت كل الشروط! ابعت *.رامي* دلوقتي عشان تتحول فورًا.`;
        }
        await sock.sendMessage(chatId || jid, { text: msg, mentions: [jid] });
    } catch (e) {
        console.error('❌ تعذر إرسال إشعار تقدم الرامي:', e.message);
    }
}

function transformToArcher(db, jid) {
    const user = db[jid];
    user.class = CLASSES.ARCHER;
    user.atk = Math.round((user.atk || 0) * ARCHER_STAT_MULT.atk);
    const currentDef = user.defense !== undefined ? user.defense : (user.def || 0);
    const newDef = Math.round(currentDef * ARCHER_STAT_MULT.def);
    if (user.defense !== undefined) user.defense = newDef; else user.def = newDef;
    return user;
}

// ============================================================
// [ 6 ] ميكانيزمات ثانوية (صد، ضريبة، حماية، رتب، تحالف، توهين...)
// ============================================================

function isNewPlayerProtected(user) {
    if (!user || !user.registeredAt) return false;
    return (Date.now() - user.registeredAt) < NEW_PLAYER_PROTECTION_MS;
}

function hasActiveDeflect(user) {
    return !!(user && user.deflectActive && user.deflectExpiresAt && Date.now() < user.deflectExpiresAt);
}

function consumeDeflect(user) {
    if (!user) return;
    user.deflectActive = false;
    user.deflectExpiresAt = 0;
}

function splitStolenGold(amount) {
    const tax = Math.floor(amount * STEAL_TAX_PCT);
    return { net: amount - tax, tax };
}

function splitTransferGold(amount) {
    const tax = Math.floor(amount * TRANSFER_TAX_PCT);
    return { net: amount - tax, tax };
}

function splitGangDonation(amount) {
    const tax = Math.floor(amount * GANG_DONATION_TAX_PCT);
    return { net: amount - tax, tax };
}

function markRecentlyAmbushed(user) {
    if (!user) return;
    user.recentlyAmbushedUntil = Date.now() + RECENTLY_AMBUSHED_WINDOW_MS;
}

function isRecentlyAmbushed(user) {
    return !!(user && user.recentlyAmbushedUntil && Date.now() < user.recentlyAmbushedUntil);
}

function getDateKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function canAmbushTargetToday(attacker, targetJid) {
    const today = getDateKey();
    if (!attacker.dailyAmbushLog || attacker.dailyAmbushLog.date !== today) return true;
    return (attacker.dailyAmbushLog.targets[targetJid] || 0) < DAILY_AMBUSH_LIMIT_PER_TARGET;
}

function recordAmbushTarget(attacker, targetJid) {
    const today = getDateKey();
    if (!attacker.dailyAmbushLog || attacker.dailyAmbushLog.date !== today) {
        attacker.dailyAmbushLog = { date: today, targets: {} };
    }
    attacker.dailyAmbushLog.targets[targetJid] = (attacker.dailyAmbushLog.targets[targetJid] || 0) + 1;
}

function getWeekKey(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const weekNum = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return `${d.getUTCFullYear()}-W${weekNum}`;
}

// يُستدعى بعد كل اغتيال ناجح؛ بيرجع true لو المهمة الأسبوعية اتحققت الآن (أول مرة)
function checkWeeklyAmbushQuest(user) {
    const wk = getWeekKey();
    if (!user.weeklyAmbush || user.weeklyAmbush.week !== wk) {
        user.weeklyAmbush = { week: wk, count: 0, claimed: false };
    }
    user.weeklyAmbush.count += 1;
    if (!user.weeklyAmbush.claimed && user.weeklyAmbush.count >= WEEKLY_QUEST_TARGET) {
        user.weeklyAmbush.claimed = true;
        user.gold = (user.gold || 0) + WEEKLY_QUEST_REWARD;
        return true;
    }
    return false;
}

// تحالف مؤقت: بيتفعل بس لما الاتنين يبعتوا طلب متبادل، ومفيش أي رسالة
// بتأكد للمرسل إن الطرف التاني فعلاً مغتال لو مطابقتش الشروط (سرية).
function requestAlliance(db, callerJid, targetJid) {
    db.allianceRequests = db.allianceRequests || {};
    const now = Date.now();
    for (const k of Object.keys(db.allianceRequests)) {
        if (now - db.allianceRequests[k].time > ALLIANCE_REQUEST_TTL_MS) delete db.allianceRequests[k];
    }

    const existing = db.allianceRequests[targetJid];
    if (existing && existing.target === callerJid) {
        delete db.allianceRequests[targetJid];
        delete db.allianceRequests[callerJid];
        if (isAssassin(db[callerJid]) && isAssassin(db[targetJid])) {
            db[callerJid].allyJid = targetJid;
            db[targetJid].allyJid = callerJid;
            return 'formed';
        }
        return 'failed_silent';
    }

    db.allianceRequests[callerJid] = { target: targetJid, time: now };
    return 'pending';
}

function hasAllianceBonus(db, attacker, targetJid) {
    if (!attacker || !attacker.allyJid) return false;
    const ally = db[attacker.allyJid];
    if (!ally) return false;
    return !!(ally.lastAmbushTarget === targetJid &&
              ally.lastAmbush &&
              (Date.now() - ally.lastAmbush) < ALLIANCE_WINDOW_MS);
}

function breakAllianceIfPartner(db, jid) {
    const user = db[jid];
    if (user && user.allyJid) {
        const allyJid = user.allyJid;
        const ally = db[allyJid];
        if (ally) ally.allyJid = null;
        user.allyJid = null;
        return allyJid;
    }
    return null;
}

function applyWeaken(user) {
    if (!user) return;
    user.weakenedUntil = Date.now() + WEAKEN_WINDOW_MS;
}

function isWeakened(user) {
    return !!(user && user.weakenedUntil && Date.now() < user.weakenedUntil);
}

function getWeakenMultiplier(user) {
    return isWeakened(user) ? (1 - WEAKEN_PCT) : 1;
}

// إشعار خاص لمرة واحدة لما المحارب يوصل عتبة دفاع جديدة
function checkDefenseMilestones(user) {
    const def = user.defense !== undefined ? user.defense : (user.def || 0);
    user.defMilestones = user.defMilestones || {};
    const newlyReached = [];
    DEFENSE_MILESTONES.forEach(milestone => {
        if (def >= milestone && !user.defMilestones[milestone]) {
            user.defMilestones[milestone] = true;
            newlyReached.push(milestone);
        }
    });
    return newlyReached;
}

async function notifyDefenseMilestones(sock, jid, user, chatId) {
    try {
        const reached = checkDefenseMilestones(user);
        if (reached.length === 0) return;
        for (const milestone of reached) {
            const successAtBase = Math.round(AMBUSH_BASE_CHANCE * (1 - getDefenseResistance(milestone)) * 100);
            await sock.sendMessage(chatId || jid, {
                text: `🛡️ *تطور دفاعي!* 🛡️\n@${jid.split("@")[0]} دفاعه بقى ${milestone}+، وده قلل فرصة نجاح أي كمين عليه لحوالي ${successAtBase}% تقريباً.\nكمّل تطور دفاعك عشان تبقى أصعب هدف في المملكة!`,
                mentions: [jid]
            });
        }
    } catch (e) {
        console.error('❌ تعذر إرسال إشعار عتبة الدفاع:', e.message);
    }
}

// ============================================================
// [ 7 ] ضمان اكتمال بيانات أي لاعب
// ============================================================

function ensurePlayerDefaults(user) {
    if (!user) return user;
    if (user.class === undefined) user.class = CLASSES.WARRIOR;
    if (user.gold === undefined) user.gold = 0;
    if (user.atk === undefined) user.atk = 10;
    if (user.defense === undefined && user.def === undefined) user.defense = 5;
    if (user.level === undefined) user.level = 1;
    if (user.xp === undefined) user.xp = 0;
    if (user.hp === undefined) user.hp = 100;

    if (user.pvpWins === undefined) user.pvpWins = 0;
    if (user.boughtPoisonDagger === undefined) user.boughtPoisonDagger = false;
    if (!user.assassinReq) user.assassinReq = { wins: false, gold: false, itemId: false };

    if (user.huntCount === undefined) user.huntCount = 0;
    if (user.boughtLongBow === undefined) user.boughtLongBow = false;
    if (!user.archerReq) user.archerReq = { hunts: false, gold: false, itemId: false };

    if (user.registeredAt === undefined) user.registeredAt = 0;
    if (user.ambushWins === undefined) user.ambushWins = 0;
    if (user.revealed === undefined) user.revealed = false;
    if (user.deflectActive === undefined) user.deflectActive = false;
    if (user.deflectExpiresAt === undefined) user.deflectExpiresAt = 0;
    if (user.lastDeflectUsed === undefined) user.lastDeflectUsed = null;
    if (user.lastRevealAttempt === undefined) user.lastRevealAttempt = null;
    if (user.recentlyAmbushedUntil === undefined) user.recentlyAmbushedUntil = 0;
    if (!user.dailyAmbushLog) user.dailyAmbushLog = { date: getDateKey(), targets: {} };
    if (!user.weeklyAmbush) user.weeklyAmbush = { week: getWeekKey(), count: 0, claimed: false };
    if (user.allyJid === undefined) user.allyJid = null;
    if (user.lastAmbushTarget === undefined) user.lastAmbushTarget = null;
    if (user.weakenedUntil === undefined) user.weakenedUntil = 0;
    if (user.lastVolley === undefined) user.lastVolley = null;
    if (!user.defMilestones) user.defMilestones = {};
    return user;
}

module.exports = {
    CLASSES,

    ASSASSIN_REQUIREMENTS, REQ_LABELS, ASSASSIN_STAT_MULT, ASSASSIN_CRIT_CHANCE, ASSASSIN_CRIT_BONUS,
    AMBUSH_COOLDOWN_MS, AMBUSH_BASE_CHANCE, AMBUSH_STEAL_PCT, AMBUSH_STEAL_CAP, AMBUSH_FAIL_PENALTY_PCT,
    ASSASSIN_RANKS, NEW_PLAYER_PROTECTION_MS, DEFLECT_COOLDOWN_MS, DEFLECT_WINDOW_MS, STEAL_TAX_PCT,
    TRANSFER_TAX_PCT, GANG_DONATION_TAX_PCT, UPGRADE_COOLDOWN_MS, splitTransferGold, splitGangDonation,
    REVEAL_COOLDOWN_MS, REVEAL_WRONG_PENALTY, REPENT_COST,
    RECENTLY_AMBUSHED_WINDOW_MS, RECENTLY_AMBUSHED_BONUS, DAILY_AMBUSH_LIMIT_PER_TARGET,
    WEEKLY_QUEST_TARGET, WEEKLY_QUEST_REWARD, ALLIANCE_BONUS, ALLIANCE_WINDOW_MS, ALLIANCE_REQUEST_TTL_MS,

    ARCHER_REQUIREMENTS, ARCHER_REQ_LABELS, ARCHER_STAT_MULT, ARCHER_CRIT_CHANCE, ARCHER_CRIT_BONUS,
    ARCHER_ANTI_AMBUSH_BONUS, WARRIOR_VS_ARCHER_BONUS,
    VOLLEY_COOLDOWN_MS, VOLLEY_BASE_CHANCE, VOLLEY_FAIL_PENALTY_PCT, WEAKEN_WINDOW_MS, WEAKEN_PCT,
    DEFENSE_MILESTONES,

    getDefenseResistance, getUserClass, isAssassin, isArcher, isWarrior, classTitle, classEmoji,

    checkAssassinProgress, isAssassinEligible, buildRequirementsMessage, notifyIfProgressed,
    transformToAssassin, getAssassinRank, revertToWarrior,

    checkArcherProgress, isArcherEligible, buildArcherRequirementsMessage, notifyArcherIfProgressed,
    transformToArcher,

    isNewPlayerProtected, hasActiveDeflect, consumeDeflect, splitStolenGold,
    markRecentlyAmbushed, isRecentlyAmbushed,
    canAmbushTargetToday, recordAmbushTarget,
    checkWeeklyAmbushQuest,
    requestAlliance, hasAllianceBonus, breakAllianceIfPartner,
    applyWeaken, isWeakened, getWeakenMultiplier,
    checkDefenseMilestones, notifyDefenseMilestones,

    ensurePlayerDefaults
};
