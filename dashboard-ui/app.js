/* لوحة تحكم بوت واتساب — Vanilla JS / لا تحتاج إلى build step.
   العقدة الوحيدة التي يحتاجها الـ Backend عند تغيير مسار هي API في الأسفل. */
(() => {
  "use strict";

  const API_BASE = "/api";
  const WS_PATH = "/ws";
  const STORAGE_KEY = "dashboardKey";
  const THEME_KEY = "dashboardTheme";

  // عقد الواجهة المقترح للـ Backend. كل المسارات نسبية إلى /api.
  const API = {
    session: { get: "/session/status", qr: "/session/link/qr", pair: "/session/link/pairing-code", disconnect: "/session/logout" },
    bot: { status: "/bot/status", start: "/bot/start", stop: "/bot/stop", restart: "/bot/restart", maintenance: "/bot/maintenance" },
    backups: { create: "/backup/create", list: "/backup/list", download: "/backup/download", restore: "/backup/restore", import: "/database/import" },
    players: "/players",
    groups: "/groups",
    commands: "/commands",
    treasury: "/economy/treasury",
    shop: "/economy/shop",
    logs: "/logs/errors?limit=200",
    logDownload: "/logs/download",
    broadcast: { all: "/broadcast/all", group: "/broadcast/group" },
    schedules: "/schedule",
    security: { owners: "/owners", whitelist: "/whitelist", blacklist: "/blacklist", unauthorized: "/security/unauthorized-attempts" },
    subbots: "/subbots",
    stats: { activity: "/stats/activity?days=30", topGroups: "/stats/top-groups", topCommands: "/stats/top-commands" },
    settings: "/settings"
  };

  const sections = [
    ["session", "الجلسة والربط", "⌁"], ["control", "التحكم العام", "◉"], ["backups", "الباك أب", "▣"],
    ["players", "اللاعبين", "♙"], ["groups", "الجروبات", "♧"], ["commands", "الأوامر", "⌘"],
    ["economy", "الاقتصاد", "◈"], ["logs", "اللوج", "≡"], ["broadcast", "البرودكاست والجدولة", "➤"],
    ["security", "الأمان", "⊛"], ["subbots", "السب-بوتس", "◌"], ["stats", "الإحصائيات", "⌁"],
    ["settings", "الإعدادات", "⚙"], ["general", "عام", "☼"]
  ];
  const state = { section: "control", connected: false, ws: null, wsRetry: null, logs: [], cache: {} };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  const first = (obj, keys, fallback = "") => keys.reduce((value, key) => value !== undefined && value !== null && value !== "" ? value : obj?.[key], undefined) ?? fallback;
  const listOf = (data, keys = []) => Array.isArray(data) ? data : keys.reduce((out, key) => Array.isArray(data?.[key]) ? data[key] : out, []);
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const fmt = (value) => num(value).toLocaleString("ar-EG");
  const date = (value) => value ? new Date(value).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }) : "—";
  const initials = (value) => String(value || "؟").trim().slice(0, 1);
  const uptime = (seconds) => {
    const total = num(seconds);
    if (!total) return "—";
    const days = Math.floor(total / 86400), hours = Math.floor(total % 86400 / 3600), minutes = Math.floor(total % 3600 / 60);
    return days ? `${days}ي ${hours}س` : `${hours}س ${minutes}د`;
  };

  function toast(message, type = "info") {
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.textContent = message;
    $("#toast-root").append(node);
    setTimeout(() => node.remove(), 3800);
  }
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    $("#theme-icon").textContent = theme === "dark" ? "☼" : "☾";
  }
  function goAuth(message = "") {
    localStorage.removeItem(STORAGE_KEY);
    state.connected = false;
    if (state.ws) state.ws.close();
    $("#app-shell").hidden = true;
    $("#auth-screen").hidden = false;
    $("#auth-key").value = "";
    $("#auth-error").textContent = message;
    $("#auth-error").hidden = !message;
  }
  async function api(path, options = {}) {
    const key = localStorage.getItem(STORAGE_KEY);
    if (!key) return Promise.reject(new Error("AUTH_REQUIRED"));
    const headers = { "x-dashboard-key": key, ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) };
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (response.status === 401) { goAuth("المفتاح غير صالح أو انتهت صلاحيته."); throw new Error("AUTH_REQUIRED"); }
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
    return body;
  }
  async function safeApi(path, options = {}, fallback = {}) {
    try { return await api(path, options); }
    catch (error) {
      if (error.message === "AUTH_REQUIRED") throw error;
      console.warn(`[Dashboard API] ${path}`, error);
      return fallback;
    }
  }
  async function mutate(path, method = "POST", payload, success = "تم الحفظ بنجاح") {
    try {
      await api(path, { method, body: payload instanceof FormData ? payload : JSON.stringify(payload ?? {}) });
      toast(success, "success");
      await render();
    } catch (error) { if (error.message !== "AUTH_REQUIRED") toast(error.message || "تعذر تنفيذ العملية", "error"); }
  }

  function buildNav() {
    $("#main-nav").innerHTML = sections.map(([id, label, icon]) => `<button class="nav-item ${id === state.section ? "active" : ""}" data-section="${id}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`).join("");
    $$(".nav-item").forEach((item) => item.addEventListener("click", () => {
      state.section = item.dataset.section; buildNav(); render(); $("#sidebar").classList.remove("open");
    }));
  }
  function setPageMeta(label, title) { $("#breadcrumb").textContent = label; $("#page-title").textContent = title; }
  function intro(title, description, actions = "") { return `<div class="page-intro"><div><h3>${title}</h3><p>${description}</p></div><div class="actions">${actions}</div></div>`; }
  function cardHead(title, description = "", action = "") { return `<div class="card-head"><div><h3>${title}</h3>${description ? `<p>${description}</p>` : ""}</div>${action}</div>`; }
  function stat(label, value, icon, color = "var(--primary)", change = "") { return `<div class="card stat-card" style="--stat-color:${color}"><span class="stat-icon">${icon}</span><div class="stat-label">${label}</div><div class="stat-value">${value}</div>${change ? `<div class="stat-change">${change}</div>` : ""}</div>`; }
  function empty(title = "لا توجد بيانات", text = "لم يرجع الـ API أي سجلات حتى الآن.") { return `<div class="empty"><b>${title}</b>${text}</div>`; }
  function toggle(name, checked = false, extra = "") { return `<label class="toggle"><input type="checkbox" name="${name}" ${checked ? "checked" : ""} ${extra}><i></i></label>`; }
  function actionButtons(id, actions = []) { return `<div class="table-actions">${actions.map(([label, cls, handler]) => `<button class="btn sm ${cls || "ghost"}" data-action="${handler}" data-id="${esc(id)}">${label}</button>`).join("")}</div>`; }

  async function render() {
    const labels = Object.fromEntries(sections.map(([id, label]) => [id, label]));
    setPageMeta(labels[state.section], state.section === "control" ? "التحكم العام" : labels[state.section]);
    $("#page-content").innerHTML = `<div class="loading"><span class="spinner"></span> جارٍ تحميل البيانات...</div>`;
    try {
      const views = { session: renderSession, control: renderControl, backups: renderBackups, players: renderPlayers, groups: renderGroups, commands: renderCommands, economy: renderEconomy, logs: renderLogs, broadcast: renderBroadcast, security: renderSecurity, subbots: renderSubbots, stats: renderStats, settings: renderSettings, general: renderGeneral };
      $("#page-content").innerHTML = await views[state.section]();
      bindView();
    } catch (error) {
      if (error.message === "AUTH_REQUIRED") return;
      $("#page-content").innerHTML = `<div class="callout"><strong>تعذر تحميل هذا القسم</strong><span>${esc(error.message)}</span></div>`;
    }
  }

  async function renderSession() {
    const data = await safeApi(API.session.get, {}, {});
    const connected = first(data, ["connected", "isConnected"], state.connected);
    state.connected = Boolean(connected);
    return `${intro("الجلسة والربط", "إدارة اتصال واتساب ومتابعة حالته في الوقت الحقيقي.", `<button class="btn danger" data-action="disconnect">فصل الجلسة</button>`)}
      <div class="grid grid-2">
        <div class="card pad">
          <div class="connection-state"><i></i><b>${state.connected ? "متصل الآن" : "غير متصل"}</b></div>
          <p class="muted" style="font-size:11px">الحالة الحالية: ${esc(first(data, ["phone", "jid", "number"], state.connected ? "الجلسة الأساسية" : "في انتظار الربط"))}</p>
          <div class="grid grid-2" style="margin-top:22px">${stat("آخر اتصال", date(first(data, ["connectedAt", "lastConnectedAt"])), "◷", "var(--info)")}${stat("نوع الربط", first(data, ["authMethod", "method"], "QR"), "⌁", "var(--primary)")}</div>
        </div>
        <div class="card pad">
          <div class="card-head" style="padding:0 0 14px;border:0"><div><h3>اربط رقم جديد</h3><p>استخدم QR أو كود الاقتران من هاتف واتساب.</p></div></div>
          <div class="actions"><button class="btn primary" data-action="request-qr">عرض QR Code</button><button class="btn secondary" data-action="request-pair">استخدام رقم الهاتف</button></div>
          <div id="pairing-slot"></div>
        </div>
      </div>
      <div class="card pad" style="margin-top:16px"><div class="callout"><span>ⓘ</span><div><strong>الربط اللحظي</strong>يتم تحديث QR وحالة الاتصال من خلال WebSocket، من غير ما تحتاج تعمل Refresh.</div></div></div>`;
  }
  async function renderControl() {
    const data = await safeApi(API.bot.status, {}, {});
    const maintenance = first(data, ["maintenance"], {});
    const m = first(maintenance, ["enabled"], false);
    return `${intro("التحكم العام", "ملخص حالة البوت وأدوات التشغيل السريعة.", `<button class="btn success" data-action="bot-start">تشغيل</button><button class="btn secondary" data-action="bot-restart">إعادة تشغيل</button><button class="btn danger" data-action="bot-stop">إيقاف</button>`)}
      <div class="grid grid-4">${stat("وقت التشغيل", uptime(first(data, ["uptimeSec"])), "◷", "var(--info)")}${stat("الذاكرة المستخدمة", `${fmt(first(data, ["ramMB"], 0))} MB`, "▥", "var(--warning)")}${stat("استخدام المعالج", `${fmt(first(data, ["cpuPercent"], 0))}%`, "⌁", "var(--primary)")}${stat("إجمالي الرسائل", fmt(first(data, ["messagesTotal", "messages", "messageCount"], 0)), "✉", "var(--success)")}</div>
      <div class="grid grid-2" style="margin-top:16px">
        <div class="card pad"><h3 style="margin-top:0;font-size:14px">مراقبة الموارد</h3><div class="stack gap-16" style="margin-top:18px">${metric("الذاكرة", num(first(data, ["memoryPercent", "ramPercent"])), "var(--warning)")}${metric("المعالج", num(first(data, ["cpuPercent"])), "var(--primary)")}${metric("التخزين", num(first(data, ["diskPercent"])), "var(--success)")}</div></div>
        <div class="card pad"><h3 style="margin-top:0;font-size:14px">وضع الصيانة</h3><form id="maintenance-form"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><span class="muted" style="font-size:11px">إيقاف استقبال الأوامر مؤقتًا</span>${toggle("enabled", Boolean(m))}</div><label class="field"><span>رسالة الصيانة</span><textarea name="message" placeholder="مثال: البوت تحت التحديث...">${esc(first(maintenance, ["message"], ""))}</textarea></label><div class="form-actions"><button class="btn primary" type="submit">حفظ الإعداد</button></div></form></div>
      </div>`;
  }
  function metric(label, value, color) { return `<div class="metric-row"><span>${label}</span><div class="progress"><i style="width:${Math.min(100, value)}%;background:${color}"></i></div><b>${fmt(value)}%</b></div>`; }

  async function renderBackups() {
    const data = await safeApi(API.backups.list, {}, []);
    const rows = listOf(data, ["backups", "items"]);
    return `${intro("الباك أب", "احفظ نسخة من قاعدة البيانات أو استعد نسخة سابقة بأمان.", `<button class="btn primary" data-action="create-backup">＋ خذ نسخة دلوقتي</button>`)}
      <div class="grid grid-2"><div class="card pad"><h3 style="margin-top:0;font-size:14px">استيراد قاعدة بيانات</h3><p class="muted" style="font-size:11px">ارفع ملف database.json لاستبدال البيانات الحالية.</p><div class="dropzone"><input id="database-file" type="file" accept=".json,application/json"><label for="database-file">اختر ملف database.json</label><div id="file-name" class="muted" style="margin-top:7px;font-size:10px">لم يتم اختيار ملف</div></div><div class="form-actions"><button class="btn secondary" data-action="import-db">استيراد الملف</button></div></div><div class="card pad"><div class="callout"><span>⌁</span><div><strong>سياسة الاحتفاظ</strong>يحتفظ الخادم بالنسخ حسب إعداداته. الاستعادة عملية حساسة وتحتاج تأكيدًا قبل التنفيذ.</div></div></div></div>
      <div class="card" style="margin-top:16px">${cardHead("النسخ المحفوظة", "آخر نسخ قاعدة البيانات التي أنشأها الخادم.")}<div class="table-wrap"><table><thead><tr><th>الملف</th><th>الحجم</th><th>تاريخ الإنشاء</th><th>الإجراء</th></tr></thead><tbody>${rows.length ? rows.map((row) => `<tr><td><b>${esc(first(row, ["name", "filename"], "database.json"))}</b></td><td>${esc(first(row, ["sizeFormatted", "size"], "—"))}</td><td>${date(first(row, ["createdAt", "date"]))}</td><td>${actionButtons(first(row, ["id", "name"]), [["تحميل", "secondary", "download-backup"], ["استعادة", "danger", "restore-backup"]])}</td></tr>`).join("") : `<tr><td colspan="4">${empty()}</td></tr>`}</tbody></table></div></div>`;
  }

  async function renderPlayers() {
    const data = await safeApi(API.players, {}, []);
    const rows = listOf(data, ["players", "items", "data"]);
    return `${intro("اللاعبين", "ابحث في حسابات اللاعبين وعدّل بياناتهم أو طبّق إجراءات الإدارة.", "")}<div class="card"><div class="toolbar"><input class="search" id="players-search" placeholder="ابحث بالاسم أو الرقم..." /><select id="players-sort"><option value="updatedAt">آخر تحديث</option><option value="gold">الرصيد</option><option value="level">المستوى</option></select><span class="muted" style="font-size:10px">${fmt(rows.length)} لاعب</span></div><div class="table-wrap"><table><thead><tr><th>اللاعب</th><th>المستوى</th><th>الذهب</th><th>الفئة</th><th>آخر نشاط</th><th>الإجراءات</th></tr></thead><tbody id="players-body">${playerRows(rows)}</tbody></table></div></div>`;
  }
  function playerRows(rows) { return rows.length ? rows.map((row) => `<tr data-search="${esc(JSON.stringify(row))}"><td><div class="entity"><span class="entity-avatar">${initials(first(row, ["name", "username"], "ل"))}</span><div><b>${esc(first(row, ["name", "username"], "بدون اسم"))}</b><small>${esc(first(row, ["jid", "phone", "id"], "—"))}</small></div></div></td><td>${fmt(first(row, ["level"], 1))}</td><td>${fmt(first(row, ["gold", "balance"], 0))}</td><td><span class="badge info">${esc(first(row, ["class", "role", "category"], "محارب"))}</span></td><td>${date(first(row, ["lastSeen", "updatedAt"]))}</td><td>${actionButtons(first(row, ["id", "jid"]), [["تعديل", "secondary", "edit-player"], ["بان", "danger", "ban-player"], ["حذف", "danger", "delete-player"]])}</td></tr>`).join("") : `<tr><td colspan="6">${empty("لا يوجد لاعبون", "لم يرجع الـ API بيانات للاعبين.")}</td></tr>`; }

  async function renderGroups() {
    const data = await safeApi(API.groups, {}, []);
    const rows = listOf(data, ["groups", "items"]);
    return `${intro("الجروبات", "تحكم في الجروبات المتصلة بإعدادات البوت.", "")}<div class="card"><div class="toolbar"><input class="search" id="groups-search" placeholder="ابحث عن جروب..." /><span class="muted" style="font-size:10px">${fmt(rows.length)} جروب</span></div><div class="table-wrap"><table><thead><tr><th>الجروب</th><th>الأعضاء</th><th>الرسائل اليوم</th><th>الحالة</th><th>تفعيل</th><th>الإجراءات</th></tr></thead><tbody>${rows.length ? rows.map((row) => `<tr><td><div class="entity"><span class="entity-avatar">♧</span><div><b>${esc(first(row, ["name", "subject"], "جروب بدون اسم"))}</b><small>${esc(first(row, ["id", "jid"], "—"))}</small></div></div></td><td>${fmt(first(row, ["participantsCount", "participants", "memberCount"], 0))}</td><td>${fmt(first(row, ["messagesToday", "messageCount"], 0))}</td><td><span class="badge ${first(row, ["blocked", "banned"], false) ? "danger" : "success"}">${first(row, ["blocked", "banned"], false) ? "محظور" : "نشط"}</span></td><td>${toggle("group-enabled", first(row, ["enabled"], true), `data-group-id="${esc(first(row, ["id", "jid"]))}"`)}</td><td>${actionButtons(first(row, ["id", "jid"]), [["مغادرة", "secondary", "leave-group"], ["حظر", "danger", "block-group"]])}</td></tr>`).join("") : `<tr><td colspan="6">${empty()}</td></tr>`}</tbody></table></div></div>`;
  }

  async function renderCommands() {
    const data = await safeApi(API.commands, {}, []);
    const rows = listOf(data, ["commands", "items"]);
    return `${intro("الأوامر", "تفعيل الأوامر وتعديل ردودها ومراجعة الاستخدام.", "")}<div class="card"><div class="toolbar"><input class="search" placeholder="ابحث عن أمر..." /><select><option>كل التصنيفات</option><option>إدارة</option><option>RPG</option><option>جروبات</option></select></div><div class="table-wrap"><table><thead><tr><th>الأمر</th><th>التصنيف</th><th>الرد</th><th>الاستخدام</th><th>تفعيل</th><th>الإجراء</th></tr></thead><tbody>${rows.length ? rows.map((row) => `<tr><td><b dir="ltr">${esc(first(row, ["command", "name"], "—"))}</b></td><td><span class="badge">${esc(first(row, ["category", "group"], "عام"))}</span></td><td style="max-width:280px;overflow:hidden;text-overflow:ellipsis">${esc(first(row, ["replyText", "reply", "response"], "الرد الافتراضي"))}</td><td>${fmt(first(row, ["usageCount", "uses"], 0))}</td><td>${toggle("command-enabled", first(row, ["enabled", "active"], true), `data-command="${esc(first(row, ["command", "name"]))}"`)}</td><td>${actionButtons(first(row, ["command", "name"]), [["تعديل الرد", "secondary", "edit-command"]])}</td></tr>`).join("") : `<tr><td colspan="6">${empty("لا توجد أوامر", "تأكد من أن endpoint الأوامر يرجع مصفوفة commands.")}</td></tr>`}</tbody></table></div></div>`;
  }

  async function renderEconomy() {
    const [treasury, shop] = await Promise.all([safeApi(API.treasury, {}, {}), safeApi(API.shop, {}, [])]);
    const rows = listOf(shop, ["items", "shop"]);
    return `${intro("الاقتصاد", "إدارة خزينة المملكة وعناصر المتجر.", `<button class="btn primary" data-action="withdraw">سحب من الخزينة</button><button class="btn secondary" data-action="add-item">＋ إضافة عنصر</button>`)}<div class="grid grid-4">${stat("رصيد الخزينة", fmt(first(treasury, ["balance", "treasury"], treasury || 0)), "◈", "var(--warning)")}${stat("عناصر المتجر", fmt(rows.length), "▦", "var(--info)")}${stat("مبيعات اليوم", fmt(first(treasury, ["salesToday"], 0)), "↗", "var(--success)")}${stat("ضريبة اليوم", fmt(first(treasury, ["taxToday"], 0)), "△", "var(--primary)")}</div><div class="card" style="margin-top:16px">${cardHead("عناصر المتجر", "أضف العناصر وعدّل الأسعار أو احذف العناصر غير المتاحة.")}<div class="table-wrap"><table><thead><tr><th>#</th><th>العنصر</th><th>النوع</th><th>السعر</th><th>الاستخدام</th><th>الإجراءات</th></tr></thead><tbody>${rows.length ? rows.map((row) => `<tr><td>${esc(first(row, ["id", "key"], "—"))}</td><td><b>${esc(first(row, ["name", "title"], "عنصر"))}</b></td><td><span class="badge">${esc(first(row, ["type", "category"], "عام"))}</span></td><td>${fmt(first(row, ["cost", "price"], 0))}</td><td>${fmt(first(row, ["purchases", "sales"], 0))}</td><td>${actionButtons(first(row, ["id", "key"]), [["تعديل", "secondary", "edit-item"], ["حذف", "danger", "delete-item"]])}</td></tr>`).join("") : `<tr><td colspan="6">${empty("المتجر فارغ")}</td></tr>`}</tbody></table></div></div>`;
  }

  async function renderLogs() {
    const data = await safeApi(API.logs, {}, []);
    state.logs = [...listOf(data, ["logs", "items"]), ...state.logs].slice(-300);
    return `${intro("اللوج", "تابع أحداث البوت مباشرة مع فلترة حسب مستوى الخطورة.", `<button class="btn secondary" data-action="download-logs">تحميل اللوج</button>`)}<div class="card"><div class="toolbar"><select id="log-filter"><option value="all">كل المستويات</option><option value="error">أخطاء</option><option value="warn">تحذيرات</option><option value="info">معلومات</option></select><button class="btn ghost sm" data-action="clear-logs">مسح العرض</button><span class="muted" style="font-size:10px;margin-right:auto">${fmt(state.logs.length)} سطر</span></div><div id="console" class="console">${logRows()}</div></div>`;
  }
  function logRows() { return state.logs.length ? state.logs.map((row) => `<div class="log-line"><span class="log-time">${esc(first(row, ["time", "timestamp"], new Date().toLocaleTimeString("ar-EG")))}</span><span class="log-level ${esc(first(row, ["level"], "info"))}">[${esc(String(first(row, ["level"], "info")).toUpperCase())}]</span><span>${esc(first(row, ["message", "text"], row))}</span></div>`).join("") : `<div class="muted">لا توجد أحداث حتى الآن — ستظهر هنا رسائل log:line فور وصولها.</div>`; }

  async function renderBroadcast() {
    const data = await safeApi(API.schedules, {}, []);
    const rows = listOf(data, ["schedules", "items"]);
    return `${intro("البرودكاست والجدولة", "أرسل رسالة الآن أو أنشئ رسالة مجدولة لجروب محدد أو لكل الجروبات.", "")}<div class="grid grid-2"><div class="card pad"><h3 style="margin-top:0;font-size:14px">إرسال رسالة</h3><form id="broadcast-form" class="stack gap-16"><label class="field"><span>الوجهة</span><select name="target"><option value="all">كل الجروبات</option><option value="group">جروب محدد</option></select></label><label class="field"><span>معرّف الجروب (اختياري)</span><input name="groupId" placeholder="مثال: 1203...@g.us"></label><label class="field"><span>نص الرسالة</span><textarea name="message" required placeholder="اكتب الرسالة هنا..."></textarea></label><div class="form-actions"><button class="btn primary" type="submit">إرسال الآن</button><button class="btn secondary" type="button" data-action="schedule-message">جدولة الرسالة</button></div></form></div><div class="card pad"><h3 style="margin-top:0;font-size:14px">ملاحظات الإرسال</h3><div class="callout"><span>ⓘ</span><div><strong>استخدم الإرسال بحذر</strong>أرسل فقط للمجموعات التي يملك البوت صلاحية مراسلتها. كل عملية إرسال يتم تسجيلها في اللوج.</div></div></div></div><div class="card" style="margin-top:16px">${cardHead("الرسائل المجدولة")}<div class="table-wrap"><table><thead><tr><th>الرسالة</th><th>الوجهة</th><th>موعد الإرسال</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>${rows.length ? rows.map((row) => `<tr><td style="max-width:300px;overflow:hidden;text-overflow:ellipsis">${esc(first(row, ["message", "text"], "—"))}</td><td>${esc(first(row, ["target", "groupName", "groupId"], "كل الجروبات"))}</td><td>${date(first(row, ["scheduledAt", "runAt"]))}</td><td><span class="badge ${first(row, ["cancelled", "canceled"], false) ? "danger" : "info"}">${first(row, ["cancelled", "canceled"], false) ? "ملغاة" : "مجدولة"}</span></td><td>${actionButtons(first(row, ["id"]), [["إلغاء", "danger", "cancel-schedule"]])}</td></tr>`).join("") : `<tr><td colspan="5">${empty("لا توجد رسائل مجدولة")}</td></tr>`}</tbody></table></div></div>`;
  }

  async function renderSecurity() {
    const [owners, whitelist, blacklist, unauthorized] = await Promise.all([
      safeApi(API.security.owners, {}, []),
      safeApi(API.security.whitelist, {}, []),
      safeApi(API.security.blacklist, {}, []),
      safeApi(API.security.unauthorized, {}, [])
    ]);
    const data = { owners, whitelist, blacklist, unauthorized };
    const groups = [["owners", "المالكون"], ["whitelist", "القائمة البيضاء"], ["blacklist", "القائمة السوداء"]];
    return `${intro("الأمان", "إدارة القوائم الموثوقة ومراجعة محاولات الدخول غير المصرح بها.", "")}<div class="grid grid-3">${groups.map(([key, label]) => { const rows = listOf(data, [key]); return `<div class="card"><div class="card-head"><div><h3>${label}</h3><p>${fmt(rows.length)} رقم</p></div><button class="icon-btn" data-action="add-security" data-list="${key}">＋</button></div><div class="list-stack">${rows.length ? rows.map((row) => `<div class="split-row"><span dir="ltr">${esc(typeof row === "object" ? first(row, ["jid", "phone", "id"], "—") : row)}</span><button class="btn sm danger" data-action="remove-security" data-list="${key}" data-id="${esc(typeof row === "object" ? first(row, ["id", "jid", "phone"]) : row)}">حذف</button></div>`).join("") : `<div class="muted" style="font-size:11px">القائمة فارغة</div>`}</div></div>`; }).join("")}</div><div class="card" style="margin-top:16px">${cardHead("محاولات الدخول غير المصرح بها", "راجع المصدر والوقت والإجراء المتخذ.")}<div class="table-wrap"><table><thead><tr><th>المصدر</th><th>الوقت</th><th>السبب</th><th>النتيجة</th></tr></thead><tbody>${(listOf(data, ["unauthorized", "failedAttempts"])).map((row) => `<tr><td dir="ltr">${esc(first(row, ["ip", "source"], "—"))}</td><td>${date(first(row, ["createdAt", "timestamp"]))}</td><td>${esc(first(row, ["reason", "message"], "مفتاح غير صالح"))}</td><td><span class="badge danger">مرفوض</span></td></tr>`).join("") || `<tr><td colspan="4">${empty("لا توجد محاولات مرفوضة")}</td></tr>`}</tbody></table></div></div>`;
  }

  async function renderSubbots() {
    const data = await safeApi(API.subbots, {}, []);
    const rows = listOf(data, ["subbots", "items"]);
    return `${intro("السب-بوتس", "تابع البوتات الفرعية المتصلة وافصل أي جلسة عند الحاجة.", "")}<div class="card"><div class="table-wrap"><table><thead><tr><th>السب-بوت</th><th>الرقم</th><th>الجروبات</th><th>وقت التشغيل</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>${rows.length ? rows.map((row) => `<tr><td><div class="entity"><span class="entity-avatar">◌</span><b>${esc(first(row, ["name", "label"], "Sub-bot"))}</b></div></td><td dir="ltr">${esc(first(row, ["phone", "jid"], "—"))}</td><td>${fmt(first(row, ["groups", "groupCount"], 0))}</td><td>${esc(first(row, ["uptime", "uptimeFormatted"], "—"))}</td><td><span class="badge success">متصل</span></td><td>${actionButtons(first(row, ["id", "jid"]), [["فصل", "danger", "disconnect-subbot"]])}</td></tr>`).join("") : `<tr><td colspan="6">${empty("لا توجد سب-بوتس متصلة")}</td></tr>`}</tbody></table></div></div>`;
  }

  async function renderStats() {
    const [activity, groups, commands] = await Promise.all([
      safeApi(API.stats.activity, {}, []),
      safeApi(API.stats.topGroups, {}, []),
      safeApi(API.stats.topCommands, {}, [])
    ]);
    const data = { activity, topGroups: groups, topCommands: commands };
    state.cache.stats = data;
    const totalMessages = activity.reduce((sum, row) => sum + num(first(row, ["count", "messages", "value"])), 0);
    const commandUses = commands.reduce((sum, row) => sum + num(first(row, ["usageCount", "uses"])), 0);
    return `${intro("الإحصائيات", "راقب نشاط البوت خلال آخر 30 يومًا وأعلى مصادر الاستخدام.", "")}<div class="grid grid-3">${stat("رسائل آخر 30 يوم", fmt(totalMessages), "✉", "var(--info)")}${stat("نشاط الجروبات", fmt(groups.length), "♧", "var(--success)")}${stat("استخدام الأوامر", fmt(commandUses), "⌘", "var(--primary)")}</div><div class="grid grid-2" style="margin-top:16px"><div class="card chart-card">${cardHead("نشاط الرسائل", "عدد الرسائل يوميًا خلال آخر 30 يومًا.")}<div class="chart-holder"><canvas id="activity-chart"></canvas></div></div><div class="card">${cardHead("أكثر الجروبات نشاطًا")}<div class="list-stack">${rankRows(groups, ["name", "subject"], ["count", "messages", "messageCount"]) || empty()}</div></div></div><div class="card" style="margin-top:16px">${cardHead("أكثر الأوامر استخدامًا")}<div class="list-stack">${rankRows(commands, ["command", "name"], ["usageCount", "uses"]) || empty()}</div></div>`;
  }
  function rankRows(rows, labels, values) { const max = Math.max(1, ...rows.map((r) => num(first(r, values)))); return rows.map((row, index) => `<div class="rank-item"><b>${index + 1}</b><span style="width:110px;font-size:11px;overflow:hidden;text-overflow:ellipsis">${esc(first(row, labels, "—"))}</span><div class="progress"><i style="width:${num(first(row, values)) / max * 100}%"></i></div><small>${fmt(first(row, values))}</small></div>`).join(""); }
  async function renderSettings() {
    const data = await safeApi(API.settings, {}, {});
    const cooldowns = first(data, ["cooldowns"], {});
    const cooldownValue = Object.values(cooldowns || {})[0] || 0;
    return `${intro("الإعدادات", "عدّل هوية البوت ورسائل الترحيب وقواعد الحماية.", "")}<div class="card pad"><form id="settings-form" class="form-grid"><label class="field"><span>اسم البوت</span><input name="botName" value="${esc(first(data, ["botName", "name"], ""))}" placeholder="اسم البوت"></label><label class="field"><span>كولداون الأوامر (بالثواني)</span><input name="cooldown" type="number" value="${esc(cooldownValue / 1000)}" min="0"></label><label class="field wide"><span>رسالة الترحيب</span><textarea name="welcomeMessage" placeholder="رسالة الترحيب">${esc(first(data, ["welcomeMessage", "welcome"], ""))}</textarea></label><div class="wide" style="display:flex;align-items:center;justify-content:space-between;padding:12px;border:1px solid var(--line);border-radius:10px"><div><b style="font-size:12px">تفعيل الأنتي فلود</b><div class="muted" style="font-size:10px">حماية الجروبات من الرسائل المتكررة.</div></div>${toggle("antiFloodEnabled", first(data, ["antiFloodEnabled"], false))}</div><div class="wide form-actions"><button class="btn primary" type="submit">حفظ الإعدادات</button></div></form></div>`;
  }
  async function renderGeneral() {
    const theme = document.documentElement.dataset.theme || "dark";
    return `${intro("عام", "إعدادات العرض والمفتاح المحلي للوحة.", "")}<div class="grid grid-2"><div class="card pad"><h3 style="margin-top:0;font-size:14px">المظهر</h3><p class="muted" style="font-size:11px">اختَر الوضع المناسب لك. يتم حفظ التفضيل فقط على هذا المتصفح.</p><div class="actions"><button class="btn ${theme === "dark" ? "primary" : "secondary"}" data-action="set-dark">الوضع الداكن</button><button class="btn ${theme === "light" ? "primary" : "secondary"}" data-action="set-light">الوضع الفاتح</button></div></div><div class="card pad"><h3 style="margin-top:0;font-size:14px">مفتاح لوحة التحكم</h3><p class="muted" style="font-size:11px">لا يتم تخزين أي بيانات أخرى في localStorage.</p><button class="btn danger" data-action="change-key">تغيير المفتاح</button></div></div>`;
  }

  function bindView() {
    $("#maintenance-form")?.addEventListener("submit", (event) => { event.preventDefault(); const f = new FormData(event.currentTarget); mutate(API.bot.maintenance, "POST", { enabled: f.get("enabled") === "on", message: f.get("message") }); });
    $("#settings-form")?.addEventListener("submit", (event) => { event.preventDefault(); const f = new FormData(event.currentTarget); const cooldown = Number(f.get("cooldown") || 0) * 1000; mutate(API.settings, "PATCH", { botName: f.get("botName"), welcomeMessage: f.get("welcomeMessage"), antiFloodEnabled: f.get("antiFloodEnabled") === "on", cooldowns: cooldown ? { "global": cooldown } : {} }); });
    $("#broadcast-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const f = new FormData(event.currentTarget);
      const target = f.get("target");
      const path = target === "all" ? API.broadcast.all : API.broadcast.group;
      const payload = target === "all" ? { text: f.get("message") } : { groupId: f.get("groupId"), text: f.get("message") };
      mutate(path, "POST", payload, "تم إرسال الرسالة.");
    });
    $("#database-file")?.addEventListener("change", (event) => { $("#file-name").textContent = event.target.files[0]?.name || "لم يتم اختيار ملف"; });
    $("#players-search")?.addEventListener("input", filterTable);
    $("#groups-search")?.addEventListener("input", filterTable);
    $("#log-filter")?.addEventListener("change", (event) => { const value = event.target.value; $$(".log-line", $("#console")).forEach((line) => { line.hidden = value !== "all" && !line.querySelector(`.log-level.${value}`); }); });
    $$("[data-action]").forEach((button) => button.addEventListener("click", () => handleAction(button.dataset.action, button)));
    $$("input[type=checkbox][data-group-id], input[type=checkbox][data-command]").forEach((input) => input.addEventListener("change", () => {
      const path = input.dataset.groupId ? `${API.groups}/${encodeURIComponent(input.dataset.groupId)}` : `${API.commands}/${encodeURIComponent(input.dataset.command)}`;
      mutate(path, "PATCH", { enabled: input.checked });
    }));
    const chart = $("#activity-chart");
    if (chart && window.Chart) {
      const labels = activityLabels(30, state.cache.stats);
      const chartData = listOf(state.cache.stats, ["activity", "daily"]);
      new Chart(chart, { type: "line", data: { labels, datasets: [{ data: chartData.map((row) => num(first(row, ["count", "messages", "value"]))), borderColor: "#7a7cff", backgroundColor: "#7a7cff22", fill: true, tension: .35, pointRadius: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: "#91a0b6", maxTicksLimit: 7 } }, y: { grid: { color: "#263449" }, ticks: { color: "#91a0b6" } } } } });
    }
  }
  function filterTable(event) { const query = event.target.value.toLowerCase(); const rows = event.target.closest(".card").querySelectorAll("tbody tr"); rows.forEach((row) => { row.hidden = !row.textContent.toLowerCase().includes(query); }); }
  function activityLabels(count, data) { const rows = listOf(data, ["activity", "daily"]); return rows.length ? rows.map((r) => first(r, ["date", "day"], "")) : Array.from({ length: count }, (_, i) => `يوم ${i + 1}`); }

  async function handleAction(action, button) {
    const id = button?.dataset.id;
    if (action === "bot-start") return mutate(API.bot.start);
    if (action === "bot-stop") return mutate(API.bot.stop, "POST", {}, "تم إيقاف البوت.");
    if (action === "bot-restart") return mutate(API.bot.restart, "POST", {}, "تم طلب إعادة التشغيل.");
    if (action === "disconnect") return mutate(API.session.disconnect, "POST", {}, "تم فصل الجلسة.");
    if (action === "request-qr") { const slot = $("#pairing-slot"); const data = await safeApi(API.session.qr, { method: "POST" }, {}); const qr = first(data, ["dataUrl", "qr", "code"], ""); slot.innerHTML = qr.startsWith("data:image/") ? `<img class="qr-image" src="${esc(qr)}" alt="QR Code">` : `<div class="qr-box">${esc(qr || "جاري التوليد")}</div>`; slot.innerHTML += `<p class="muted" style="text-align:center;font-size:10px">افتح واتساب ← الأجهزة المرتبطة ← ربط جهاز</p>`; return; }
    if (action === "request-pair") { const phone = prompt("اكتب رقم الهاتف مع كود الدولة:"); if (!phone) return; const data = await safeApi(API.session.pair, { method: "POST", body: JSON.stringify({ phone }) }, {}); $("#pairing-slot").innerHTML = `<div class="code-display">${esc(first(data, ["pairingCode", "code"], "—"))}</div><p class="muted" style="text-align:center;font-size:10px">اكتب الكود داخل واتساب لإتمام الربط.</p>`; return; }
    if (action === "create-backup") return mutate(API.backups.create, "POST", {}, "تم إنشاء نسخة احتياطية.");
    if (action === "download-backup") {
      try {
        const response = await fetch(`${API_BASE}${API.backups.download}/${encodeURIComponent(id)}`, { headers: { "x-dashboard-key": localStorage.getItem(STORAGE_KEY) } });
        if (response.status === 401) { goAuth("المفتاح غير صالح أو انتهت صلاحيته."); return; }
        if (!response.ok) throw new Error("تعذر تحميل النسخة.");
        const blob = await response.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `database-${id}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
      } catch (error) { toast(error.message, "error"); }
      return;
    }
    if (action === "restore-backup" && confirm("استعادة النسخة ستستبدل البيانات الحالية. هل تريد المتابعة؟")) return mutate(`${API.backups.restore}/${encodeURIComponent(id)}`, "POST", {}, "تمت استعادة النسخة.");
    if (action === "import-db") { const file = $("#database-file")?.files[0]; if (!file) return toast("اختر ملف database.json أولًا.", "error"); const form = new FormData(); form.append("file", file); return mutate(API.backups.import, "POST", form, "تم رفع ملف قاعدة البيانات."); }
    if (["edit-player", "edit-command", "edit-item"].includes(action)) return openEditModal(action, id);
    if (action === "delete-player" && confirm("حذف اللاعب نهائيًا؟")) return mutate(`${API.players}/${encodeURIComponent(id)}`, "DELETE", {}, "تم حذف اللاعب.");
    if (action === "ban-player") return mutate(`${API.players}/${encodeURIComponent(id)}/ban`, "POST", {}, "تم حظر اللاعب.");
    if (action === "leave-group" && confirm("سيغادر البوت هذا الجروب. هل تريد المتابعة؟")) return mutate(`${API.groups}/${encodeURIComponent(id)}/leave`, "POST");
    if (action === "block-group") return mutate(`${API.groups}/${encodeURIComponent(id)}/block`, "POST");
    if (action === "delete-item" && confirm("حذف العنصر من المتجر؟")) return mutate(`${API.shop}/${encodeURIComponent(id)}`, "DELETE");
    if (action === "withdraw") return openSimpleModal("سحب من الخزينة", "المبلغ", API.treasury + "/withdraw", "POST");
    if (action === "add-item") return openItemModal();
    if (action === "download-logs") {
      try {
        const response = await fetch(`${API_BASE}${API.logDownload}`, { headers: { "x-dashboard-key": localStorage.getItem(STORAGE_KEY) } });
        if (response.status === 401) { goAuth("المفتاح غير صالح أو انتهت صلاحيته."); return; }
        if (!response.ok) throw new Error("تعذر تحميل اللوج.");
        const blob = await response.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "dashboard-server.log";
        link.click();
        URL.revokeObjectURL(link.href);
      } catch (error) { toast(error.message, "error"); }
      return;
    }
    if (action === "clear-logs") { state.logs = []; $("#console").innerHTML = logRows(); return; }
    if (action === "schedule-message") { const form = $("#broadcast-form"); if (!form) return; const f = new FormData(form); const when = prompt("أدخل وقت الإرسال بصيغة ISO، مثال 2026-09-12T20:00:00+03:00:"); if (when) mutate(API.schedules, "POST", { time: when, target: f.get("target") === "all" ? "all" : f.get("groupId"), text: f.get("message") }, "تمت جدولة الرسالة."); return; }
    if (action === "cancel-schedule") return mutate(`${API.schedules}/${encodeURIComponent(id)}`, "DELETE", {}, "تم إلغاء الرسالة المجدولة.");
    if (action === "add-security") return openSecurityModal(button.dataset.list);
    if (action === "remove-security") return mutate(`${API.security[button.dataset.list]}/${encodeURIComponent(button.dataset.id)}`, "DELETE");
    if (action === "disconnect-subbot") return mutate(`${API.subbots}/${encodeURIComponent(id)}`, "DELETE");
    if (action === "set-dark") { setTheme("dark"); return render(); }
    if (action === "set-light") { setTheme("light"); return render(); }
    if (action === "change-key") { goAuth(); return; }
  }

  function closeModal() { $("#modal-root").innerHTML = ""; }
  function openSimpleModal(title, label, path, method) {
    const treasury = path === `${API.treasury}/withdraw`;
    $("#modal-root").innerHTML = `<div class="modal-backdrop" data-close-modal><div class="modal"><div class="card-head"><h3>${title}</h3><button class="icon-btn" data-close-modal>×</button></div><div class="modal-body"><form id="simple-modal-form" class="stack gap-16"><label class="field"><span>${label}</span><input name="value" type="number" min="1" required></label>${treasury ? `<label class="field"><span>معرّف اللاعب المستلم</span><input name="targetId" required placeholder="رقم اللاعب أو JID" dir="ltr"></label>` : ""}<div class="form-actions"><button class="btn primary">تنفيذ</button><button type="button" class="btn ghost" data-close-modal>إلغاء</button></div></form></div></div></div>`;
    $$(".modal-backdrop [data-close-modal]").forEach((el) => el.addEventListener("click", (e) => { if (e.target === el) closeModal(); else closeModal(); }));
    $("#simple-modal-form").addEventListener("submit", (e) => { e.preventDefault(); const form = new FormData(e.currentTarget); closeModal(); mutate(path, method, treasury ? { amount: Number(form.get("value")), targetId: form.get("targetId") } : { amount: Number(form.get("value")) }); });
  }
  function openEditModal(type, id) {
    const title = type === "edit-player" ? "تعديل بيانات اللاعب" : type === "edit-command" ? "تعديل رد الأمر" : "تعديل عنصر المتجر";
    const fields = type === "edit-player" ? `<label class="field"><span>الاسم</span><input name="name"></label><label class="field"><span>الذهب</span><input name="gold" type="number"></label><label class="field"><span>المستوى</span><input name="level" type="number"></label><label class="field"><span>الفئة</span><input name="class"></label>` : type === "edit-command" ? `<label class="field"><span>نص الرد</span><textarea name="reply" required></textarea></label><label class="field"><span>تفعيل الأمر</span>${toggle("enabled", true)}</label>` : `<label class="field"><span>اسم العنصر</span><input name="name"></label><label class="field"><span>السعر</span><input name="cost" type="number"></label><label class="field"><span>النوع</span><input name="type"></label>`;
    const path = type === "edit-player" ? `${API.players}/${encodeURIComponent(id)}` : type === "edit-command" ? `${API.commands}/${encodeURIComponent(id)}` : `${API.shop}/${encodeURIComponent(id)}`;
    $("#modal-root").innerHTML = `<div class="modal-backdrop"><div class="modal"><div class="card-head"><div><h3>${title}</h3><p>احفظ الحقول التي تريد تغييرها فقط.</p></div><button class="icon-btn" data-close-modal>×</button></div><div class="modal-body"><form id="edit-modal-form" class="form-grid">${fields}<div class="wide form-actions"><button class="btn primary">حفظ التعديلات</button><button type="button" class="btn ghost" data-close-modal>إلغاء</button></div></form></div></div></div>`;
    $$(".modal [data-close-modal]").forEach((el) => el.addEventListener("click", closeModal));
    $("#edit-modal-form").addEventListener("submit", (e) => { e.preventDefault(); const obj = Object.fromEntries(new FormData(e.currentTarget)); closeModal(); mutate(path, "PATCH", obj); });
  }
  function openItemModal() {
    $("#modal-root").innerHTML = `<div class="modal-backdrop"><div class="modal"><div class="card-head"><div><h3>إضافة عنصر للمتجر</h3><p>أدخل بيانات العنصر الجديد.</p></div><button class="icon-btn" data-close-modal>×</button></div><div class="modal-body"><form id="item-modal-form" class="form-grid"><label class="field"><span>اسم العنصر</span><input name="name" required></label><label class="field"><span>السعر</span><input name="cost" type="number" min="0" required></label><label class="field"><span>النوع</span><input name="type" value="use"></label><label class="field"><span>القوة / التأثير</span><input name="value" type="number" min="0"></label><div class="wide form-actions"><button class="btn primary">إضافة العنصر</button></div></form></div></div></div>`;
    $$(".modal [data-close-modal]").forEach((el) => el.addEventListener("click", closeModal));
    $("#item-modal-form").addEventListener("submit", (e) => { e.preventDefault(); const obj = Object.fromEntries(new FormData(e.currentTarget)); closeModal(); mutate(API.shop, "POST", obj, "تمت إضافة العنصر."); });
  }
  function openSecurityModal(list) {
    $("#modal-root").innerHTML = `<div class="modal-backdrop"><div class="modal"><div class="card-head"><h3>إضافة إلى القائمة</h3><button class="icon-btn" data-close-modal>×</button></div><div class="modal-body"><form id="security-form"><label class="field"><span>الرقم أو المعرّف</span><input name="value" dir="ltr" required placeholder="2012...@s.whatsapp.net"></label><div class="form-actions"><button class="btn primary">إضافة</button></div></form></div></div></div>`;
    $$(".modal [data-close-modal]").forEach((el) => el.addEventListener("click", closeModal));
    $("#security-form").addEventListener("submit", (e) => { e.preventDefault(); const value = new FormData(e.currentTarget).get("value"); closeModal(); mutate(API.security[list], "POST", { number: value }); });
  }

  function connectWs() {
    if (!localStorage.getItem(STORAGE_KEY)) return;
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${location.host}${WS_PATH}?key=${encodeURIComponent(localStorage.getItem(STORAGE_KEY))}`;
    try {
      state.ws = new WebSocket(wsUrl);
      state.ws.onopen = () => { state.connected = true; updateConnectionUi(true); };
      state.ws.onclose = () => { updateConnectionUi(false); clearTimeout(state.wsRetry); state.wsRetry = setTimeout(connectWs, 5000); };
      state.ws.onerror = () => updateConnectionUi(false);
      state.ws.onmessage = (event) => {
        try { const message = JSON.parse(event.data); const type = message.event || message.type; const payload = message.data ?? message.payload ?? message;
          if (type === "qr") { const slot = $("#pairing-slot"); const qr = first(payload, ["dataUrl", "qr", "code"], ""); if (slot) slot.innerHTML = qr.startsWith("data:image/") ? `<img class="qr-image" src="${esc(qr)}" alt="QR Code">` : `<div class="qr-box">${esc(qr)}</div>`; }
          if (type === "log:line" || type === "log") { state.logs.push(payload); if (state.section === "logs") { const consoleEl = $("#console"); if (consoleEl) { consoleEl.innerHTML = logRows(); consoleEl.scrollTop = consoleEl.scrollHeight; } } }
          if (type === "session:update" || type === "connection:update" || type === "connection") { state.connected = Boolean(first(payload, ["connected", "status"], false) === true || first(payload, ["status"], "") === "open"); updateConnectionUi(state.connected); }
          if (type === "metrics:update") { state.cache.overview = payload; }
        } catch { /* تجاهل رسالة WS غير مفهومة */ }
      };
    } catch { updateConnectionUi(false); }
  }
  function updateConnectionUi(online) {
    const dot = $("#nav-status-dot"), live = $("#live-dot");
    [dot, live].forEach((node) => { if (!node) return; node.classList.toggle("online", online); node.classList.toggle("offline", !online); });
    $("#nav-status-text").textContent = online ? "قناة لحظية متصلة" : "القناة غير متصلة";
    $("#live-label").textContent = online ? "متصل مباشر" : "وضع غير متصل";
  }

  $("#auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const key = $("#auth-key").value.trim();
    if (!key) return;
    localStorage.setItem(STORAGE_KEY, key);
    $("#auth-error").hidden = true;
    try { await api(API.bot.status); $("#auth-screen").hidden = true; $("#app-shell").hidden = false; buildNav(); connectWs(); render(); }
    catch (error) { if (error.message === "AUTH_REQUIRED") return; $("#auth-error").textContent = "تعذر الاتصال بالخادم. راجع الرابط أو المفتاح ثم حاول مرة أخرى."; $("#auth-error").hidden = false; localStorage.removeItem(STORAGE_KEY); }
  });
  $("#logout-btn").addEventListener("click", () => goAuth());
  $("#theme-toggle").addEventListener("click", () => setTheme((document.documentElement.dataset.theme || "dark") === "dark" ? "light" : "dark"));
  $("#refresh-btn").addEventListener("click", () => render());
  $("#open-sidebar").addEventListener("click", () => $("#sidebar").classList.add("open"));
  $("#close-sidebar").addEventListener("click", () => $("#sidebar").classList.remove("open"));

  setTheme(localStorage.getItem(THEME_KEY) || "dark");
  if (localStorage.getItem(STORAGE_KEY)) {
    $("#auth-screen").hidden = true; $("#app-shell").hidden = false; buildNav(); connectWs(); render();
  }
})();