// 🛡️ [ حماية عامة ضد توقف البوت بالكامل ] ------------------------------------
// البوت الأساسي وكل البوتات الفرعية (تنصيب) شغالين في نفس عملية Node الواحدة.
// من غير الحماية دي، أي استثناء غير متوقع في أي حتة — زي أخطاء "Bad MAC" اللي
// بتطلع من مكتبة libsignal لما تفشل في فك تشفير رسالة واحدة بس (حاجة عادية وبتحصل
// لأي بوت واتساب، ومش قابلة للإصلاح من عندنا) — كان ممكن يوصل لحد إنه يقفل العملية
// كلها ويوقع كل البوتات الفرعية الشغالة معاه، ولاحظ Ice-Shield (lanch.js) بعد كده
// بيعمل ريستارت كامل، وده اللي كان بيحس المستخدم إنه "البوت بيتعطل".
// الحل: بنمسك أي استثناء/Promise مرفوض من غير catch، بنسجله في الكونسول بس،
// وبنكمل تشغيل عادي بدل ما نسيب Node يقفل العملية.
process.on("uncaughtException", (err) => {
    console.error("⚠️ استثناء غير متوقع (تم تجاهله عشان البوت يفضل شغال):", err?.message || err);
});
process.on("unhandledRejection", (reason) => {
    console.error("⚠️ Promise مرفوض من غير معالجة (تم تجاهله):", reason?.message || reason);
});
// -----------------------------------------------------------------------------

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
const crypto = require("crypto");
const { createMessageHandler, extractPureNumber, createGroupParticipantsHandler } = require("./core/messageHandler.js");
const { getCurrentWaVersion } = require("./core/waVersion.js");
const { startScheduler } = require("./core/scheduler.js");
const { createDashboardServer } = require("./dashboard-server");
const { atomicWriteJsonSync } = require("./dashboard-server/storage.js");

// تحميل .env بدون فرض اعتماد إضافي على البوت الأساسي. لا يوجد مفتاح افتراضي:
// لو DASHBOARD_KEY غير موجود في أول تشغيل، يتم توليد قيمة عشوائية مرة واحدة
// وكتابتها في .env بدل استخدام قيمة مكشوفة داخل الكود.
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (!match || process.env[match[1]]) continue;
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
}
if (!process.env.DASHBOARD_KEY) {
    const generatedDashboardKey = crypto.randomBytes(32).toString("base64url");
    process.env.DASHBOARD_KEY = generatedDashboardKey;
    const existingEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8").trimEnd() : "";
    const suffix = existingEnv ? `${existingEnv}\n` : "";
    fs.writeFileSync(envPath, `${suffix}DASHBOARD_KEY=${generatedDashboardKey}\nDASHBOARD_PORT=${process.env.DASHBOARD_PORT || 3030}\n`, {
        mode: 0o600
    });
    console.warn("🔐 تم إنشاء DASHBOARD_KEY مرة واحدة داخل ملف .env. احتفظ به بسرية.");
}

// --- [ إعدادات المالك والربط ] ---
const OWNER_NUMBER = "201220800288@s.whatsapp.net";
// أي حد من الأرقام/المعرّفات دي بيتعامل معاه كـ"مطور/مالك" في كل أوامر البوت
const OWNER_IDS = ["201220800288", "232620008976456"];
// المالك الحقيقي الوحيد بتاع البوت (انت) — ده اللي بياخد صلاحيات كاملة حتى جوه البوتات الفرعية (تنصيب)
const MASTER_OWNER_ID = "201220800288";
const phoneNumber = "972569041789";

// --- [ تحضير وتأمين قواعد البيانات ] ---
if (!fs.existsSync(path.join(__dirname, "database.json"))) {
    atomicWriteJsonSync(path.join(__dirname, "database.json"), {});
}
let db = JSON.parse(fs.readFileSync(path.join(__dirname, "database.json"), "utf-8"));

