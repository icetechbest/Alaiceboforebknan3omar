const http = require("http");
const os = require("os");
const path = require("path");
const fs = require("fs");
const util = require("util");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");
const { createApp, serveStatic, jsonBody, urlencodedBody, multipartSingle } = require("./mini-http");
const {
    atomicWriteFileSync,
    atomicWriteJsonSync,
    replaceObjectContents
} = require("./storage");

// Railway (وأي منصة استضافة سحابية بتشتغل بنفس الفكرة) بتحدد رقم البورت
// المطلوب الاستماع عليه عن طريق متغيّر البيئة PORT تلقائيًا. لو مش موجود
// (تشغيل محلي عادي على جهازك) بنرجع لـ DASHBOARD_PORT ثم 3030 كقيمة افتراضية.
const DEFAULT_PORT = Number(process.env.PORT || process.env.DASHBOARD_PORT || 3030);
const MAX_LOG_LINES = 2000;
const MAX_SECURITY_EVENTS = 500;
const PLAYER_FIELDS = new Set([
    "name", "level", "gold", "xp", "hp", "maxHp", "atk", "def", "defense",
    "inventory", "pets", "currentPet", "class", "birthday", "registeredAt",
    "description", "title", "pvpWins", "ambushWins", "huntCount"
]);
const INTERNAL_DB_KEYS = new Set([
    "users", "gangs", "gangInvites", "banned", "bannedGroups", "owners",
    "whitelist", "blacklist", "customReplies", "cooldowns", "allianceRequests",
    "settings", "scheduledMessages", "subbots", "treasury", "marketplace",
    "puzzles", "complaints", "inviteIntents", "pendingMenu", "lidMap"
]);

function clone(value) {
    return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function normalizeNumber(value) {
    return String(value || "").trim().replace(/[^\d+]/g, "").replace(/^\+/, "");
}

function jidForNumber(value) {
    const text = String(value || "").trim();
    if (text.includes("@")) return text;
    const digits = normalizeNumber(text);
    return digits ? `${digits}@s.whatsapp.net` : text;
}

function findPlayerId(db, value) {
    const wanted = String(value || "").trim();
    if (db[wanted] && typeof db[wanted] === "object") return wanted;
    const digits = normalizeNumber(wanted);
    return Object.keys(db).find((id) =>
        /@(s\.whatsapp\.net|lid)$/.test(id) && normalizeNumber(id) === digits
    ) || jidForNumber(wanted);
}

function playerEntries(db) {
    return Object.entries(db).filter(([id, value]) =>
        !INTERNAL_DB_KEYS.has(id) &&
        /@(s\.whatsapp\.net|lid)$/.test(id) &&
        value && typeof value === "object" && !Array.isArray(value)
    );
}

function groupIds(db) {
    return Object.keys(db).filter((id) => id.endsWith("@g.us") && db[id] && typeof db[id] === "object");
}

function ensureDashboardSettings(db) {
    db.settings ??= {};
    db.settings.dashboard ??= {};
    db.settings.dashboard.commands ??= {};
    db.settings.dashboard.commandUsage ??= {};
    db.settings.dashboard.shop ??= {};
    db.settings.dashboard.maintenance ??= { enabled: false, message: "" };
    return db.settings.dashboard;
}

function ensureDbShape(db) {
    db.settings ??= {};
    db.banned ??= [];
    db.bannedGroups ??= [];
    db.owners ??= [];
    db.scheduledMessages ??= [];
    db.subbots ??= {};
    db.users ??= {};
    db.gangs ??= {};
    return db;
}

function getCommandList(commands) {
    const seen = new Set();
    const result = [];
    for (const command of commands.values()) {
        if (!command || !command.name || seen.has(command.name)) continue;
        seen.add(command.name);
        result.push(command);
    }
    return result;
}

function csvCell(value) {
    const text = value === undefined || value === null ? "" : String(value);
    return `"${text.replace(/"/g, "\"\"")}"`;
}

function parseScheduleTime(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value);
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : NaN;
}

