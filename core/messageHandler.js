const {
    getDefenseResistance,
    isAssassin,
    isArcher,
    isWarrior,
    classTitle,
    ASSASSIN_CRIT_CHANCE,
    ASSASSIN_CRIT_BONUS,
    ARCHER_CRIT_CHANCE,
    ARCHER_CRIT_BONUS,
    WARRIOR_VS_ARCHER_BONUS,
    getWeakenMultiplier,
    notifyIfProgressed,
    ensurePlayerDefaults
} = require("../data/classSystem.js");
const fsForVoice = require("fs");
const { getWeekKey } = require("./utils.js");
const { recordGroupSock } = require("./scheduler.js");
const { checkAchievements } = require("../data/achievements.js");
const { buildCategoryListText, findSection, buildSectionText, isBackToMenuRequest } = require("../data/menuSections.js");

// 📜 [ سجل الأحداث (Audit Log) ] -----------------------------------------------
// بيسجل أي عملية إدارية حساسة (حذف رسالة، كتم، طرد، تفعيل/تعطيل ميزة) في
// db[groupID].auditLog عشان الأدمن يقدر يراجعها بأمر .سجل-الاحداث. بنحتفظ
// بآخر 200 حدث بس لكل جروب عشان الداتا بيس ما تكبرش من غير داعي.
function logAudit(db, groupID, action, by, target = null) {
    if (!groupID?.endsWith("@g.us")) return;
    db[groupID] ??= {};
    db[groupID].auditLog ??= [];
    db[groupID].auditLog.push({ action, by, target, at: Date.now() });
    if (db[groupID].auditLog.length > 200) {
        db[groupID].auditLog = db[groupID].auditLog.slice(-200);
    }
}

// 🌊 [ أنتي-فلود ] ---------------------------------------------------------------
// خريطة في الميموري (زي repeatTracker/recentGroupMessages) بتتبع رسائل كل عضو في
// كل جروب خلال آخر فترة زمنية، ولو تجاوز الحد المسموح بيتكتم تلقائيًا لمدة قصيرة.
const floodTracker = new Map(); // "groupID:sender" -> [timestamps]
const DEFAULT_ANTIFLOOD = { enabled: true, limit: 8, seconds: 10, muteMinutes: 1 };

function checkAntiFlood(db, groupID, sender) {
    const cfg = { ...DEFAULT_ANTIFLOOD, ...(db[groupID]?.antiFlood || {}) };
    if (!cfg.enabled) return false;

    const key = `${groupID}:${sender}`;
    const now = Date.now();
    const windowMs = cfg.seconds * 1000;
    const arr = (floodTracker.get(key) || []).filter(t => now - t < windowMs);
    arr.push(now);
    floodTracker.set(key, arr);

    if (arr.length > cfg.limit) {
        floodTracker.set(key, []); // منصفّرش العداد عشان مايتكررش الكتم كل رسالة
        db.muted ??= {};
        db.muted[groupID] ??= [];
        if (!db.muted[groupID].includes(sender)) {
            db.muted[groupID].push(sender);
            logAudit(db, groupID, "كتم تلقائي (أنتي-فلود)", "النظام", sender);
            setTimeout(() => {
                db.muted[groupID] = (db.muted[groupID] || []).filter(j => j !== sender);
            }, cfg.muteMinutes * 60 * 1000);
            return true;
        }
    }
    return false;
}

// 🚫 [ أنتي-منشن جماعي / أنتي-تاج-ستيكر ] -----------------------------------------
const DEFAULT_MENTION_LIMIT = 5;

// بيرجع عدد المنشنات (تاج) الموجودة في contextInfo بتاع أي رسالة (نص أو ستيكر)
function getMentionCount(m) {
    const ctx = m.message?.extendedTextMessage?.contextInfo
        || m.message?.stickerMessage?.contextInfo
        || m.message?.imageMessage?.contextInfo
        || m.message?.videoMessage?.contextInfo;
    return ctx?.mentionedJid?.length || 0;
}

// 🔗 نظام حماية الروابط: أي حاجة شكلها لينك واتساب جروب أو لينك عام (http/https/www)
const WHATSAPP_INVITE_REGEX = /chat\.whatsapp\.com\/[A-Za-z0-9]+/i;
const GENERIC_LINK_REGEX = /(https?:\/\/|www\.)\S+/i;

// 📎 نظام فلتر الميديا: تحويل نوع الرسالة الخام (imageMessage..) لاسم عربي مفهوم
const MEDIA_TYPE_LABELS = {
    imageMessage: "صور",
    videoMessage: "فيديو",
    stickerMessage: "ستيكرات",
    documentMessage: "مستندات",
    audioMessage: "صوت"
};

// 🏅 رتب التفاعل الافتراضية (لو الجروب معندوش رتب مخصصة) — بناءً على إجمالي عدد
// رسائل العضو المسجلة في stats.json لنفس الجروب
const DEFAULT_ACTIVITY_RANKS = [
    { threshold: 50, title: "🔥 عضو نشيط" },
    { threshold: 200, title: "⭐ نجم الجروب" },
    { threshold: 500, title: "👑 أسطورة الجروب" },
    { threshold: 1000, title: "🏆 إمبراطور التفاعل" }
];

// 🤖 كاشف "بوت تاني موجود في الجروب" — استدلالي مش مضمون 100%، لأن واتساب مفيش فيه
// أي علامة رسمية تقول إن الحساب ده بوت. اللي بنعمله: رصد سلوك شبيه بالبوتات
// (رد فوري جدًا بصيغة أمر، أو تكرار نفس الرسالة) وتنبيه الأدمن يراجع يدويًا،
// من غير أي طرد أو إجراء تلقائي.
const BOT_LIKE_PREFIXES = ["!", "/", "#", "$", "%", "+"];
const recentGroupMessages = new Map(); // groupID -> { lastSender, lastAt, lastText }
const repeatTracker = new Map(); // "groupID:sender" -> { lastText, count }

function trackSuspectedBot(db, groupID, sender, text) {
    const now = Date.now();
    const last = recentGroupMessages.get(groupID);
    recentGroupMessages.set(groupID, { lastSender: sender, lastAt: now, lastText: text });

    const reasons = [];

    if (last && last.lastSender !== sender && (now - last.lastAt) < 1500) {
        if (BOT_LIKE_PREFIXES.some(p => text.startsWith(p))) {
            reasons.push("رد فوري جدًا (أقل من ١.٥ ثانية) بصيغة أمر بوت");
        }
    }

    const repKey = `${groupID}:${sender}`;
    const rep = repeatTracker.get(repKey);
    if (rep && rep.lastText === text && text.length > 0) {
        rep.count += 1;
    } else {
        repeatTracker.set(repKey, { lastText: text, count: 1 });
    }
    if (repeatTracker.get(repKey).count >= 3) {
        reasons.push("إعادة إرسال نفس الرسالة بشكل متكرر");
    }

    if (reasons.length === 0) return null;

    db[groupID] ??= {};
    db[groupID].suspectedBots ??= {};
    const record = (db[groupID].suspectedBots[sender] ??= { hits: 0, reasons: [], notified: false, whitelisted: false });
    if (record.whitelisted) return null;

    record.hits += 1;
    record.reasons = Array.from(new Set([...record.reasons, ...reasons]));

    if (record.hits >= 3 && !record.notified) {
        return record;
    }
    return null;
}

