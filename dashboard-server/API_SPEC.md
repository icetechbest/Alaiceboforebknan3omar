# Dashboard API Specification

Base URL: `http://<host>:3030`

All examples assume `DASHBOARD_KEY` is sent in `x-dashboard-key`. Query
parameter `?key=...` is accepted as an alternative for browser downloads and
WebSocket connections. Requests without the exact key return `401`.

## الجلسة/الربط

### `GET /api/session/status`

Response:

```json
{"connected":true,"phone":"972569041789","name":"Song Bot","hasQr":false}
```

### `POST /api/session/link/qr`

Response:

```json
{"started":true,"hasQr":true}
```

The WebSocket receives:

```json
{"event":"qr","dataUrl":"data:image/png;base64,..."}
```

### `POST /api/session/link/pairing-code`

Request:

```json
{"phone":"972569041789"}
```

Response:

```json
{"code":"ABCD-EFGH"}
```

### `POST /api/session/logout`

Response:

```json
{"ok":true}
```

### `POST /api/session/reset`

Response:

```json
{"ok":true}
```

This removes the main Baileys `auth_info` directory.

### WebSocket `session:update`

Connect to `/ws?key=<DASHBOARD_KEY>`.

```json
{"event":"session:update","connected":true,"phone":"972569041789","name":"Song Bot"}
```

## التحكم في البوت

### `POST /api/bot/start`

Response:

```json
{"ok":true}
```

### `POST /api/bot/stop`

Response:

```json
{"ok":true}
```

### `POST /api/bot/restart`

Response:

```json
{"ok":true}
```

### `POST /api/bot/maintenance`

Request:

```json
{"enabled":true,"message":"البوت تحت الصيانة"}
```

Response:

```json
{"enabled":true,"message":"البوت تحت الصيانة"}
```

### `GET /api/bot/status`

Response:

```json
{"uptimeSec":1234,"ramMB":184,"cpuPercent":4.21,"messagesToday":42,"messagesTotal":1200,"maintenance":{"enabled":false,"message":""}}
```

## الباك أب

### `POST /api/backup/create`

Response:

```json
{"id":"database-2026-09-11T12-00-00-000Z-a1b2c3d4","fileUrl":"/api/backup/download/database-2026-09-11T12-00-00-000Z-a1b2c3d4"}
```

### `GET /api/backup/list`

Response:

```json
[{"id":"database-2026-09-11T12-00-00-000Z-a1b2c3d4","date":"2026-09-11T12:00:00.000Z","sizeKB":91.4}]
```

### `POST /api/backup/restore/:id`

Response:

```json
{"ok":true,"id":"database-2026-09-11T12-00-00-000Z-a1b2c3d4"}
```

An automatic backup is made before restoring.

### `GET /api/backup/download/:id`

Response: the selected backup JSON file as a download.

### `GET /api/database/export`

Response: the current `database.json` file as a download.

### `POST /api/database/import`

Request: `multipart/form-data`, file field `file`, containing a JSON object.

Response:

```json
{"ok":true}
```

An automatic backup is made before importing.

## اللاعبين

### `GET /api/players?search=&sort=&page=`

Response:

```json
{"data":[{"id":"123@s.whatsapp.net","name":"Player","level":4,"gold":100}],"page":1,"pageSize":25,"total":1}
```

### `GET /api/players/:id`

Response:

```json
{"id":"123@s.whatsapp.net","name":"Player","level":4,"gold":100}
```

### `PATCH /api/players/:id`

Request:

```json
{"name":"New name","gold":2500,"level":5}
```

Response: the updated player object, including `id`.

### `POST /api/players/:id/ban`

Response:

```json
{"id":"123@s.whatsapp.net","banned":true}
```

### `POST /api/players/:id/unban`

Response:

```json
{"id":"123@s.whatsapp.net","banned":false}
```

### `DELETE /api/players/:id`

Response:

```json
{"ok":true,"id":"123@s.whatsapp.net"}
```

### `GET /api/players/export`

Response: UTF-8 CSV download with `id,name,level,gold,xp,class,registeredAt`.

## الجروبات

### `GET /api/groups`

Response:

```json
[{"id":"120363000000000000@g.us","name":"My group","participantsCount":42,"enabled":true,"settings":{}}]
```

### `PATCH /api/groups/:id`

Request:

```json
{"enabled":false,"settings":{"welcomeEnabled":true}}
```

Response:

```json
{"id":"120363000000000000@g.us","enabled":false,"settings":{"welcomeEnabled":true}}
```

### `POST /api/groups/:id/leave`

Response:

```json
{"ok":true}
```

### `POST /api/groups/:id/block`

Response:

```json
{"id":"120363000000000000@g.us","blocked":true}
```

### `POST /api/groups/:id/unblock`

Response:

```json
{"id":"120363000000000000@g.us","blocked":false}
```

## الأوامر

### `GET /api/commands`

Response:

```json
[{"name":"متجر","category":"RPG","enabled":true,"aliases":["shop"],"usageCount":12,"replyText":""}]
```