function createDashboardServer(options = {}) {
    const rootDir = path.resolve(options.rootDir || path.join(__dirname, ".."));
    const db = options.db || {};
    const stats = options.stats || {};
    const commands = options.commands || new Map();
    const runtime = options.runtime || {};
    const actions = options.actions || {};
    const dbPath = path.join(rootDir, "database.json");
    const statsPath = path.join(rootDir, "stats.json");
    const backupDir = path.join(rootDir, "backups");
    const logPath = path.join(rootDir, "dashboard-server.log");
    // الواجهة static مدمجة في جذر المشروع داخل dashboard-ui/
    const publicDir = path.join(rootDir, "dashboard-ui");
    const securityAttempts = [];
    const logLines = [];
    const errorLines = [];
    const clients = new Set();
    const app = createApp();
    const server = http.createServer((req, res) => app.handle(req, res));
    const wss = new WebSocketServer({ noServer: true });
    const upload = {
        single: (fieldName) => multipartSingle(fieldName, { limits: { fileSize: 25 * 1024 * 1024 } })
    };

    let listening = false;
    let originalConsole;
    ensureDbShape(db);

    function dashboardKey() {
        const key = process.env.DASHBOARD_KEY;
        if (!key || key.length < 16) {
            throw new Error("DASHBOARD_KEY is required and must be at least 16 characters");
        }
        return key;
    }

    function publish(event, payload) {
        const message = JSON.stringify({
            event,
            ...(payload && typeof payload === "object" ? payload : { data: payload })
        });
        for (const client of clients) {
            if (client.readyState === 1) {
                try { client.send(message); } catch (_) {}
            }
        }
    }

    runtime.publish = publish;

    function recordSecurityAttempt(req) {
        const event = {
            timestamp: new Date().toISOString(),
            ip: req.socket?.remoteAddress || "unknown",
            method: req.method,
            path: req.originalUrl
        };
        securityAttempts.unshift(event);
        if (securityAttempts.length > MAX_SECURITY_EVENTS) securityAttempts.pop();
        writeLog("warn", `Unauthorized dashboard request: ${req.method} ${req.originalUrl}`);
    }

    function authorized(req) {
        const supplied = req.get("x-dashboard-key") || req.query.key;
        const expected = dashboardKey();
        if (!supplied || supplied.length !== expected.length) return false;
        return crypto.timingSafeEqual(Buffer.from(String(supplied)), Buffer.from(expected));
    }

    function authMiddleware(req, res, next) {
        if (!authorized(req)) {
            recordSecurityAttempt(req);
            return res.status(401).json({ error: "Unauthorized" });
        }
        next();
    }

    function writeLog(level, message) {
        const line = {
            level,
            message: String(message),
            timestamp: new Date().toISOString()
        };
        logLines.push(line);
        if (logLines.length > MAX_LOG_LINES) logLines.shift();
        if (level === "error") {
            errorLines.push(line);
            if (errorLines.length > MAX_LOG_LINES) errorLines.shift();
        }
        try {
            fs.appendFileSync(logPath, `[${line.timestamp}] ${level.toUpperCase()} ${line.message}\n`);
        } catch (_) {}
        publish("log:line", line);
    }

    function installLogCapture() {
        if (originalConsole) return;
        originalConsole = {
            log: console.log.bind(console),
            info: console.info.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console)
        };
        const wrap = (level) => (...args) => {
            const message = util.format(...args);
            writeLog(level, message);
            originalConsole[level](...args);
        };
        console.log = wrap("log");
        console.info = wrap("info");
        console.warn = wrap("warn");
        console.error = wrap("error");
    }

    function persistDb() {
        atomicWriteJsonSync(dbPath, db);
    }

    function persistStats() {
        atomicWriteJsonSync(statsPath, stats);
    }

    function ensureBackupDir() {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    function backupDatabase() {
        ensureBackupDir();
        const id = `database-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(4).toString("hex")}`;
        const filePath = path.join(backupDir, `${id}.json`);
        atomicWriteFileSync(filePath, JSON.stringify(db, null, 2));
        return {
            id,
            fileUrl: `/api/backup/download/${encodeURIComponent(id)}`
        };
    }

    function dashboardShop() {
        const settings = ensureDashboardSettings(db);
        if (Object.keys(settings.shop).length === 0) {
            try {
                const { ITEMS } = require(path.join(rootDir, "data", "shopItems.js"));
                settings.shop = clone(ITEMS) || {};
            } catch (_) {
                settings.shop = {};
            }
        }
        return settings.shop;
    }

    function commandResponse(command) {
        const settings = ensureDashboardSettings(db);
        const override = settings.commands[command.name] || {};
        return {
            name: command.name,
            category: command.category || command.__dir || "general",
            enabled: override.enabled !== false,
            aliases: override.aliases || command.aliases || [],
            usageCount: Number(settings.commandUsage[command.name] || 0),
            replyText: override.replyText || ""
        };
    }

    async function groupRows() {
        let metadata = {};
        if (typeof options.getSocket === "function" && options.getSocket()) {
            try { metadata = await options.getSocket().groupFetchAllParticipating(); } catch (_) {}
        }
        const ids = [...new Set([
            ...groupIds(db),
            ...Object.keys(metadata).filter((id) => id.endsWith("@g.us"))
        ])];
        return ids.map((id) => {
            const cfg = db[id] || {};
            const meta = metadata[id] || {};
            return {
                id,
                name: meta.subject || cfg.name || cfg.subject || id,
                participantsCount: Array.isArray(meta.participants)
                    ? meta.participants.length
                    : Number(cfg.participantsCount || cfg.membersCount || 0),
                enabled: cfg.dashboardEnabled !== false,
                settings: clone(cfg.dashboardSettings || cfg.settings || {})
            };
        });
    }

    function sessionStatus() {
        const sock = typeof options.getSocket === "function" ? options.getSocket() : runtime.sock;
        const user = sock?.user || {};
        const phone = user.id ? String(user.id).split(":")[0].split("@")[0] : runtime.sessionPhone || null;
        return {
            connected: Boolean(sock && runtime.connected !== false && user.id),
            phone,
            name: user.name || runtime.sessionName || null,
            hasQr: Boolean(runtime.latestQr)
        };
    }

    function botStatus() {
        const today = new Date();
        const dayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
        let messagesToday = 0;
        let messagesTotal = 0;
        for (const [id, entry] of Object.entries(stats)) {
            if (id.endsWith("@g.us") || !entry || typeof entry !== "object") continue;
            messagesToday += Number(entry.daily?.[dayKey] || 0);
            messagesTotal += Number(entry.total || 0);
        }
        const cpu = typeof runtime.cpuPercent === "function" ? runtime.cpuPercent() : 0;
        const dashboard = ensureDashboardSettings(db);
        return {
            uptimeSec: Math.floor(process.uptime()),
            ramMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
            cpuPercent: Number(cpu.toFixed ? cpu.toFixed(2) : cpu),
            messagesToday,
            messagesTotal,
            maintenance: clone(dashboard.maintenance || { enabled: false, message: "" })
        };
    }

    function scheduleRows() {
        return asArray(db.scheduledMessages).map((item) => ({
            ...clone(item),
            date: new Date(item.time).toISOString()
        }));
    }

    function sendError(res, status, message) {
        return res.status(status).json({ error: message });
    }

    // ملفات الواجهة يجب أن تُقدّم قبل المصادقة حتى تظهر شاشة إدخال المفتاح
    // أول مرة. الحماية تطبق على API فقط وعلى ترقية WebSocket بالأسفل.
    if (fs.existsSync(publicDir)) app.use(serveStatic(publicDir));
    app.use(authMiddleware);
    app.use(jsonBody({ limit: "5mb" }));
    app.use(urlencodedBody());

    app.get("/api/session/status", (req, res) => res.json(sessionStatus()));
    app.post("/api/session/link/qr", async (req, res) => {
        try {
            if (!actions.linkQr) return sendError(res, 501, "QR linking is not available");
            await actions.linkQr();
            res.json({ started: true, hasQr: Boolean(runtime.latestQr) });
        } catch (error) {
            sendError(res, 500, error.message);
        }
    });
    app.post("/api/session/link/pairing-code", async (req, res) => {
        const phone = normalizeNumber(req.body?.phone);
        if (!phone) return sendError(res, 400, "phone is required");
        try {
            if (!actions.pairingCode) return sendError(res, 501, "Pairing code is not available");
            const code = await actions.pairingCode(phone);
            res.json({ code });
        } catch (error) {
            sendError(res, 500, error.message);
        }
    });
    app.post("/api/session/logout", async (req, res) => {
        try {
            await actions.logout?.();
            res.json({ ok: true });
        } catch (error) { sendError(res, 500, error.message); }
    });
    app.post("/api/session/reset", async (req, res) => {
        try {
            await actions.reset?.();
            res.json({ ok: true });
        } catch (error) { sendError(res, 500, error.message); }
    });

    app.post("/api/bot/start", async (req, res) => {
        try { await actions.start?.(); res.json({ ok: true }); }
        catch (error) { sendError(res, 500, error.message); }
    });
    app.post("/api/bot/stop", async (req, res) => {
        try { await actions.stop?.(); res.json({ ok: true }); }
        catch (error) { sendError(res, 500, error.message); }
    });
    app.post("/api/bot/restart", async (req, res) => {
        try { await actions.restart?.(); res.json({ ok: true }); }
        catch (error) { sendError(res, 500, error.message); }
    });
    app.post("/api/bot/maintenance", (req, res) => {
        const enabled = Boolean(req.body?.enabled);
        const dashboard = ensureDashboardSettings(db);
        dashboard.maintenance = { enabled, message: String(req.body?.message || "") };
        persistDb();
        res.json(dashboard.maintenance);
    });
    app.get("/api/bot/status", (req, res) => res.json(botStatus()));

    app.post("/api/backup/create", (req, res) => {
        try { res.json(backupDatabase()); }
        catch (error) { sendError(res, 500, error.message); }
    });
    app.get("/api/backup/list", (req, res) => {
        ensureBackupDir();
        const files = fs.readdirSync(backupDir)
            .filter((name) => /^database-.+\.json$/.test(name))
            .map((name) => {
                const stat = fs.statSync(path.join(backupDir, name));
                return {
                    id: name.slice(0, -5),
                    date: stat.mtime.toISOString(),
                    sizeKB: Number((stat.size / 1024).toFixed(2))
                };
            })
            .sort((a, b) => b.date.localeCompare(a.date));
        res.json(files);
    });
    app.post("/api/backup/restore/:id", (req, res) => {
        try {
            const id = path.basename(req.params.id);
            const source = path.join(backupDir, `${id}.json`);
            if (!fs.existsSync(source)) return sendError(res, 404, "Backup not found");
            const parsed = JSON.parse(fs.readFileSync(source, "utf8"));
            backupDatabase();
            replaceObjectContents(db, parsed);
            ensureDbShape(db);
            persistDb();
            res.json({ ok: true, id });
        } catch (error) { sendError(res, 400, error.message); }
    });
    app.get("/api/backup/download/:id", (req, res) => {
        const id = path.basename(req.params.id);
        const filePath = path.join(backupDir, `${id}.json`);
        if (!fs.existsSync(filePath)) return sendError(res, 404, "Backup not found");
        res.download(filePath, `${id}.json`);
    });
    app.get("/api/database/export", (req, res) => {
        persistDb();
        res.download(dbPath, "database.json");
    });
    app.post("/api/database/import", upload.single("file"), (req, res) => {
        if (!req.file) return sendError(res, 400, "multipart field 'file' is required");
        try {
            const parsed = JSON.parse(req.file.buffer.toString("utf8"));
            if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
                return sendError(res, 400, "database must be a JSON object");
            }
            backupDatabase();
            replaceObjectContents(db, parsed);
            ensureDbShape(db);
            persistDb();
            res.json({ ok: true });
        } catch (error) { sendError(res, 400, `Invalid database JSON: ${error.message}`); }
    });

    app.get("/api/players", (req, res) => {
        const search = String(req.query.search || "").toLowerCase();
        const sort = String(req.query.sort || "registeredAt");
        const page = Math.max(1, Number(req.query.page) || 1);
        const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
        let rows = playerEntries(db).map(([id, player]) => ({ id, ...clone(player) }));
        if (search) rows = rows.filter((row) => `${row.id} ${row.name || ""}`.toLowerCase().includes(search));
        rows.sort((a, b) => {
            const av = a[sort] ?? "";
            const bv = b[sort] ?? "";
            if (typeof av === "number" && typeof bv === "number") return bv - av;
            return String(av).localeCompare(String(bv));
        });
        const total = rows.length;
        res.json({ data: rows.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total });
    });
    app.get("/api/players/export", (req, res) => {
        const rows = playerEntries(db);
        const fields = ["id", "name", "level", "gold", "xp", "class", "registeredAt"];
        const csv = [
            fields.join(","),
            ...rows.map(([id, player]) => fields.map((field) => csvCell(field === "id" ? id : player[field])).join(","))
        ].join("\n");
        res.set("Content-Type", "text/csv; charset=utf-8");
        res.set("Content-Disposition", 'attachment; filename="players.csv"');
        res.send(`\uFEFF${csv}`);
    });
    app.get("/api/players/:id", (req, res) => {
        const id = findPlayerId(db, decodeURIComponent(req.params.id));
        if (!db[id] || !/@(s\.whatsapp\.net|lid)$/.test(id)) return sendError(res, 404, "Player not found");
        res.json({ id, ...clone(db[id]) });
    });
    app.patch("/api/players/:id", (req, res) => {
        const id = findPlayerId(db, decodeURIComponent(req.params.id));
        if (!db[id] || !/@(s\.whatsapp\.net|lid)$/.test(id)) return sendError(res, 404, "Player not found");
        const updates = req.body && typeof req.body === "object" ? req.body : {};
        for (const [key, value] of Object.entries(updates)) {
            if (PLAYER_FIELDS.has(key)) db[id][key] = value;
        }
        persistDb();
        res.json({ id, ...clone(db[id]) });
    });
    app.post("/api/players/:id/ban", (req, res) => {
        const id = findPlayerId(db, decodeURIComponent(req.params.id));
        if (!db[id]) return sendError(res, 404, "Player not found");
        db.banned = asArray(db.banned);
        if (!db.banned.includes(id)) db.banned.push(id);
        persistDb();
        res.json({ id, banned: true });
    });
    app.post("/api/players/:id/unban", (req, res) => {
        const id = findPlayerId(db, decodeURIComponent(req.params.id));
        db.banned = asArray(db.banned).filter((item) => item !== id);
        persistDb();
        res.json({ id, banned: false });
    });
    app.delete("/api/players/:id", (req, res) => {
        const id = findPlayerId(db, decodeURIComponent(req.params.id));
        if (!db[id]) return sendError(res, 404, "Player not found");
        delete db[id];
        if (db.users && typeof db.users === "object") delete db.users[id];
        persistDb();
        res.json({ ok: true, id });
    });

    app.get("/api/groups", async (req, res) => {
        try { res.json(await groupRows()); }
        catch (error) { sendError(res, 500, error.message); }
    });
    app.patch("/api/groups/:id", (req, res) => {
        const id = decodeURIComponent(req.params.id);
        if (!id.endsWith("@g.us")) return sendError(res, 400, "Invalid group id");
        db[id] ??= {};
        if (req.body && Object.prototype.hasOwnProperty.call(req.body, "enabled")) {
            db[id].dashboardEnabled = Boolean(req.body.enabled);
        }
        if (req.body?.settings && typeof req.body.settings === "object") {
            db[id].dashboardSettings = { ...(db[id].dashboardSettings || {}), ...req.body.settings };
        }
        persistDb();
        res.json({ id, enabled: db[id].dashboardEnabled !== false, settings: clone(db[id].dashboardSettings || {}) });
    });
    app.post("/api/groups/:id/leave", async (req, res) => {
        try {
            const sock = options.getSocket?.();
            if (!sock) return sendError(res, 503, "Bot is not connected");
            await sock.groupLeave(decodeURIComponent(req.params.id));
            res.json({ ok: true });
        } catch (error) { sendError(res, 500, error.message); }
    });
    app.post("/api/groups/:id/block", (req, res) => {
        const id = decodeURIComponent(req.params.id);
        db.bannedGroups = asArray(db.bannedGroups);
        if (!db.bannedGroups.includes(id)) db.bannedGroups.push(id);
        persistDb();
        res.json({ id, blocked: true });
    });
    app.post("/api/groups/:id/unblock", (req, res) => {
        const id = decodeURIComponent(req.params.id);
        db.bannedGroups = asArray(db.bannedGroups).filter((item) => item !== id);
        persistDb();
        res.json({ id, blocked: false });
    });

    app.get("/api/commands", (req, res) => {
        res.json(getCommandList(commands).map(commandResponse));
    });
    app.patch("/api/commands/:name", (req, res) => {
        const name = decodeURIComponent(req.params.name);
        const command = getCommandList(commands).find((item) => item.name === name);
        if (!command) return sendError(res, 404, "Command not found");
        const dashboard = ensureDashboardSettings(db);
        const old = dashboard.commands[name] || {};
        dashboard.commands[name] = {
            ...old,
            ...(Object.prototype.hasOwnProperty.call(req.body || {}, "enabled") ? { enabled: Boolean(req.body.enabled) } : {}),
            ...(Object.prototype.hasOwnProperty.call(req.body || {}, "replyText") ? { replyText: String(req.body.replyText || "") } : {}),
            ...(Array.isArray(req.body?.aliases) ? { aliases: req.body.aliases.map(String) } : {})
        };
        if (Array.isArray(req.body?.aliases)) {
            for (const [key, value] of commands.entries()) {
                if (value === command && key !== command.name) commands.delete(key);
            }
            command.aliases = req.body.aliases.map(String);
            for (const alias of command.aliases) commands.set(alias, command);
        }
        persistDb();
        res.json(commandResponse(command));
    });

    app.get("/api/economy/treasury", (req, res) => res.json({ balance: Number(db.treasury || 0) }));
    app.post("/api/economy/treasury/withdraw", (req, res) => {
        const amount = Number(req.body?.amount);
        if (!Number.isFinite(amount) || amount <= 0) return sendError(res, 400, "amount must be positive");
        if (amount > Number(db.treasury || 0)) return sendError(res, 400, "Insufficient treasury balance");
        const targetId = findPlayerId(db, req.body?.targetId);
        if (!db[targetId]) return sendError(res, 404, "Target player not found");
        db.treasury = Number(db.treasury || 0) - amount;
        db[targetId].gold = Number(db[targetId].gold || 0) + amount;
        persistDb();
        res.json({ balance: db.treasury, targetId, amount });
    });
    app.get("/api/economy/shop", (req, res) => {
        res.json(Object.entries(dashboardShop()).map(([id, item]) => ({ id, ...clone(item) })));
    });
    app.patch("/api/economy/shop/:itemId", (req, res) => {
        const shop = dashboardShop();
        const id = decodeURIComponent(req.params.itemId);
        if (!shop[id]) return sendError(res, 404, "Shop item not found");
        shop[id] = { ...shop[id], ...(req.body || {}) };
        persistDb();
        res.json({ id, ...clone(shop[id]) });
    });
    app.post("/api/economy/shop", (req, res) => {
        const shop = dashboardShop();
        const id = String(req.body?.id || (Math.max(0, ...Object.keys(shop).map(Number).filter(Number.isFinite)) + 1));
        if (!req.body?.name) return sendError(res, 400, "name is required");
        shop[id] = { ...req.body };
        delete shop[id].id;
        persistDb();
        res.status(201).json({ id, ...clone(shop[id]) });
    });
    app.delete("/api/economy/shop/:itemId", (req, res) => {
        const shop = dashboardShop();
        const id = decodeURIComponent(req.params.itemId);
        if (!shop[id]) return sendError(res, 404, "Shop item not found");
        delete shop[id];
        persistDb();
        res.json({ ok: true, id });
    });

    app.get("/api/logs/errors", (req, res) => {
        const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
        res.json(errorLines.slice(-limit).reverse());
    });
    app.get("/api/logs/download", (req, res) => {
        if (!fs.existsSync(logPath)) atomicWriteFileSync(logPath, "");
        res.download(logPath, "dashboard-server.log");
    });

    app.post("/api/broadcast/all", async (req, res) => {
        const text = String(req.body?.text || "").trim();
        if (!text) return sendError(res, 400, "text is required");
        const sock = options.getSocket?.();
        if (!sock) return sendError(res, 503, "Bot is not connected");
        const ids = groupIds(db);
        const results = [];
        for (const id of ids) {
            try { await sock.sendMessage(id, { text }); results.push({ id, ok: true }); }
            catch (error) { results.push({ id, ok: false, error: error.message }); }
        }
        res.json({ sent: results.filter((item) => item.ok).length, total: ids.length, results });
    });
    app.post("/api/broadcast/group", async (req, res) => {
        const groupId = String(req.body?.groupId || "");
        const text = String(req.body?.text || "").trim();
        if (!groupId || !text) return sendError(res, 400, "groupId and text are required");
        const sock = options.getSocket?.();
        if (!sock) return sendError(res, 503, "Bot is not connected");
        try { await sock.sendMessage(groupId, { text }); res.json({ ok: true, groupId }); }
        catch (error) { sendError(res, 500, error.message); }
    });
    app.get("/api/schedule", (req, res) => res.json(scheduleRows()));
    app.post("/api/schedule", (req, res) => {
        const time = parseScheduleTime(req.body?.time);
        const target = String(req.body?.target || "");
        const text = String(req.body?.text || "").trim();
        if (!Number.isFinite(time) || time <= Date.now()) return sendError(res, 400, "time must be a future date or timestamp");
        if (!target || !text) return sendError(res, 400, "target and text are required");
        const targets = target === "all" ? groupIds(db) : [target];
        if (targets.length === 0) return sendError(res, 400, "No target groups found");
        db.scheduledMessages = asArray(db.scheduledMessages);
        const items = targets.map((groupID) => ({
            id: crypto.randomUUID(),
            time,
            groupID,
            text,
            createdAt: Date.now()
        }));
        db.scheduledMessages.push(...items);
        persistDb();
        res.status(201).json(items.length === 1 ? items[0] : items);
    });
    app.delete("/api/schedule/:id", (req, res) => {
        const id = decodeURIComponent(req.params.id);
        const before = asArray(db.scheduledMessages);
        db.scheduledMessages = before.filter((item) => item.id !== id);
        if (before.length === db.scheduledMessages.length) return sendError(res, 404, "Schedule not found");
        persistDb();
        res.json({ ok: true, id });
    });

    function listSetting(name) {
        return asArray(db[name]);
    }
    function addNumberSetting(name, number) {
        const value = normalizeNumber(number);
        if (!value) throw new Error("number is required");
        db[name] = listSetting(name);
        const jid = jidForNumber(value);
        if (!db[name].includes(jid) && !db[name].includes(value)) db[name].push(jid);
        persistDb();
        return db[name];
    }
    function removeNumberSetting(name, number) {
        const raw = String(number || "").trim();
        const digits = normalizeNumber(raw);
        db[name] = listSetting(name).filter((item) => normalizeNumber(item) !== digits);
        persistDb();
        return db[name];
    }
    app.get("/api/owners", (req, res) => res.json(listSetting("owners")));
    app.post("/api/owners", (req, res) => {
        try { res.status(201).json(addNumberSetting("owners", req.body?.number)); }
        catch (error) { sendError(res, 400, error.message); }
    });
    app.delete("/api/owners/:number", (req, res) => res.json(removeNumberSetting("owners", decodeURIComponent(req.params.number))));
    for (const name of ["whitelist", "blacklist"]) {
        app.get(`/api/${name}`, (req, res) => res.json(listSetting(name)));
        app.post(`/api/${name}`, (req, res) => {
            try { res.status(201).json(addNumberSetting(name, req.body?.number)); }
            catch (error) { sendError(res, 400, error.message); }
        });
        app.delete(`/api/${name}/:number`, (req, res) => res.json(removeNumberSetting(name, decodeURIComponent(req.params.number))));
    }
    app.get("/api/security/unauthorized-attempts", (req, res) => res.json(securityAttempts));

    app.get("/api/subbots", (req, res) => {
        const registry = db.subbots || {};
        const rows = Array.isArray(registry)
            ? registry.map((item) => ({ id: item.id || item.phone, ...item }))
            : Object.entries(registry).map(([id, item]) => ({
                id,
                phone: item.phone || id,
                status: runtime.subbots?.[id]?.status || "registered",
                connectedAt: item.connectedAt || item.createdAt || null
            }));
        res.json(rows);
    });
    app.delete("/api/subbots/:id", async (req, res) => {
        const id = decodeURIComponent(req.params.id);
        try {
            if (actions.removeSubbot) await actions.removeSubbot(id);
            else if (db.subbots && !Array.isArray(db.subbots)) delete db.subbots[id];
            persistDb();
            res.json({ ok: true, id });
        } catch (error) { sendError(res, 500, error.message); }
    });

    app.get("/api/stats/activity", (req, res) => {
        const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
        const totals = {};
        for (const [id, entry] of Object.entries(stats)) {
            if (id.endsWith("@g.us") || !entry?.daily) continue;
            for (const [date, count] of Object.entries(entry.daily)) totals[date] = (totals[date] || 0) + Number(count || 0);
        }
        const result = [];
        for (let index = days - 1; index >= 0; index--) {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - index);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            result.push({ date: key, count: totals[key] || 0 });
        }
        res.json(result);
    });
    app.get("/api/stats/top-groups", (req, res) => {
        const rows = Object.entries(stats)
            .filter(([id, value]) => id.endsWith("@g.us") && value && typeof value === "object")
            .map(([id, value]) => ({
                id,
                count: Object.values(value).reduce((sum, entry) => sum + Number(entry?.total || 0), 0),
                name: db[id]?.name || db[id]?.subject || id
            }))
            .sort((a, b) => b.count - a.count);
        res.json(rows);
    });
    app.get("/api/stats/top-commands", (req, res) => {
        const dashboard = ensureDashboardSettings(db);
        const rows = Object.entries(dashboard.commandUsage)
            .map(([name, count]) => ({ name, usageCount: Number(count || 0) }))
            .sort((a, b) => b.usageCount - a.usageCount);
        res.json(rows);
    });
    app.get("/api/stats/new-players", (req, res) => {
        const days = Math.min(3650, Math.max(1, Number(req.query.days) || 30));
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        res.json(playerEntries(db)
            .filter(([, player]) => Number(player.registeredAt || 0) >= cutoff)
            .map(([id, player]) => ({ id, name: player.name || "", registeredAt: player.registeredAt })));
    });

    app.get("/api/settings", (req, res) => {
        const settings = db.settings || {};
        res.json({
            botName: settings.botName || "",
            welcomeMessage: settings.welcomeMessage || "",
            antiFloodEnabled: settings.antiFloodEnabled !== false,
            cooldowns: clone(settings.cooldowns || {})
        });
    });
    app.patch("/api/settings", (req, res) => {
        db.settings ??= {};
        for (const key of ["botName", "welcomeMessage", "antiFloodEnabled", "cooldowns"]) {
            if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) db.settings[key] = clone(req.body[key]);
        }
        persistDb();
        res.json({
            botName: db.settings.botName || "",
            welcomeMessage: db.settings.welcomeMessage || "",
            antiFloodEnabled: db.settings.antiFloodEnabled !== false,
            cooldowns: clone(db.settings.cooldowns || {})
        });
    });

    app.use((req, res) => res.status(404).json({ error: "Not found" }));
    app.use((error, req, res, next) => {
        writeLog("error", error.stack || error.message || error);
        if (res.headersSent) return next(error);
        res.status(500).json({ error: "Internal server error" });
    });

    server.on("upgrade", (req, socket, head) => {
        let parsed;
        try { parsed = new URL(req.url, `http://${req.headers.host || "localhost"}`); }
        catch (_) { socket.destroy(); return; }
        const supplied = req.headers["x-dashboard-key"] || parsed.searchParams.get("key");
        let isValid = false;
        try {
            const expected = dashboardKey();
            isValid = supplied && String(supplied).length === expected.length &&
                crypto.timingSafeEqual(Buffer.from(String(supplied)), Buffer.from(expected));
        } catch (_) {}
        if (!isValid) {
            securityAttempts.unshift({
                timestamp: new Date().toISOString(),
                ip: req.socket?.remoteAddress || "unknown",
                method: "WS",
                path: req.url
            });
            while (securityAttempts.length > MAX_SECURITY_EVENTS) securityAttempts.pop();
            socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
            socket.destroy();
            return;
        }
        if (parsed.pathname !== "/ws") {
            socket.destroy();
            return;
        }
        wss.handleUpgrade(req, socket, head, (client) => wss.emit("connection", client, req));
    });
    wss.on("connection", (client) => {
        clients.add(client);
        client.send(JSON.stringify({ event: "session:update", ...sessionStatus() }));
        client.on("close", () => clients.delete(client));
        client.on("error", () => clients.delete(client));
    });

    return {
        app,
        server,
        wss,
        publish,
        async start() {
            if (listening) return server.address();
            installLogCapture();
            dashboardKey();
            ensureBackupDir();
            await new Promise((resolve, reject) => {
                server.once("error", reject);
                server.listen(Number(options.port || DEFAULT_PORT), options.host || "0.0.0.0", resolve);
            });
            listening = true;
            const address = server.address();
            writeLog("info", `Dashboard API listening on ${typeof address === "object" ? address.port : address}`);
            return address;
        },
        async stop() {
            if (!listening) return;
            await new Promise((resolve) => server.close(() => resolve()));
            listening = false;
        },
        isListening: () => listening,
        getLogLines: () => clone(logLines)
    };
}

module.exports = { createDashboardServer };