// أرقام/معرّفات مستخرجة نظيفة من أي JID (بدون @s.whatsapp.net أو @g.us أو :device)
function extractPureNumber(jid) {
    return jid ? jid.toString().replace(/[@:].*/g, "") : "";
}

// بيرجع الرقم الحقيقي (s.whatsapp.net) بدل معرف الـ @lid، بـ3 محاولات بالترتيب:
// 1) altJid (participantPn/participantAlt) لو Baileys قدمهولنا مباشرة — ده بيشتغل غالبًا
//    مع sender الرسالة الحالية بس، مش مع contextInfo.participant بتاع رسالة اتعمل عليها
//    ريبلاي (Baileys لسه معندوش حل لده في الحالة دي — https://github.com/WhiskeySockets/Baileys/issues/1667).
// 2) lidMap: خريطة دايمة (db.lidMap) بنبنيها إحنا بنفسنا في createMessageHandler كل ما حد
//    يبعت أي رسالة، عشان نفتكر الربط بين اللِد ورقمه الحقيقي حتى لو خصوصية رقمه شغالة.
//    دي أوثق مصدر بعد altJid، لأنها متسجلة من رسالة حقيقية بعتها الشخص ده بنفسه.
// 3) لو معندناش أي من الاتنين، وعندنا groupMetadata (نتيجة sock.groupMetadata)، ندور على
//    العضو في قايمة participants اللي id أو lid بتاعه يساوي الـ lid الخام، ونرجع phoneNumber
//    بتاعه — ده أضعف مصدر لأن phoneNumber مش دايمًا موجود (بيعتمد على إعداد خصوصية الرقم
//    بتاع الشخص المستهدف نفسه، مش خصوصيتنا إحنا).
// لو الكل فشل، بترجع الـ JID زي ما هو.
function resolveRealJid(rawJid, altJid, groupMetadata, lidMap) {
    if (!rawJid?.endsWith("@lid")) return rawJid;
    if (altJid) return altJid;
    if (lidMap && lidMap[rawJid]) return lidMap[rawJid];
    if (groupMetadata?.participants) {
        const match = groupMetadata.participants.find(
            p => p.id === rawJid || p.lid === rawJid
        );
        if (match?.phoneNumber) return match.phoneNumber;
    }
    return rawJid;
}

// 🎯 دالة موحدة لتحديد "الهدف" (Target) لأي أمر بيقبل منشن أو ريبلاي، بترتيب أولوية:
// 1) منشن (@شخص) داخل نص الأمر نفسه.
// 2) رد (ريبلاي) على رسالة شخص تاني.
// 3) لو مفيش منشن ولا ريبلاي، وبعتنالها sender في options.fallbackTo، بترجعه هو.
// وبتحل أي @lid لرقمه الحقيقي بنفس منطق resolveRealJid (altJid → lidMap → groupMetadata)،
// وكمان بترجع للِد الخام كخطة أخيرة لو مالقتش حل بس فيه بيانات مسجلة فعلاً تحته في db.
function resolveTargetJid(m, db, groupMetadata, options = {}) {
    const { fallbackTo = null } = options;
    const contextInfo = m.message?.extendedTextMessage?.contextInfo;

    const mentionedRaw = contextInfo?.mentionedJid?.[0];
    if (mentionedRaw) {
        const resolved = resolveRealJid(mentionedRaw, null, groupMetadata, db?.lidMap);
        if (db && !db[resolved] && db[mentionedRaw]) return mentionedRaw;
        return resolved;
    }

    const quotedRaw = contextInfo?.participant;
    if (quotedRaw) {
        const resolved = resolveRealJid(quotedRaw, contextInfo?.participantPn || contextInfo?.participantAlt, groupMetadata, db?.lidMap);
        if (db && !db[resolved] && db[quotedRaw]) return quotedRaw;
        return resolved;
    }

    return fallbackTo;
}

// 🧩 بيستبدل المتغيرات ($user, $username, $name, $group) جوه نص رسالة ترحيب/وداع بقيمها الفعلية.
// $user → منشن (تاج) للعضو، $username → رقمه لو مفيش اسم متسجل، $name → اسمه المسجل في
// اللعبة لو موجود (وإلا بيرجع لنفس حاجة username)، $group → اسم الجروب.
function renderGroupTemplate(template, { userJid, db, groupName }) {
    const registeredName = db?.[userJid]?.name;
    const fallbackName = userJid.split("@")[0];
    return template
        .replace(/\$user/g, `@${fallbackName}`)
        .replace(/\$username/g, fallbackName)
        .replace(/\$name/g, registeredName || fallbackName)
        .replace(/\$group/g, groupName || "");
}

const DEFAULT_WELCOME_MESSAGE = "🌟 أهلاً بيك يا $user في مملكة *$group*!\nيلا سجل معانا بـ .لاعب-جديد وابدأ مغامرتك ⚔️";
const DEFAULT_FAREWELL_MESSAGE = "👋 $user غادر مملكة *$group*... نتمنى نشوفه تاني قريب.";

// 🛡️ بيتحقق إن جي آي دي معين (sender) أدمن في الجروب، بمطابقة مرنة بتتعامل مع مشكلة
// الـ @lid (نفس المشكلة اللي resolveRealJid بتحلها): ممكن سجل العضو في groupMetadata.participants
// يكون بصيغة @lid بينما الـ sender عندنا بقى محلول لرقمه الحقيقي (أو العكس)، فبنقارن
// بكل الاحتمالات المتاحة بدل ما نعتمد على تطابق نصي واحد بس.
function isParticipantAdmin(groupMetadata, jid, db) {
    if (!groupMetadata?.participants || !jid) return false;
    return groupMetadata.participants.some(p => {
        if (!p.admin) return false;
        if (p.id === jid || p.lid === jid) return true;
        if (db?.lidMap) {
            if (p.id?.endsWith("@lid") && db.lidMap[p.id] === jid) return true;
            if (p.lid?.endsWith("@lid") && db.lidMap[p.lid] === jid) return true;
        }
        return false;
    });
}

// --- [ الأوامر الممنوعة تمامًا على أي بوت فرعي (تنصيب)، حتى لو مش جوه فولدر admin/owners ] ---
// ده تحديدًا عشان مايبقاش فيه ثغرة يعمل بيها البوت الفرعي بوت فرعي تاني من عنده (تنصيب متسلسل).
const BLOCKED_COMMANDS_FOR_SUBBOTS = ["تنصيب", "تنصيب-فتح", "تنصيب-قفل", "تنصيب-حذف"];

// أي أمر متحمل من فولدر admin أو owners ممنوع تمامًا على البوتات الفرعية
const BLOCKED_DIRS_FOR_SUBBOTS = ["admin", "owners"];

