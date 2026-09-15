const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    Browsers,
    delay
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const { createMessageHandler, extractPureNumber, createGroupParticipantsHandler } = require("../core/messageHandler.js");
const { getCurrentWaVersion } = require("../core/waVersion.js");

const SUBS_DIR = path.join(__dirname, "..", "auth_info_subs");

// حد أقصى لعدد التنصيبات الفرعية الشغالة في نفس الوقت — حماية للرقم الأساسي
// من أي استهلاك موارد زايد أو مشاكل حظر من واتساب لو حد بالغ في استخدام .تنصيب
const MAX_SUBBOTS = 45;

// sock الخاص بكل بوت فرعي شغال دلوقتي، بالرقم النظيف بتاع صاحبه كـ key
const activeSubBots = new Map();

function ensureSubsRegistry(db) {
    db.subbots ??= {};
    return db.subbots;
}

function countActive() {
    return activeSubBots.size;
}

function hasActive(requesterNumber) {
    return activeSubBots.has(requesterNumber);
}

/**
 * بيشغّل (أو يعيد تشغيل) بوت فرعي واحد لرقم معيّن.
 * البوت الفرعي ده بيشارك نفس db/stats/commands بالمرجع، لكن أي أمر admin/owners
 * أو أي أمر خاص بإدارة التنصيب نفسه بيتمنع عليه تمامًا (شوف core/messageHandler.js).
 */
async function launchSubBot({ requesterNumber, db, stats, commands, ownerIds, masterOwnerId, mainBotGroups, notify, isRestore = false }) {
    const registry = ensureSubsRegistry(db);
    if (!fs.existsSync(SUBS_DIR)) fs.mkdirSync(SUBS_DIR, { recursive: true });
    const authDir = path.join(SUBS_DIR, requesterNumber);

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const version = await getCurrentWaVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        logger: pino({ level: "silent" }),
        browser: Browsers.ubuntu("Chrome"),
        syncFullHistory: false,
        markOnlineOnConnect: true
    });

    sock.ev.on("creds.update", saveCreds);

    // 📵 نفس منطق رفض المكالمات التلقائي بتاع البوت الأساسي (index.js)، عشان لو
    // db.settings.rejectCalls مفعّل، البوتات الفرعية (تنصيب) ترفض المكالمات هي كمان.
    sock.ev.on("call", async (calls) => {
        if (!db.settings?.rejectCalls) return;
        for (const call of calls) {
            if (call.status !== "offer") continue;
            try {
                await sock.rejectCall(call.id, call.from);
            } catch (e) {
                console.error("❌ فشل رفض المكالمة (بوت فرعي):", e.message);
            }
        }
    });

    if (!sock.authState.creds.registered) {
        // 🚫 لو ده استرجاع تلقائي (بعد إعادة تشغيل البوت الأساسي) ومفيش notify،
        // معنى كده إن البوت الفرعي ده فعليًا مش مرتبط (اتلغى ربطه أو الداتا اتفقدت).
        // مفيش أي داعي إننا نطلب كود ربط جديد لوحدنا هنا لأن محدش هيستلمه أصلاً —
        // ده اللي كان بيخلي البوتات الفرعية "تطلب الربط تاني لوحدها" في كل ريستارت.
        // فبدل كده بنشيلها من السجل ونوقف الاتصال ده بهدوء.
        //
        // ⚠️ مهم جدًا: بنعمل sock.end() هنا *قبل* ما نسجّل أي connection.update listener
        // على السوكيت ده. لو سجّلناه قبل كده، sock.end() نفسه بيطلق حدث "close"، واللي
        // بدوره كان هيعيد نداء launchSubBot تاني (لأنه مش loggedOut)، وده بيعمل حلقة
        // لا نهائية بتنادي نفسها من غير توقف (وده بالظبط اللي كان بيسبب تكرار رسالة
        // "مش مرتبط فعليًا" عشرات المرات).
        if (isRestore || !notify) {
            try { sock.end(); } catch (e) {}
            activeSubBots.delete(requesterNumber);
            delete registry[requesterNumber];
            console.log(`⚠️ البوت الفرعي بتاع ${requesterNumber} مش مرتبط فعليًا — تم تجاهله بدل ما يطلب كود ربط لوحده.`);
            return null;
        }

        activeSubBots.set(requesterNumber, sock);
        registry[requesterNumber] = {
            createdAt: registry[requesterNumber]?.createdAt || Date.now(),
            authDir
        };

        // ⏳ نفس توقيت البوت الأساسي بالظبط (10 ثواني) بدل أي توقيت تاني.
        console.log(`\n❄️ جاري تهيئة الاتصال لبوت فرعي بالرقم: ${requesterNumber}`);
        await delay(10000);
        try {
            const code = await sock.requestPairingCode(requesterNumber);
            const formatted = code?.match(/.{1,4}/g)?.join("-") || code;
            await notify(
                `🔗 *كود ربط البوت الفرعي بتاعك* 🔗\n\n【 ${formatted} 】\n\n` +
                `افتح واتساب على جهازك ← الأجهزة المرتبطة ← ربط بالرقم، وحط الكود ده.\n` +
                `⚠️ البوت الفرعي ده هيبقى نسخة منفصلة، بنفس داتا اللعبة، لكن من غير أي صلاحيات اونرات.`
            );
        } catch (error) {
            console.error("❌ فشل طلب كود ربط لبوت فرعي:", error);
            await notify("❌ فشل إنشاء كود الربط، جرّب تبعت .تنصيب تاني كمان شوية.");
            activeSubBots.delete(requesterNumber);
            delete registry[requesterNumber];
            return null;
        }
    } else {
        activeSubBots.set(requesterNumber, sock);
        registry[requesterNumber] = {
            createdAt: registry[requesterNumber]?.createdAt || Date.now(),
            authDir
        };
    }

    // 🔁 بنسجّل الـ listener ده هنا بس (بعد ما اطمأنينا إن السيشن مش يتيمة) عشان
    // نمنع حلقة إعادة الاتصال اللا نهائية اللي بتحصل لو سجّلناه بدري قوي (شوف التعليق فوق).
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            activeSubBots.delete(requesterNumber);
            const loggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
            if (loggedOut) {
                // اتعمله تسجيل خروج فعليًا من واتساب: نمسح تسجيله من عندنا
                delete registry[requesterNumber];
                fs.rmSync(authDir, { recursive: true, force: true });
            } else {
                // قطع اتصال عادي (نت/ريستارت) — نعيد المحاولة بصمت، من غير ما نطلب كود ربط جديد
                launchSubBot({ requesterNumber, db, stats, commands, ownerIds, masterOwnerId, mainBotGroups, notify: null, isRestore: true });
            }
        }
    });

    sock.ev.on("messages.upsert", createMessageHandler(sock, {
        db,
        stats,
        commands,
        ownerIds,
        masterOwnerId,
        mainBotGroups,
        restricted: true // 🔒 دايمًا مقفول على أوامر الاونرات، إلا للمالك الحقيقي بتاع البوت (masterOwnerId)
    }));

    // 👋 نفس نظام الترحيب/الوداع بتاع البوت الأساسي، شغال هنا كمان — بيتجاهل الجروبات
    // اللي البوت الأساسي موجود فيها بالفعل عشان مايبقاش فيه ترحيب مزدوج (restricted: true).
    sock.ev.on("group-participants.update", createGroupParticipantsHandler(sock, { db, restricted: true, mainBotGroups }));

    return sock;
}

