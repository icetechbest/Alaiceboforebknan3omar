# Dashboard Server

This folder contains the authenticated Express + WebSocket backend for the
WhatsApp bot. It is loaded by `index.js` after the existing commands are
loaded, so the bot and dashboard share the same in-memory database, socket,
scheduler, and command map.

## Run

From the project root:

```bash
npm install
npm start
```

The dashboard listens on `DASHBOARD_PORT` (default `3030`). The static UI files
are public so the first visit can show the key-entry screen. Every `/api` HTTP
route, download, and WebSocket upgrade requires the exact key from
`DASHBOARD_KEY`, using either:

```http
x-dashboard-key: <key>
```

or:

```text
?key=<key>
```

WebSocket clients connect to `/ws?key=<key>`. Messages use this envelope:

```json
{"event":"session:update","connected":true,"phone":"...","name":"..."}
```

The two live events are `qr` and `session:update`; log streaming uses
`log:line`.

`storage.js` is also used by the bot's periodic database save and the one
existing command that wrote `database.json` directly. Database imports and
restores create an automatic backup before replacing the live data.