### `PATCH /api/commands/:name`

Request:

```json
{"enabled":false,"replyText":"الأمر متوقف مؤقتًا","aliases":["shop","store"]}
```

Response: the updated command object in the same shape as `GET /api/commands`.

## الاقتصاد

### `GET /api/economy/treasury`

Response:

```json
{"balance":290194195140}
```

### `POST /api/economy/treasury/withdraw`

Request:

```json
{"amount":5000,"targetId":"123@s.whatsapp.net"}
```

Response:

```json
{"balance":290194190140,"targetId":"123@s.whatsapp.net","amount":5000}
```

### `GET /api/economy/shop`

Response:

```json
[{"id":"1","name":"Sword","cost":1000,"atk":20,"type":"stack"}]
```

### `PATCH /api/economy/shop/:itemId`

Request:

```json
{"cost":1200,"name":"Better sword"}
```

Response: the updated item, including `id`.

### `POST /api/economy/shop`

Request:

```json
{"name":"Shield","cost":1500,"def":30,"type":"stack"}
```

Response:

```json
{"id":"110","name":"Shield","cost":1500,"def":30,"type":"stack"}
```

### `DELETE /api/economy/shop/:itemId`

Response:

```json
{"ok":true,"id":"110"}
```

## اللوج

### WebSocket `log:line`

```json
{"event":"log:line","level":"error","message":"Something failed","timestamp":"2026-09-11T12:00:00.000Z"}
```

### `GET /api/logs/errors?limit=`

Response:

```json
[{"level":"error","message":"Something failed","timestamp":"2026-09-11T12:00:00.000Z"}]
```

### `GET /api/logs/download`

Response: log file download.

## البرودكاست والجدولة

### `POST /api/broadcast/all`

Request:

```json
{"text":"رسالة لكل الجروبات"}
```

Response:

```json
{"sent":2,"total":2,"results":[{"id":"120363000000000000@g.us","ok":true}]}
```

### `POST /api/broadcast/group`

Request:

```json
{"groupId":"120363000000000000@g.us","text":"رسالة للجروب"}
```

Response:

```json
{"ok":true,"groupId":"120363000000000000@g.us"}
```

### `GET /api/schedule`

Response:

```json
[{"id":"schedule-id","time":1789128000000,"groupID":"120363000000000000@g.us","text":"موعد","createdAt":1789127000000,"date":"2026-09-11T12:00:00.000Z"}]
```

### `POST /api/schedule`

Request:

```json
{"time":"2026-09-11T12:00:00.000Z","target":"120363000000000000@g.us","text":"موعد"}
```

Use `"target":"all"` to create one scheduler entry per known group.

Response: the created schedule object, or an array when target is `all`.

### `DELETE /api/schedule/:id`

Response:

```json
{"ok":true,"id":"schedule-id"}
```

## الأمان

### `GET /api/owners`

Response:

```json
["201220800288@s.whatsapp.net"]
```

### `POST /api/owners`

Request:

```json
{"number":"201220800288"}
```

Response: the updated number list.

### `DELETE /api/owners/:number`

Response: the updated number list.

### `GET /api/whitelist`, `GET /api/blacklist`

Response:

```json
["201220800288@s.whatsapp.net"]
```

### `POST /api/whitelist`, `POST /api/blacklist`

Request:

```json
{"number":"201220800288"}
```

Response: the updated number list.

### `DELETE /api/whitelist/:number`, `DELETE /api/blacklist/:number`

Response: the updated number list.

### `GET /api/security/unauthorized-attempts`

Response:

```json
[{"timestamp":"2026-09-11T12:00:00.000Z","ip":"127.0.0.1","method":"GET","path":"/api/settings"}]
```

## السب-بوتس

### `GET /api/subbots`

Response:

```json
[{"id":"201220800288","phone":"201220800288","status":"registered","connectedAt":1789127000000}]
```

### `DELETE /api/subbots/:id`

Response:

```json
{"ok":true,"id":"201220800288"}
```

## الإحصائيات

### `GET /api/stats/activity?days=30`

Response:

```json
[{"date":"2026-09-10","count":12},{"date":"2026-09-11","count":42}]
```

### `GET /api/stats/top-groups`

Response:

```json
[{"id":"120363000000000000@g.us","name":"My group","count":1200}]
```

### `GET /api/stats/top-commands`

Response:

```json
[{"name":"متجر","usageCount":120}]
```

### `GET /api/stats/new-players?days=30`

Response:

```json
[{"id":"123@s.whatsapp.net","name":"Player","registeredAt":1789127000000}]
```

## الإعدادات العامة

### `GET /api/settings`

Response:

```json
{"botName":"Song Bot","welcomeMessage":"أهلاً بك","antiFloodEnabled":true,"cooldowns":{"صيد":60000}}
```

### `PATCH /api/settings`

Request:

```json
{"botName":"Song Bot","welcomeMessage":"أهلاً بك","antiFloodEnabled":true,"cooldowns":{"صيد":30000}}
```

Response: the updated settings object in the same shape as `GET /api/settings`.