/**
 * بيرجع دالة الاستماع للرسائل (messages.upsert) جاهزة للتركيب على أي sock،
 * سواء البوت الأساسي أو أي بوت فرعي (تنصيب).
 *
 * options:
 *   - db, stats: نفس الداتا بيس والإحصائيات (بالمرجع، مشتركة بين كل البوتات)
 *   - commands: الـ Map بتاعة كل الأوامر المحمّلة
 *   - ownerIds: مصفوفة أرقام المالكين (بتتجاهل تمامًا لو restricted = true)
 *   - restricted: لو true، البوت ده "فرعي" (تنصيب) ومعندوش أي صلاحيات اونرات نهائيًا
 */
function createMessageHandler(sock, { db, stats, commands, ownerIds, masterOwnerId, mainBotGroups, restricted = false }) {
    const trackMessageStats = (sender, groupID) => {
        const now = new Date();
        const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
        const yearKey = `${now.getFullYear()}`;
        const weekKey = getWeekKey(now);

        const bump = (entry) => {
            entry.total = (entry.total || 0) + 1;
            entry.daily = entry.daily || {};
            entry.daily[dayKey] = (entry.daily[dayKey] || 0) + 1;
            entry.monthly = entry.monthly || {};
            entry.monthly[monthKey] = (entry.monthly[monthKey] || 0) + 1;
            entry.yearly = entry.yearly || {};
            entry.yearly[yearKey] = (entry.yearly[yearKey] || 0) + 1;
            entry.weekly = entry.weekly || {};
            entry.weekly[weekKey] = (entry.weekly[weekKey] || 0) + 1;
            return entry;
        };

        stats[sender] = bump(stats[sender] || {});

        if (groupID.endsWith("@g.us")) {
            stats[groupID] = stats[groupID] || {};
            stats[groupID][sender] = bump(stats[groupID][sender] || {});
        }
    };

    return async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.remoteJid === "status@broadcast") return;

        const groupID = m.key.remoteJid;

        // إعدادات لوحة التحكم تعمل كـ hooks اختيارية فقط؛ لا تغيّر منطق
        // الأوامر الحالي إلا عندما يفعّلها صاحب البوت صراحةً.
        if (db.settings?.dashboard?.maintenance?.enabled) return;
        if (groupID.endsWith("@g.us") && db[groupID]?.dashboardEnabled === false) return;

        // 🚫 البوت الفرعي (تنصيب) ممنوع تمامًا يشتغل في أي جروب البوت الأساسي عضو فيه فعلاً —
        // بيتجاهل أي رسالة جاية من الجروب ده تمامًا (زي لو مكانوش موجود فيه أصلاً)، عشان
        // مايبقاش فيه ازدواجية ردود أو تعارض بين نسخة أساسية وفرعية في نفس الجروب.
        if (restricted && groupID.endsWith("@g.us") && mainBotGroups?.has(groupID)) return;

        // 🗺️ نسجّل إن الجروب ده حاليًا بيتغطى بالـ sock ده، عشان core/scheduler.js يقدر
        // يبعت رسائل/يغيّر إعدادات الجروب ده لاحقًا (قفل/فتح مجدول، إحصائيات أسبوعية)
        recordGroupSock(groupID, sock);

        // 🆔 لو الجروب شغال بنظام "LID" الجديد بتاع واتساب (إخفاء الرقم)، م.key.participant
        // بييجي بصيغة "12345@lid" مش الرقم الحقيقي بتاع الشخص. Baileys بيحط الرقم الحقيقي
        // في participantPn (أو participantAlt في نسخ تانية) جنب اللـ lid — فبنفضّله لو موجود
        // عشان أي مكان بيستخدم extractPureNumber (زي .تنصيب وطلب كود الربط) ياخد رقم حقيقي.
        const rawParticipant = m.key.participant || m.key.remoteJid;
        const participantPhoneJid = m.key.participantPn || m.key.participantAlt;
        let sender = rawParticipant;

        if (rawParticipant?.endsWith("@lid") && participantPhoneJid) {
            sender = participantPhoneJid;

            // 🗺️ بنسجل الربط ده في خريطة دايمة (db.lidMap) عشان نقدر نحل نفس اللِد ده تاني
            // في المستقبل، حتى وقت الرد (ريبلاي) على رسالة قديمة بتاعته، لما resolveRealJid
            // معندوش altJid ولا phoneNumber من groupMetadata (خصوصية الرقم شغالة عنده).
            db.lidMap = db.lidMap || {};
            db.lidMap[rawParticipant] = participantPhoneJid;

            // 🔄 ترحيل بيانات قديمة: قبل إصلاح مشكلة الـ lid، كان بيانات اللاعب (جولد/ليفل/زواج...)
            // بتتخزن غلط تحت مفتاح الـ lid بتاعه. دلوقتي بعد ما بقينا نستخدم رقمه الحقيقي كمفتاح،
            // لازم ننقل أي سجل قديم موجود تحت الـ lid لمفتاح رقمه الحقيقي، مرة واحدة بس،
            // عشان اللاعب مايرجعش "صفر" من الأول.
            if (db[rawParticipant] && !db[sender]) {
                db[sender] = db[rawParticipant];
                delete db[rawParticipant];
                console.log(`🔄 تم ترحيل بيانات لاعب من ${rawParticipant} إلى ${sender}`);
            }
        }
        const messageType = Object.keys(m.message)[0];
        // 📜 دعم اختيار قسم من القائمة التفاعلية (listMessage): لو المستخدم ضغط على
        // صف في القائمة بدل ما يكتب رقم، واتساب بيرجّع الرد في listResponseMessage
        // مش كنص عادي، فبنستخرج rowId/title منه ونعامله زي أي نص عادي مكتوب باليد.
        const listReplyId = m.message.listResponseMessage?.singleSelectReply?.selectedRowId
            || m.message.listResponseMessage?.title;
        const text = (m.message.conversation || m.message.extendedTextMessage?.text || listReplyId || m.message[messageType]?.caption || "").trim();

        // 🚫 البوتات الفرعية (تنصيب) ممنوعة تمامًا من صلاحيات المالك، مهما كان المرسل...
        // ...إلا المالك الحقيقي بتاع البوت نفسه (masterOwnerId)، ده بياخد صلاحيات كاملة حتى
        // لو بيتكلم من جوه بوت فرعي.
        const senderNumber = extractPureNumber(sender);
        const isMasterOwner = Boolean(masterOwnerId) && senderNumber === masterOwnerId;
        const isOwner = restricted
            ? isMasterOwner
            : (ownerIds.some(ownerId => sender.includes(ownerId)) ||
               (Array.isArray(db.owners) && db.owners.includes(sender)) ||
               m.key.fromMe);

        // 0. بوابة المجموعات المحظورة: البوت يبقى صامتاً تماماً هنا (إلا مع المالك)
        if (groupID.endsWith("@g.us") && db.bannedGroups?.includes(groupID) && !isOwner) {
            return;
        }

        // 0.1 فرض الكتم: حذف رسائل الأعضاء المكتومين
        if (groupID.endsWith("@g.us") && db.muted?.[groupID]?.includes(sender)) {
            try {
                await sock.sendMessage(groupID, { delete: m.key });
            } catch (e) {
                console.error("❌ تعذر حذف رسالة عضو مكتوم:", e.message);
            }
            return;
        }

        // 0.11 أنتي-فلود: لو العضو بعت رسائل أكتر من الحد المسموح خلال ثواني معدودة، يتكتم
        // تلقائيًا لمدة قصيرة. مفعّل بإعدادات معتدلة افتراضيًا لأنها ميزة دفاعية بحتة.
        if (groupID.endsWith("@g.us") && !isOwner) {
            const groupMetaForFlood = await sock.groupMetadata(groupID).catch(() => null);
            if (!isParticipantAdmin(groupMetaForFlood, sender, db) && checkAntiFlood(db, groupID, sender)) {
                const cfg = { ...DEFAULT_ANTIFLOOD, ...(db[groupID]?.antiFlood || {}) };
                await sock.sendMessage(groupID, {
                    text: `🌊🚫 @${sender.split("@")[0]} تم كتمك تلقائيًا لمدة ${cfg.muteMinutes} دقيقة لإرسال رسائل كتير جدًا في وقت قصير (فلود).`,
                    mentions: [sender]
                }).catch(() => {});
                return;
            }
        }

        // 0.12 أنتي-منشن جماعي / أنتي-تاج-ستيكر: منع أي رسالة (نص أو ستيكر) بتعمل منشن
        // لعدد كبير من الأعضاء دفعة واحدة من غير الأدمن.
        if (groupID.endsWith("@g.us") && !isOwner) {
            const mentionCount = getMentionCount(m);
            const mentionLimit = db[groupID]?.antiMention?.limit ?? DEFAULT_MENTION_LIMIT;
            if (mentionCount > mentionLimit) {
                const groupMetaForMention = await sock.groupMetadata(groupID).catch(() => null);
                if (!isParticipantAdmin(groupMetaForMention, sender, db)) {
                    try {
                        await sock.sendMessage(groupID, { delete: m.key });
                    } catch (e) { console.error("❌ تعذر حذف رسالة منشن جماعي:", e.message); }
                    logAudit(db, groupID, "حذف رسالة (منشن جماعي زائد)", "النظام", sender);
                    await sock.sendMessage(groupID, {
                        text: `📛🚫 @${sender.split("@")[0]} تم حذف رسالتك لاحتوائها على منشن جماعي زائد (${mentionCount} أكتر من الحد المسموح ${mentionLimit}).`,
                        mentions: [sender]
                    }).catch(() => {});
                    return;
                }
            }
        }

        // 0.16 قفل جزئي (وسائط فقط): يمنع إرسال الصور/الفيديو/الستيكرات/المستندات بس،
        // ويسيب الكتابة العادية شغالة، عكس .الجروب قفل اللي بيقفل كل حاجة.
        if (
            groupID.endsWith("@g.us") &&
            !isOwner &&
            db[groupID]?.mediaLock?.enabled &&
            MEDIA_TYPE_LABELS[messageType]
        ) {
            const groupMetaForLock = await sock.groupMetadata(groupID).catch(() => null);
            if (!isParticipantAdmin(groupMetaForLock, sender, db)) {
                try {
                    await sock.sendMessage(groupID, { delete: m.key });
                } catch (e) { console.error("❌ تعذر حذف وسائط أثناء القفل الجزئي:", e.message); }
                await sock.sendMessage(groupID, {
                    text: `🔒📎 @${sender.split("@")[0]} إرسال الوسائط مقفول حاليًا في هذا الجروب، الكتابة العادية شغالة.`,
                    mentions: [sender]
                }).catch(() => {});
                return;
            }
        }

        // 0.13 حماية ضد الروابط: حذف تلقائي لأي لينك (واتساب جروب أو لينك عام) من غير الأدمن
        if (
            groupID.endsWith("@g.us") &&
            !isOwner &&
            db[groupID]?.linkProtection?.enabled &&
            (WHATSAPP_INVITE_REGEX.test(text) || GENERIC_LINK_REGEX.test(text))
        ) {
            const groupMeta = await sock.groupMetadata(groupID).catch(() => null);
            const senderIsAdmin = isParticipantAdmin(groupMeta, sender, db);

            if (!senderIsAdmin) {
                try {
                    await sock.sendMessage(groupID, { delete: m.key });
                    logAudit(db, groupID, "حذف رسالة (رابط ممنوع)", "النظام", sender);
                    await sock.sendMessage(groupID, {
                        text: `🔗🚫 @${sender.split("@")[0]} تم حذف رسالتك لاحتوائها على رابط، الروابط ممنوعة في هذا الجروب إلا للأدمن.`,
                        mentions: [sender]
                    });
                } catch (e) {
                    console.error("❌ تعذر حذف رسالة تحتوي على رابط:", e.message);
                }
                return;
            }
        }

        // 0.14 فلتر ميديا معينة: بنفس منطق فلتر الكلام بالظبط، بس على نوع الرسالة
        // (صور/فيديو/ستيكرات/مستندات/صوت) بدل نص الكلمة
        if (
            groupID.endsWith("@g.us") &&
            !isOwner &&
            db[groupID]?.mediaFilter?.enabled &&
            Array.isArray(db[groupID].mediaFilter.types) &&
            db[groupID].mediaFilter.types.length > 0
        ) {
            const mediaLabel = MEDIA_TYPE_LABELS[messageType];
            if (mediaLabel && db[groupID].mediaFilter.types.includes(mediaLabel)) {
                const groupMeta = await sock.groupMetadata(groupID).catch(() => null);
                const senderIsAdmin = isParticipantAdmin(groupMeta, sender, db);

                if (!senderIsAdmin) {
                    try {
                        await sock.sendMessage(groupID, { delete: m.key });
                        logAudit(db, groupID, "حذف رسالة (ميديا ممنوعة)", "النظام", sender);
                    } catch (e) {
                        console.error("❌ تعذر حذف رسالة ميديا ممنوعة:", e.message);
                    }

                    const filterCfg = db[groupID].mediaFilter;
                    filterCfg.warnings ??= {};
                    filterCfg.warnings[sender] = (filterCfg.warnings[sender] || 0) + 1;
                    const warnLimit = filterCfg.warnLimit || 3;
                    const count = filterCfg.warnings[sender];

                    if (count >= warnLimit) {
                        filterCfg.warnings[sender] = 0;
                        await sock.sendMessage(groupID, {
                            text: `🚫 @${sender.split("@")[0]} اتشال من الجروب لتكرار إرسال (${mediaLabel}) الممنوعة (تجاوز ${warnLimit} تحذيرات).`,
                            mentions: [sender]
                        });
                        try {
                            await sock.groupParticipantsUpdate(groupID, [sender], "remove");
                            logAudit(db, groupID, "طرد (تجاوز تحذيرات فلتر الميديا)", "النظام", sender);
                        } catch (e) {
                            console.error("❌ تعذر طرد المخالف بعد تجاوز حد التحذيرات:", e.message);
                        }
                    } else {
                        await sock.sendMessage(groupID, {
                            text: `⚠️ @${sender.split("@")[0]} احذر! تم حذف رسالتك لاحتوائها على (${mediaLabel}) الممنوعة هنا. (تحذير ${count}/${warnLimit})`,
                            mentions: [sender]
                        });
                    }
                    return;
                }
            }
        }

        // 0.15 فلتر الكلام الممنوع: خاص بكل جروب لوحده، أدمن الجروب نفسه هو اللي بيظبطه
        // (مش لازم أونر البوت) عن طريق أوامر commands/group/ اللي شغالة حتى من البوتات الفرعية.
        if (
            groupID.endsWith("@g.us") &&
            !isOwner &&
            !text.startsWith(".") &&
            db[groupID]?.filter?.enabled &&
            Array.isArray(db[groupID].filter.words) &&
            db[groupID].filter.words.length > 0
        ) {
            const lowerText = text.toLowerCase();
            const matchedWord = db[groupID].filter.words.find(w => w && lowerText.includes(w));

            if (matchedWord) {
                const groupMeta = await sock.groupMetadata(groupID).catch(() => null);
                const senderIsAdmin = isParticipantAdmin(groupMeta, sender, db);

                if (!senderIsAdmin) {
                    try {
                        await sock.sendMessage(groupID, { delete: m.key });
                        logAudit(db, groupID, "حذف رسالة (كلمة ممنوعة)", "النظام", sender);
                    } catch (e) {
                        console.error("❌ تعذر حذف رسالة مخالفة للفلتر:", e.message);
                    }

                    const filterCfg = db[groupID].filter;
                    filterCfg.warnings ??= {};
                    filterCfg.warnings[sender] = (filterCfg.warnings[sender] || 0) + 1;
                    const warnLimit = filterCfg.warnLimit || 3;
                    const count = filterCfg.warnings[sender];

                    if (count >= warnLimit) {
                        filterCfg.warnings[sender] = 0;
                        await sock.sendMessage(groupID, {
                            text: `🚫 @${sender.split("@")[0]} اتشال من الجروب لتكرار كتابة كلام ممنوع (تجاوز ${warnLimit} تحذيرات).`,
                            mentions: [sender]
                        });
                        try {
                            await sock.groupParticipantsUpdate(groupID, [sender], "remove");
                            logAudit(db, groupID, "طرد (تجاوز تحذيرات فلتر الكلام)", "النظام", sender);
                        } catch (e) {
                            console.error("❌ تعذر طرد المخالف بعد تجاوز حد التحذيرات:", e.message);
                        }
                    } else {
                        await sock.sendMessage(groupID, {
                            text: `⚠️ @${sender.split("@")[0]} احذر! رسالتك اتشالت لاحتوائها على كلام ممنوع في هذا الجروب. (تحذير ${count}/${warnLimit})`,
                            mentions: [sender]
                        });
                    }
                }
                return;
            }
        }

        // 0.2 تسجيل إحصائيات الرسائل
        trackMessageStats(sender, groupID);

        // 0.21 نظام مستوى التفاعل: بنشوف هل العضو وصل لعتبة رتبة جديدة (بناءً على إجمالي
        // رسائله في stats.json لنفس الجروب) ولسه ماخدش اللقب ده قبل كده
        if (groupID.endsWith("@g.us") && !isOwner) {
            const ranks = (db[groupID]?.activityRanks?.length ? db[groupID].activityRanks : DEFAULT_ACTIVITY_RANKS)
                .slice()
                .sort((a, b) => a.threshold - b.threshold);
            const total = stats[groupID]?.[sender]?.total || 0;
            let achieved = null;
            for (const r of ranks) {
                if (total >= r.threshold) achieved = r;
                else break;
            }
            if (achieved) {
                db[groupID].activityTitles ??= {};
                if (db[groupID].activityTitles[sender] !== achieved.title) {
                    db[groupID].activityTitles[sender] = achieved.title;
                    sock.sendMessage(groupID, {
                        text: `🎉 مبروك! @${sender.split("@")[0]} وصل لمستوى تفاعل جديد ونال لقب: *${achieved.title}*`,
                        mentions: [sender]
                    }).catch(() => {});
                }
            }
        }

        // 0.22 كاشف البوتات الأخرى (استدلالي): بنراقب أنماط شبيهة بالبوتات، ولو الشك اتأكد
        // (٣ إشارات فأكتر) بنتأكد إن الشخص مش أدمن قبل ما ننبه الجروب (تقليل الإنذارات الكاذبة)
        if (groupID.endsWith("@g.us") && !isOwner && text) {
            const suspicion = trackSuspectedBot(db, groupID, sender, text);
            if (suspicion) {
                (async () => {
                    const groupMeta = await sock.groupMetadata(groupID).catch(() => null);
                    if (isParticipantAdmin(groupMeta, sender, db)) {
                        suspicion.hits = 0; // على الأغلب إنذار كاذب (أدمن بيستخدم أداة تانية)
                        return;
                    }
                    suspicion.notified = true;
                    await sock.sendMessage(groupID, {
                        text: `🤖 *تنبيه: احتمال وجود بوت آخر في الجروب*\n\n` +
                              `الحساب: @${sender.split("@")[0]}\n` +
                              `السبب: ${suspicion.reasons.join("، ")}\n\n` +
                              `⚠️ ده كشف تقديري مش مضمون ١٠٠٪ (واتساب مفيش فيه علامة رسمية للبوتات)، يفضل الأدمن يتأكد يدويًا قبل أي إجراء.\n` +
                              `لو الحساب موثوق، رد على رسالته بـ *.استثناء-بوت*`,
                        mentions: [sender]
                    }).catch(() => {});
                })();
            }
        }

        // 0.3 الردود التلقائية المخصصة للمجموعة (نظام .رد)
        if (groupID.endsWith("@g.us") && db.customReplies?.[groupID]) {
            const autoReply = db.customReplies[groupID][text.toLowerCase()];
            if (autoReply) {
                await sock.sendMessage(groupID, { text: autoReply }, { quoted: m });
                return;
            }
        }

        // 0.31 تقييم بعد حل الشكوى: لو عند المرسل شكوى مستنية تقييم وبعت 👍 أو 👎
        if (db.complaints?.pendingRating?.[sender] && (text === "👍" || text === "👎")) {
            const complaintId = db.complaints.pendingRating[sender];
            const complaint = db.complaints.list?.[complaintId];
            if (complaint) {
                complaint.rating = text === "👍" ? "راضٍ" : "غير راضٍ";
                await sock.sendMessage(groupID, { text: "🙏 شكرًا لتقييمك، وصلنا رأيك بخصوص الشكوى." }, { quoted: m });
            }
            delete db.complaints.pendingRating[sender];
            return;
        }

        // 0.32 نظام القائمة التفاعلية للأوامر (.اوامر): لو المرسل مستني يختار قسم
        // (لسه في صلاحية الـ5 دقايق) وبعت رقم/اسم قسم، نبعتله محتوى القسم لوحده
        // من غير ما نلمس بقية تدفق الرسائل. لو النص مش رقم/اسم قسم معروف، سايبينه
        // يكمل عادي (ممكن يكون إجابة لغز أو أي حاجة تانية).
        const MENU_SESSION_MS = 5 * 60 * 1000;
        const menuSession = db.pendingMenu?.[sender];
        if (menuSession && Date.now() - menuSession.at < MENU_SESSION_MS && text) {
            if (isBackToMenuRequest(text)) {
                menuSession.at = Date.now();
                await sock.sendMessage(groupID, { text: buildCategoryListText() }, { quoted: m });
                return;
            }
            const section = findSection(text);
            if (section) {
                menuSession.at = Date.now(); // نمدد الجلسة عشان يقدر يتصفح أقسام تانية
                await sock.sendMessage(groupID, { text: buildSectionText(section) }, { quoted: m });
                return;
            }
        }

        // 1. نظام حل الألغاز والفعاليات (بيدعم كمان مسابقات التريفيا متعددة الاختيارات)
        if (db.puzzles[groupID] && text.toLowerCase() === db.puzzles[groupID].answer.toLowerCase()) {
            const reward = db.puzzles[groupID].reward || 500;
            db[sender] ??= { gold: 0 };
            db[sender].gold += reward;
            await sock.sendMessage(groupID, { text: `🎊 إجابة صحيحة! فزت بـ ${reward.toLocaleString()} ذهبة.`, mentions: [sender] }, { quoted: m });
            delete db.puzzles[groupID];
            return;
        }

        // 2. نظام ردود الزواج (موافق)
        if (db.marryRequests[sender] && text === "موافق") {
            const partner = db.marryRequests[sender].from;
            db[sender] ??= { gold: 0 };
            db[partner] ??= { gold: 0 };
            db[sender].married = partner;
            db[partner].married = sender;
            await sock.sendMessage(groupID, { text: `💖 مبروك الزواج! تم الربط بينكما.`, mentions: [sender, partner] });
            delete db.marryRequests[sender];
            await checkAchievements(db, sender, sock, groupID);
            await checkAchievements(db, partner, sock, groupID);
            return;
        }

        // 3. نظام المواجهات (PVP)
        if (db.pvpRequests[sender] && (text === "موافق" || text === "رفض")) {
            const request = db.pvpRequests[sender];
            const challenger = request.challenger;
            delete db.pvpRequests[sender];

            if (text === "رفض") {
                await sock.sendMessage(groupID, { text: `🛡️ @${sender.split("@")[0]} رفض التحدي وانسحب من المعركة.`, mentions: [sender, challenger] }, { quoted: m });
                return;
            }

            db[sender] ??= { gold: 0, atk: 10, defense: 5 };
            db[challenger] ??= { gold: 0, atk: 10, defense: 5 };
            ensurePlayerDefaults(db[sender]);
            ensurePlayerDefaults(db[challenger]);

            // --- حساب القوة الأساسية: هجوم + عشوائية ضد دفاع الخصم ---
            let attackerPower = (db[challenger].atk || 10) + Math.floor(Math.random() * 20) - (db[sender].defense ?? db[sender].def ?? 5);
            let defenderPower = (db[sender].atk || 10) + Math.floor(Math.random() * 20) - (db[challenger].defense ?? db[challenger].def ?? 5);

            // --- أثر "رشقة" الرامي (.رشق): يقلل قوة الطرف الموهون مؤقتاً ---
            attackerPower = Math.round(attackerPower * getWeakenMultiplier(db[challenger]));
            defenderPower = Math.round(defenderPower * getWeakenMultiplier(db[sender]));

            // --- ميزة المحارب ضد الرامي: بيقفل عليه بسرعة في المواجهة المباشرة ---
            if (isWarrior(db[challenger]) && isArcher(db[sender])) {
                attackerPower = Math.round(attackerPower * (1 + WARRIOR_VS_ARCHER_BONUS));
            }
            if (isWarrior(db[sender]) && isArcher(db[challenger])) {
                defenderPower = Math.round(defenderPower * (1 + WARRIOR_VS_ARCHER_BONUS));
            }

            let critLog = "";

            // --- ميزة المغتال: فرصة "ضربة غادرة" تزيد القوة، تُخفَّف بمقاومة دفاع الخصم ---
            if (isAssassin(db[challenger])) {
                const resistance = getDefenseResistance(db[sender].defense ?? db[sender].def ?? 0);
                const effectiveChance = ASSASSIN_CRIT_CHANCE * (1 - resistance);
                if (Math.random() < effectiveChance) {
                    attackerPower = Math.round(attackerPower * (1 + ASSASSIN_CRIT_BONUS));
                    critLog += `🥷 ${challenger.split("@")[0]} سدد ضربة غادرة!\n`;
                }
            }
            if (isAssassin(db[sender])) {
                const resistance = getDefenseResistance(db[challenger].defense ?? db[challenger].def ?? 0);
                const effectiveChance = ASSASSIN_CRIT_CHANCE * (1 - resistance);
                if (Math.random() < effectiveChance) {
                    defenderPower = Math.round(defenderPower * (1 + ASSASSIN_CRIT_BONUS));
                    critLog += `🥷 ${sender.split("@")[0]} سدد ضربة غادرة!\n`;
                }
            }

            // --- ميزة الرامي: فرصة "ضربة دقيقة" مشابهة، بنفس آلية المقاومة ---
            if (isArcher(db[challenger])) {
                const resistance = getDefenseResistance(db[sender].defense ?? db[sender].def ?? 0);
                const effectiveChance = ARCHER_CRIT_CHANCE * (1 - resistance);
                if (Math.random() < effectiveChance) {
                    attackerPower = Math.round(attackerPower * (1 + ARCHER_CRIT_BONUS));
                    critLog += `🏹 ${challenger.split("@")[0]} سدد ضربة دقيقة!\n`;
                }
            }
            if (isArcher(db[sender])) {
                const resistance = getDefenseResistance(db[challenger].defense ?? db[challenger].def ?? 0);
                const effectiveChance = ARCHER_CRIT_CHANCE * (1 - resistance);
                if (Math.random() < effectiveChance) {
                    defenderPower = Math.round(defenderPower * (1 + ARCHER_CRIT_BONUS));
                    critLog += `🏹 ${sender.split("@")[0]} سدد ضربة دقيقة!\n`;
                }
            }

            const winner = attackerPower >= defenderPower ? challenger : sender;
            const loser = winner === challenger ? sender : challenger;

            // تسجيل انتصار (يُستخدم في شروط التحول لمغتال)
            db[winner].pvpWins = (db[winner].pvpWins || 0) + 1;

            // 🏆 تتبع بطولة PVP الأسبوعية لهذا الجروب (تُعلن نتيجتها في core/scheduler.js)
            const pvpWeekKey = getWeekKey();
            db[groupID] ??= {};
            db[groupID].pvpWeekly ??= {};
            db[groupID].pvpWeekly[pvpWeekKey] ??= {};
            db[groupID].pvpWeekly[pvpWeekKey][winner] = (db[groupID].pvpWeekly[pvpWeekKey][winner] || 0) + 1;

            // الرهان: نصف ذهب الخاسر
            const loserGold = db[loser].gold || 0;
            const wager = Math.floor(loserGold / 2);

            db[winner].gold = (db[winner].gold || 0) + wager;
            db[loser].gold = Math.max(0, loserGold - wager);

            let resultMsg = `⚔️ *نَتِيجَةُ الْمُوَاجَهَةِ القِتَالِيَّة* ⚔️\n`;
            resultMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
            if (critLog) resultMsg += critLog;
            resultMsg += `🏆 المنتصر (${classTitle(db[winner])}): @${winner.split("@")[0]}\n`;
            resultMsg += `💀 الخاسر (${classTitle(db[loser])}): @${loser.split("@")[0]}\n`;
            resultMsg += `💰 الغنيمة المكتسبة: +${wager.toLocaleString()} ذهبة\n`;
            resultMsg += `━━━━━━━━━━━━━━━━━━━━`;

            await sock.sendMessage(groupID, { text: resultMsg, mentions: [winner, loser] }, { quoted: m });

            // إشعار خاص لو تقدم اللاعب الفائز في شروط التحول لمغتال
            await notifyIfProgressed(sock, db, winner);
            await checkAchievements(db, winner, sock, groupID);
            return;
        }

        // 3.5 نظام ردود التحالف بين العصابات (.تحالف) — بكلمات مخصصة (مش موافق/رفض
        // العامة) عشان ميتلخبطش مع طلبات الزواج/المواجهات لو حد عنده أكتر من طلب.
        if (db.allianceRequests?.[sender] && (text === "قبول_تحالف" || text === "رفض_تحالف")) {
            const request = db.allianceRequests[sender];
            delete db.allianceRequests[sender];

            const fromGang = db.gangs?.[request.fromGang];
            const toGang = db.gangs?.[request.toGang];

            if (text === "رفض_تحالف") {
                await sock.sendMessage(groupID, {
                    text: `❌ عصابة [ ${request.toGang} ] رفضت عرض التحالف من [ ${request.fromGang} ].`
                }, { quoted: m });
                return;
            }

            if (!fromGang || !toGang) {
                await sock.sendMessage(groupID, { text: "⚠️ إحدى العصابتين اتحلت قبل ما الطلب يتقبل." }, { quoted: m });
                return;
            }

            fromGang.allies ??= [];
            toGang.allies ??= [];
            if (!fromGang.allies.includes(toGang.name)) fromGang.allies.push(toGang.name);
            if (!toGang.allies.includes(fromGang.name)) toGang.allies.push(fromGang.name);

            await sock.sendMessage(groupID, {
                text: `🤝 *تحالف رسمي جديد!* 🤝\nعصابة [ ${fromGang.name} ] وعصابة [ ${toGang.name} ] بقوا حلفاء الآن.\n🛡️ ممنوع الغارات أو إعلان الحرب بين العصابتين طول ما التحالف قايم.`
            }, { quoted: m });
            return;
        }

        // 4. تنفيذ الأوامر التي تبدأ بـ (.)
        if (text.startsWith(".")) {
            const args = text.slice(1).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();
            const command = commands.get(cmdName);

            if (command) {
                const dashboardCommand = db.settings?.dashboard?.commands?.[command.name];
                if (dashboardCommand?.enabled === false) return;
                // 🔒 حماية البوتات الفرعية: ممنوع أي أمر اونرات/مطورين أو أي أمر خاص بإدارة التنصيب نفسه
                // أوامر إدارة التنصيب (.تنصيب / .تنصيب-فتح / .تنصيب-قفل / .تنصيب-حذف) فضلاً ممنوعة
                // تمامًا جوه أي بوت فرعي، حتى للمالك الحقيقي نفسه، عشان نمنع تسلسل بوتات فرعية جوه بعض.
                if (restricted && BLOCKED_COMMANDS_FOR_SUBBOTS.includes(command.name)) {
                    await sock.sendMessage(groupID, {
                        text: "🚫 البوت ده نسخة فرعية (تنصيب) ومعندوش صلاحية تنفيذ أوامر إدارة التنصيب."
                    }, { quoted: m });
                    return;
                }
                // باقي أوامر الاونرات/الأدمن (admin, owners) ممنوعة على أي حد جوه بوت فرعي،
                // إلا المالك الحقيقي بتاع البوت (isMasterOwner) اللي عنده صلاحيات كاملة في كل مكان.
                if (restricted && !isMasterOwner && BLOCKED_DIRS_FOR_SUBBOTS.includes(command.__dir)) {
                    await sock.sendMessage(groupID, {
                        text: "🚫 البوت ده نسخة فرعية (تنصيب) ومعندوش صلاحية تنفيذ أوامر الاونرات."
                    }, { quoted: m });
                    return;
                }

                try {
                    db.settings ??= {};
                    db.settings.dashboard ??= {};
                    db.settings.dashboard.commandUsage ??= {};
                    db.settings.dashboard.commandUsage[command.name] =
                        (db.settings.dashboard.commandUsage[command.name] || 0) + 1;
                    if (typeof dashboardCommand?.replyText === "string" && dashboardCommand.replyText.trim()) {
                        await sock.sendMessage(groupID, { text: dashboardCommand.replyText }, { quoted: m });
                        return;
                    }
                    await command.execute(sock, m, args, db, sender, isOwner);
                } catch (e) {
                    console.error(`❌ خطأ في أمر ${cmdName}:`, e);
                }
            }
        }
    };
}