const ensureDBFields = () => {
    db.gangs ??= {};
    db.puzzles ??= {}; 
    db.marryRequests ??= {}; 
    db.pvpRequests ??= {};
    db.users ??= {};
    db.bannedGroups ??= [];
    db.subbots ??= {}; // سجل البوتات الفرعية (نظام .تنصيب)
    db.complaints ??= { nextId: 1, list: {}, cooldown: {}, pendingRating: {} };
    db.marketplace ??= []; // 2.5 سوق بين اللاعبين
    db.inviteIntents ??= {}; // 4.2 نظام تتبع الدعوات
    db.scheduledMessages ??= []; // 4.3 رسائل مجدولة
    db.pendingMenu ??= {}; // 4.4 حالة اختيار قسم في القائمة التفاعلية (.اوامر)
};
ensureDBFields();

// حفظ تلقائي كل 30 ثانية
setInterval(() => {
    try { persistDatabase(); }
    catch (error) { console.error("❌ فشل الحفظ الذري لقاعدة البيانات:", error.message); }
}, 30000);

// --- [ تحضير وتأمين إحصائيات الرسائل ] ---
if (!fs.existsSync(path.join(__dirname, "stats.json"))) {
    atomicWriteJsonSync(path.join(__dirname, "stats.json"), {});
}
let stats = JSON.parse(fs.readFileSync(path.join(__dirname, "stats.json"), "utf-8"));

// حفظ تلقائي كل 30 ثانية
setInterval(() => {
    try { atomicWriteJsonSync(path.join(__dirname, "stats.json"), stats); }
    catch (error) { console.error("❌ فشل الحفظ الذري للإحصائيات:", error.message); }
}, 30000);

// ⏰ تشغيل نظام الجدولة (قفل/فتح الجروبات المجدول + الإحصائيات الأسبوعية التلقائية)
// مرة واحدة بس، شغال لأي جروب سواء بيتغطى بالبوت الأساسي أو أي بوت فرعي (تنصيب)
startScheduler(db, stats, { ownerJid: OWNER_NUMBER });

const commands = new Map();

// --- [ مجموعات البوت الأساسي الحالية ] ---
// بتتحدث لحظيًا (فتح اتصال / انضمام لجروب جديد / خروج منه)، وبتتستخدم عشان
// نمنع أي بوت فرعي (تنصيب) من الاشتغال في أي جروب البوت الأساسي موجود فيه أصلاً.
const mainBotGroups = new Set();

// حالة مشتركة صغيرة بين البوت وDashboard API. لا يتم نسخ db أو stats؛ كل
// الأطراف تستخدم نفس المراجع حتى تظل أوامر البوت الحالية كما هي.
const dashboardRuntime = {
    sock: null,
    connected: false,
    latestQr: null,
    sessionPhone: null,
    sessionName: null,
    linkMode: "auto",
    requestedPairingPhone: null,
    pairingRequested: false,
    stopped: false,
    subbots: {}
};
let dashboardServer = null;
let botStartPromise = null;
let previousCpuUsage = process.cpuUsage();
let previousCpuTime = process.hrtime.bigint();

dashboardRuntime.cpuPercent = () => {
    const current = process.cpuUsage();
    const now = process.hrtime.bigint();
    const userMicros = current.user - previousCpuUsage.user;
    const systemMicros = current.system - previousCpuUsage.system;
    const elapsedMicros = Number(now - previousCpuTime) / 1000;
    previousCpuUsage = current;
    previousCpuTime = now;
    if (!elapsedMicros) return 0;
    return Math.max(0, Math.min(100, ((userMicros + systemMicros) / elapsedMicros) * 100));
};

function persistDatabase() {
    atomicWriteJsonSync(path.join(__dirname, "database.json"), db);
}