async function removeSubBot(requesterNumber, db) {
    const sock = activeSubBots.get(requesterNumber);
    if (sock) {
        try { await sock.logout(); } catch (e) { /* ممكن يكون مقفول أصلاً */ }
        try { sock.end(); } catch (e) {}
        activeSubBots.delete(requesterNumber);
    }
    const registry = ensureSubsRegistry(db);
    delete registry[requesterNumber];
    const authDir = path.join(SUBS_DIR, requesterNumber);
    if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true, force: true });
}

/**
 * بتتنادى مرة واحدة بس عند بدء تشغيل البوت الأساسي، عشان ترجّع أي بوتات فرعية
 * كانت شغالة قبل الريستارت (لو auth_info_subs محفوظة، زي على Railway Volume).
 */
async function restoreSubBots({ db, stats, commands, ownerIds, masterOwnerId, mainBotGroups }) {
    const registry = ensureSubsRegistry(db);
    const numbers = Object.keys(registry);
    if (numbers.length === 0) return;

    console.log(`♻️ جارٍ استرجاع ${numbers.length} بوت فرعي...`);
    for (const requesterNumber of numbers) {
        try {
            await launchSubBot({ requesterNumber, db, stats, commands, ownerIds, masterOwnerId, mainBotGroups, notify: null, isRestore: true });
        } catch (e) {
            console.error(`❌ فشل استرجاع البوت الفرعي بتاع ${requesterNumber}:`, e);
        }
    }
}

module.exports = {
    launchSubBot,
    removeSubBot,
    restoreSubBots,
    countActive,
    hasActive,
    extractPureNumber,
    MAX_SUBBOTS
};