/**
 * بيرجع دالة استماع لحدث group-participants.update، مسؤولة عن رسائل الترحيب بالأعضاء
 * الجدد والوداع للي بيمشوا. شغالة بنفس الشكل على البوت الأساسي وأي بوت فرعي (تنصيب)،
 * وبتحترم نفس قاعدة "متعملش حاجة في جروب البوت الأساسي موجود فيه فعلاً" لو كانت
 * restricted (بوت فرعي)، عشان مايبقاش فيه ترحيب/وداع مزدوج من بوتين في نفس الجروب.
 */
function createGroupParticipantsHandler(sock, { db, restricted = false, mainBotGroups } = {}) {
    return async (update) => {
        try {
            const { id: groupID, action, participants } = update;
            if (!groupID?.endsWith("@g.us")) return;
            if (restricted && mainBotGroups?.has(groupID)) return;

            const isJoin = action === "add";
            const isLeave = action === "remove" || action === "leave";
            const isPromote = action === "promote";
            const isDemote = action === "demote";

            // 🛡️ 7.x نظام حماية شامل: إشعارات ترقية/تنزيل أدمن وإشعار الطرد.
            // مستقل تمامًا عن إعدادات الترحيب/الوداع (اللي ليها تفعيل/تعطيل خاص بيها)،
            // عشان الجروب دايمًا يعرف لو حصل تغيير حساس زي ده. قابل للتعطيل بأمر
            // .حماية-الادمن (مفعّل افتراضيًا لأي جروب).
            const adminGuardOn = db[groupID]?.adminGuard?.enabled !== false;

            // بنجيب "الفاعل" (اللي عمل الترقية/التنزيل/الطرد) لو Baileys وفّره لنا في update.author
            const rawActor = update.author || null;
            const actorJid = rawActor
                ? (rawActor.endsWith("@lid") ? resolveRealJid(rawActor, null, null, db.lidMap) : rawActor)
                : null;

            // 🎖️ إشعار ترقية أدمن جديد (مع ذكر مين اللي رقّاه لو معروف)
            if (adminGuardOn && isPromote) {
                for (const rawJid of participants || []) {
                    const resolvedJid = rawJid.endsWith("@lid") ? resolveRealJid(rawJid, null, null, db.lidMap) : rawJid;
                    const mentions = [resolvedJid];
                    let text = `🎖️ مبروك يا @${resolvedJid.split("@")[0]}! بقيت أدمن جديد في الجروب.`;
                    if (actorJid && actorJid !== resolvedJid) {
                        text += `\n👤 بواسطة: @${actorJid.split("@")[0]}`;
                        mentions.push(actorJid);
                    }
                    logAudit(db, groupID, "ترقية أدمن", actorJid || "غير معروف", resolvedJid);
                    await sock.sendMessage(groupID, { text, mentions }).catch(() => {});
                }
            }

            // ⬇️ إشعار تنزيل أدمن (سحب الصلاحية)
            if (adminGuardOn && isDemote) {
                for (const rawJid of participants || []) {
                    const resolvedJid = rawJid.endsWith("@lid") ? resolveRealJid(rawJid, null, null, db.lidMap) : rawJid;
                    const mentions = [resolvedJid];
                    let text = `⬇️ @${resolvedJid.split("@")[0]} اتسحبت منه صلاحية الأدمن في الجروب.`;
                    if (actorJid && actorJid !== resolvedJid) {
                        text += `\n👤 بواسطة: @${actorJid.split("@")[0]}`;
                        mentions.push(actorJid);
                    }
                    logAudit(db, groupID, "تنزيل أدمن", actorJid || "غير معروف", resolvedJid);
                    await sock.sendMessage(groupID, { text, mentions }).catch(() => {});
                }
            }

            // 🚫 إشعار الطرد: بيتفرّق عن "خروج طوعي" (action === "leave") بوجود
            // update.author (اللي طرد) ومختلف عن الشخص المطرود نفسه.
            if (adminGuardOn && action === "remove" && actorJid) {
                for (const rawJid of participants || []) {
                    const resolvedJid = rawJid.endsWith("@lid") ? resolveRealJid(rawJid, null, null, db.lidMap) : rawJid;
                    if (actorJid === resolvedJid) continue; // ده خروج طوعي مش طرد فعلي
                    logAudit(db, groupID, "طرد عضو", actorJid, resolvedJid);
                    await sock.sendMessage(groupID, {
                        text: `🚫 @${resolvedJid.split("@")[0]} اتطرد من الجروب.\n👤 بواسطة: @${actorJid.split("@")[0]}`,
                        mentions: [resolvedJid, actorJid]
                    }).catch(() => {});
                }
            }

            // 🧭 4.2 نظام تتبع الدعوات: لو حد سجل نية دعوة (.سجل-دعوة) لعضو ودخل فعلاً خلال 24 ساعة
            if (isJoin && db.inviteIntents) {
                for (const rawJid of participants || []) {
                    const resolvedJid = rawJid.endsWith("@lid") ? resolveRealJid(rawJid, null, null, db.lidMap) : rawJid;
                    const intent = db.inviteIntents[resolvedJid];
                    if (intent && Date.now() - intent.at < 24 * 60 * 60 * 1000) {
                        db[groupID] ??= {};
                        db[groupID].inviterScores ??= {};
                        db[groupID].inviterScores[intent.by] = (db[groupID].inviterScores[intent.by] || 0) + 1;
                        delete db.inviteIntents[resolvedJid];
                        await sock.sendMessage(groupID, {
                            text: `🤝 @${intent.by.split("@")[0]} نجح في دعوة @${resolvedJid.split("@")[0]} للجروب! (+1 نقطة دعوة)`,
                            mentions: [intent.by, resolvedJid]
                        }).catch(() => {});
                    }
                }
            }

            if (!isJoin && !isLeave) return;

            const cfg = isJoin ? db[groupID]?.welcome : db[groupID]?.farewell;
            if (!cfg?.enabled) return;

            let groupName = "";
            try {
                const meta = await sock.groupMetadata(groupID);
                groupName = meta?.subject || "";
            } catch (e) { /* مش حرج، هتفضل فاضية بس */ }

            const template = cfg.message ||
                (isJoin ? (db.settings?.welcomeMessage || DEFAULT_WELCOME_MESSAGE) : DEFAULT_FAREWELL_MESSAGE);

            for (const rawJid of participants || []) {
                // ⚠️ ممكن يجيلنا بصيغة @lid — خصوصًا للأعضاء الجداد اللي لسه ما بعتوش أي
                // رسالة عشان نقدر نسجل ربطهم في db.lidMap. بنحاول نحله، ولو معندناش حل
                // بنستخدمه زي ما هو (المنشن بيشتغل بيه برضو، بس متغير $name مش هيلاقي بياناته).
                const resolvedJid = rawJid.endsWith("@lid") ? resolveRealJid(rawJid, null, null, db.lidMap) : rawJid;
                const text = renderGroupTemplate(template, { userJid: resolvedJid, db, groupName });
                try {
                    await sock.sendMessage(groupID, { text, mentions: [resolvedJid] });
                    // 🎙️ 6.3 رسالة ترحيب صوتية (اختياري): لو الأدمن سجّل مقطع صوتي بـ .صوت-ترحيب
                    if (isJoin && db[groupID]?.welcomeVoice?.path && fsForVoice.existsSync(db[groupID].welcomeVoice.path)) {
                        await sock.sendMessage(groupID, {
                            audio: fsForVoice.readFileSync(db[groupID].welcomeVoice.path),
                            mimetype: "audio/ogg; codecs=opus",
                            ptt: true
                        }).catch(() => {});
                    }
                } catch (e) {
                    console.error("❌ فشل إرسال رسالة ترحيب/وداع:", e.message);
                }
            }
        } catch (e) {
            console.error("❌ خطأ في معالج انضمام/مغادرة الأعضاء:", e.message);
        }
    };
}

module.exports = {
    createMessageHandler,
    extractPureNumber,
    resolveRealJid,
    resolveTargetJid,
    renderGroupTemplate,
    isParticipantAdmin,
    createGroupParticipantsHandler,
    DEFAULT_WELCOME_MESSAGE,
    DEFAULT_FAREWELL_MESSAGE,
    DEFAULT_ACTIVITY_RANKS,
    MEDIA_TYPE_LABELS,
    logAudit
};