function sessionUpdate() {
    const user = dashboardRuntime.sock?.user || {};
    dashboardRuntime.sessionPhone = user.id
        ? String(user.id).split(":")[0].split("@")[0]
        : dashboardRuntime.sessionPhone;
    dashboardRuntime.sessionName = user.name || dashboardRuntime.sessionName || null;
    dashboardServer?.publish("session:update", {
        connected: Boolean(dashboardRuntime.connected && user.id),
        phone: dashboardRuntime.sessionPhone || null,
        name: dashboardRuntime.sessionName || null
    });
}

async function stopBotProcess() {
    dashboardRuntime.stopped = true;
    dashboardRuntime.connected = false;
    const sock = dashboardRuntime.sock;
    dashboardRuntime.sock = null;
    dashboardRuntime.latestQr = null;
    sessionUpdate();
    if (sock) {
        try { sock.end?.(); } catch (_) {}
        try { sock.ws?.close?.(); } catch (_) {}
    }
}

async function resetAuthFiles() {
    await stopBotProcess();
    fs.rmSync(path.join(__dirname, "auth_info"), { recursive: true, force: true });
    dashboardRuntime.sessionPhone = null;
    dashboardRuntime.sessionName = null;
    dashboardRuntime.latestQr = null;
    sessionUpdate();
}

async function startDashboardBot() {
    dashboardRuntime.stopped = false;
    dashboardRuntime.linkMode = "auto";
    dashboardRuntime.pairingRequested = false;
    return startBot();
}

async function requestPairingCode(phone) {
    dashboardRuntime.stopped = false;
    dashboardRuntime.linkMode = "pairing";
    dashboardRuntime.requestedPairingPhone = phone;
    dashboardRuntime.pairingRequested = true;
    let sock = dashboardRuntime.sock;
    if (sock?.authState?.creds?.registered) {
        await resetAuthFiles();
        dashboardRuntime.stopped = false;
        dashboardRuntime.linkMode = "pairing";
        sock = null;
    }
    if (!sock) sock = await startBot();
    if (!sock?.authState?.creds?.registered) {
        const code = await sock.requestPairingCode(phone);
        const formatted = code?.match(/.{1,4}/g)?.join("-") || code;
        dashboardRuntime.lastPairingCode = formatted;
        return formatted;
    }
    throw new Error("Session is already linked");
}

async function logoutBot() {
    const sock = dashboardRuntime.sock;
    dashboardRuntime.stopped = true;
    dashboardRuntime.connected = false;
    if (sock) {
        try { await sock.logout(); } catch (_) {}
        try { sock.end?.(); } catch (_) {}
    }
    dashboardRuntime.sock = null;
    fs.rmSync(path.join(__dirname, "auth_info"), { recursive: true, force: true });
    dashboardRuntime.latestQr = null;
    sessionUpdate();
}

async function linkWithQr() {
    dashboardRuntime.linkMode = "qr";
    dashboardRuntime.pairingRequested = false;
    dashboardRuntime.latestQr = null;
    await resetAuthFiles();
    dashboardRuntime.stopped = false;
    dashboardRuntime.linkMode = "qr";
    await startBot();
    return true;
}

// --- [ تصدير المراجع المشتركة عشان نظام البوتات الفرعية (.تنصيب) يقدر يستخدمها ] ---
// ملحوظة: بنصدّر المراجع (db, stats, commands, mainBotGroups) مش نسخ منها، فأي تعديل عليها من أي مكان بينعكس هنا تلقائيًا.
module.exports = { db, stats, commands, OWNER_IDS, MASTER_OWNER_ID, mainBotGroups };

