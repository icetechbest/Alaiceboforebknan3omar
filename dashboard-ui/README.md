# Dashboard UI لبوت واتساب

واجهة static بالكامل، RTL، وتعمل من خلال `index.html` بدون npm أو build step.

## التشغيل

ضع فولدر `dashboard-ui/` كما هو خلف نفس الخادم الذي يقدّم Backend API، بحيث تكون المسارات:

```text
/index.html
/styles.css
/app.js
/api/...
```

الواجهة تتصل بـ `GET /api/...` وتضيف المفتاح في كل طلب داخل header:

```http
x-dashboard-key: <dashboardKey>
```

وتفتح WebSocket على:

```text
ws(s)://<host>/api/ws
```

## عقد المسارات المستخدمة

الواجهة تستخدم المسارات التالية، وكلها نسبية إلى `/api`:

| الوظيفة | المسارات |
|---|---|
| الجلسة والربط | `GET /session/status`, `POST /session/link/qr`, `POST /session/link/pairing-code`, `POST /session/logout` |
| التحكم | `GET /bot/status`, `POST /bot/start`, `POST /bot/stop`, `POST /bot/restart`, `POST /bot/maintenance` |
| الباك أب | `POST /backup/create`, `GET /backup/list`, `GET /backup/download/:id`, `POST /backup/restore/:id`, `POST /database/import` |
| اللاعبين | `GET/PATCH/DELETE /players`, `POST /players/:id/ban` |
| الجروبات | `GET/PATCH /groups`, `POST /groups/:id/leave`, `POST /groups/:id/block` |
| الأوامر | `GET/PATCH /commands` |
| الاقتصاد | `GET /economy/treasury`, `POST /economy/treasury/withdraw`, `GET/POST/PATCH/DELETE /economy/shop` |
| اللوج | `GET /logs/errors?limit=`, `GET /logs/download`، وحدث WebSocket باسم `log:line` |
| البرودكاست | `POST /broadcast/all`, `POST /broadcast/group`, `GET/POST/DELETE /schedule` |
| الأمان | `GET/POST/DELETE /owners`, `/whitelist`, `/blacklist`، و`GET /security/unauthorized-attempts` |
| السب-بوتس | `GET /subbots`, `DELETE /subbots/:id` |
| الإحصائيات | `GET /stats/activity`, `GET /stats/top-groups`, `GET /stats/top-commands` |
| الإعدادات | `GET/PATCH /settings` |

## أحداث WebSocket

الواجهة تستقبل من `/ws?key=<DASHBOARD_KEY>`:

- `qr`: يعرض قيمة `qr` أو `code`
- `log:line`: يضيف `level` و`message` و`timestamp`
- `session:update`: يحدّث حالة الاتصال
- `metrics:update`: يحدّث بيانات المراقبة التالية

## التخزين المحلي

يُحفظ فقط:

- `dashboardKey`: مفتاح لوحة التحكم
- `dashboardTheme`: الوضع الفاتح أو الداكن

أي بيانات أخرى تُقرأ من الـ API عند فتح القسم أو تحديثه.

> الأرشيف المرفق كان يحتوي على كود البوت وقاعدة البيانات فقط، ولم يحتوي على Backend Dashboard أو قائمة endpoints منفصلة. لذلك تم عزل العقد في أعلى `app.js` وفي هذا الملف لتعديلها في مكان واحد إذا كانت أسماء مسارات الـ Backend النهائية مختلفة.