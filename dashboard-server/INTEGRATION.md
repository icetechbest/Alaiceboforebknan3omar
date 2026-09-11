# Integration Notes

The original command folders and scheduler remain in place. Only these small
integration changes were made:

- `index.js` loads `.env`, generates `DASHBOARD_KEY` once when missing, starts
  the dashboard inside the existing bot process, exposes the live Baileys
  socket, and changes periodic database/stat saves to atomic writes.
- `core/messageHandler.js` adds opt-in maintenance/group disable hooks, command
  enable/reply/usage hooks, and uses the global dashboard welcome message as a
  fallback.
- `commands/RPG/flag.js` uses the same atomic JSON writer for its delayed
  puzzle cleanup instead of writing `database.json` directly.
- `core/scheduler.js` is not replaced. Dashboard schedule endpoints append to
  the existing `db.scheduledMessages` array consumed by its existing tick.

`lanch.js` remains the supervisor and still launches `index.js` as before; the
dashboard runs in that child so it can operate the same socket and data
references as the bot.