// --- [ تحميل الأوامر ] ---
const commandsRoot = path.join(__dirname, 'commands');
const loadCommandsRecursive = (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            loadCommandsRecursive(fullPath);
        } else if (file.endsWith('.js')) {
            try {
                delete require.cache[require.resolve(fullPath)];
                const command = require(fullPath);
                if (command.name) {
                    // بنسجل الفولدر الرئيسي اللي الأمر جاي منه (admin / owners / RPG / ...)
                    // ده بيتستخدم في core/messageHandler.js عشان يمنع البوتات الفرعية من أوامر admin/owners
                    const rel = path.relative(commandsRoot, fullPath);
                    command.__dir = rel.includes(path.sep) ? rel.split(path.sep)[0] : '';
                    commands.set(command.name, command);
                    if (command.aliases) {
                        command.aliases.forEach(alias => commands.set(alias, command));
                    }
                }
            } catch (e) { console.error(`❌ خطأ في تحميل ${file}:`, e); }
        }
    }
};

async function startBot() {
    if (dashboardRuntime.stopped) return dashboardRuntime.sock;
    if (botStartPromise) return botStartPromise;
    botStartPromise = (async () => {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const version = await getCurrentWaVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        logger: pino({ level: 'silent' }),
        browser: Browsers.ubuntu("Chrome"),
        syncFullHistory: false,
        markOnlineOnConnect: true
    });
    dashboardRuntime.sock = sock;
    dashboardRuntime.connected = false;
    dashboardRuntime.latestQr = null;
    sessionUpdate();

    // تحميل الأوامر
    loadCommandsRecursive(path.join(__dirname, 'commands'));
    if (!dashboardServer) {
        dashboardServer = createDashboardServer({
            rootDir: __dirname,
            db,
            stats,
            commands,
            runtime: dashboardRuntime,
            getSocket: () => dashboardRuntime.sock,
            actions: {
                start: startDashboardBot,
                stop: stopBotProcess,
                restart: async () => {
                    await stopBotProcess();
                    dashboardRuntime.stopped = false;
                    dashboardRuntime.linkMode = "auto";
                    await startBot();
                },
                linkQr: linkWithQr,
                pairingCode: requestPairingCode,
                logout: logoutBot,
                reset: resetAuthFiles,
                removeSubbot: async (id) => {
                    const subbotManager = require("./subbots/subbotManager.js");
                    await subbotManager.removeSubBot(id, db);
                }
            }
        });
        await dashboardServer.start();
    }

    // --- [ معالجة الاتصال + حفظ بيانات الاعتماد ] ---
    // ⚠️ مهم: بنسجّل الـ listeners دي *قبل* أي طلب لكود الربط، عشان مفيش أي creds.update
    // ممكن يفوتنا أثناء الـ delay/الطلب. ده كان بيسبب إن الربط أحياناً ميتحفظش صح
    // ويرجع يطلب كود تاني بعد أي إعادة تشغيل.
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (update.qr && dashboardRuntime.linkMode === "qr") {
            // بنبعت نص الـ QR الخام زي ما هو - التحويل لصورة بيحصل في المتصفح
            // (dashboard-ui) عشان السيرفر مايحتاجش أي مكتبة QR تعمل مشاكل على Termux/Railway.
            dashboardRuntime.latestQr = update.qr;
            dashboardServer?.publish("qr", { qr: update.qr });
        }
        if (connection === 'close') {
            if (dashboardRuntime.sock === sock) dashboardRuntime.sock = null;
            dashboardRuntime.connected = false;
            dashboardRuntime.latestQr = null;
            sessionUpdate();
            const shouldRestart = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldRestart && !dashboardRuntime.stopped) startBot();
        } else if (connection === 'open') {
            dashboardRuntime.connected = true;
            dashboardRuntime.latestQr = null;
            sessionUpdate();
            console.log(`\n✅ نِظَامِ آيـس نَشِط | الأوامر: ${commands.size}`);

            // 📋 نجيب كل الجروبات اللي البوت الأساسي عضو فيها دلوقتي، عشان نعرف
            // نمنع البوتات الفرعية من الاشتغال فيها.
            (async () => {
                try {
                    const groups = await sock.groupFetchAllParticipating();
                    mainBotGroups.clear();
                    Object.keys(groups).forEach(gid => mainBotGroups.add(gid));
                    console.log(`📋 البوت الأساسي عضو في ${mainBotGroups.size} جروب.`);
                } catch (e) {
                    console.error('❌ تعذر جلب قائمة جروبات البوت الأساسي:', e);
                }
            })();

            // إعادة تشغيل أي بوتات فرعية (تنصيب) كانت شغالة قبل إعادة تشغيل البوت الأساسي
            if (!subBotsRestored) {
                subBotsRestored = true;
                const subbotManager = require('./subbots/subbotManager.js');
                subbotManager.restoreSubBots({ db, stats, commands, ownerIds: OWNER_IDS, masterOwnerId: MASTER_OWNER_ID, mainBotGroups })
                    .catch(e => console.error('❌ خطأ في استرجاع البوتات الفرعية:', e));
            }
        }
    });

    // 🆕 انضمام البوت الأساسي لجروب جديد (أو تحميل أولي لجروباته عند فتح الاتصال)
    sock.ev.on('groups.upsert', (newGroups) => {
        newGroups.forEach(g => { if (g?.id) mainBotGroups.add(g.id); });
    });

    // 🚪 لو البوت الأساسي نفسه اتشال من جروب أو مغادره، نشيله من القائمة عشان
    // البوتات الفرعية تقدر تشتغل فيه تاني لو محدش من الأساسي موجود فيه
    sock.ev.on('group-participants.update', (update) => {
        if (update.action !== 'remove' && update.action !== 'leave') return;
        const selfNumber = extractPureNumber(sock.user?.id);
        const wasRemoved = update.participants?.some(p => extractPureNumber(p) === selfNumber);
        if (wasRemoved) mainBotGroups.delete(update.id);
    });

    // 👋 نظام الترحيب بالأعضاء الجدد ووداع اللي بيمشوا (شغال بنفس الشكل على البوت الأساسي)
    sock.ev.on('group-participants.update', createGroupParticipantsHandler(sock, { db, restricted: false }));

    sock.ev.on('creds.update', saveCreds);

    // --- [ نظام الربط بالكود ] ---
    // ملحوظة تشغيل مهمة: لو البوت بيطلب كود ربط جديد في كل إعادة تشغيل رغم إنه اترّبط قبل كده،
    // السبب الشائع هو إن فولدر auth_info بتاع Baileys مش محفوظ على تخزين دائم (لو مستضاف على
    // Railway مثلاً، لازم تعمل Volume وتربطه على مسار المشروع عشان auth_info و auth_info_subs
    // ميتمسحوش مع كل إعادة نشر/تشغيل).
    if (!sock.authState.creds.registered) {
        console.log(`\n❄️ جاري تهيئة الاتصال للرقم: ${phoneNumber}`);
        if (dashboardRuntime.linkMode !== "qr" && !dashboardRuntime.pairingRequested) {
            if (dashboardRuntime.linkMode !== "pairing") await delay(10000);
            try {
                const pairingPhone = dashboardRuntime.requestedPairingPhone || phoneNumber;
                const code = await sock.requestPairingCode(pairingPhone);
                const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
                dashboardRuntime.lastPairingCode = formattedCode;
                console.log(`\n✅ كود الربط:  【 ${formattedCode} 】\n`);
            } catch (error) {
                console.log("❌ فشل طلب الكود، جرب إعادة التشغيل.");
            }
        }
    }

    // --- [ رادار الرسائل (الأوامر والفعاليات) ] ---
    sock.ev.on('messages.upsert', createMessageHandler(sock, {
        db,
        stats,
        commands,
        ownerIds: OWNER_IDS,
        masterOwnerId: MASTER_OWNER_ID,
        mainBotGroups,
        restricted: false // ده البوت الأساسي، عنده كل الصلاحيات
    }));
    return sock;
    })();

    try {
        return await botStartPromise;
    } finally {
        botStartPromise = null;
    }
}

let subBotsRestored = false;
startBot();