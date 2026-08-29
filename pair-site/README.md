# NtandoMods Pair Code Generator

A lightweight web app that generates a WhatsApp pairing code and hands back a **session ID string** that the [NtandoMods](https://github.com/ntandoofcchisaya/NtandoMods) bot can use to auto-connect — no QR scan required.

## How it works

1. You open the site and enter your WhatsApp phone number (with country code).
2. The server spins up a temporary [Baileys](https://github.com/WhiskeySockets/Baileys) socket and calls `requestPairingCode()`.
3. An 8-digit code appears on the site.
4. You open WhatsApp → **Settings → Linked Devices → Link a Device → Link with phone number instead**, and type the code.
5. Once linked, the server gzips + base64-encodes `creds.json` into a string of the form `KnightBot!<base64>...` and displays it as your **Session ID**.
6. Copy that Session ID, set it as the `SESSION_ID` environment variable on your NtandoMods Render deployment, and the bot boots up already linked.

## Deploy on Render

1. Fork or push this `pair-site/` folder to a GitHub repo (it's already inside the NtandoMods repo).
2. On [render.com](https://render.com) → **New → Web Service**.
3. Connect the repo. If the repo is NtandoMods itself, set **Root Directory** to `pair-site`.
4. Render will auto-detect from `render.yaml`:
   - **Build:** `npm install`
   - **Start:** `node server.js`
5. Deploy. You'll get a URL like `https://ntandomods-pair.onrender.com`.

Alternatively use the **Blueprint** feature with the included `render.yaml`.

## Local development

```bash
cd pair-site
npm install
npm start
# open http://localhost:3000
```

## API

| Method | Endpoint                | Description                          |
|--------|-------------------------|--------------------------------------|
| GET    | `/health`               | Health check (used by Render)        |
| POST   | `/api/pair/request`     | Body `{ phone }` → starts a session  |
| GET    | `/api/pair/status`      | `?sessionId=` → code + session string|
| POST   | `/api/pair/cancel`      | `?sessionId=` → abort a session      |
| GET    | `/api/deploy/render`    | Returns a Render YAML for the bot    |

## Session ID format

```
KnightBot!<base64-of-gzipped-creds.json>...
```

The NtandoMods `index.js` decodes it like so:

```js
const [, b64data] = config.sessionID.split('!');
const cleanB64 = b64data.replace('...', '');
const decompressed = zlib.gunzipSync(Buffer.from(cleanB64, 'base64'));
fs.writeFileSync(credsFile, decompressed, 'utf8');
```

So any session string produced here drops straight into the bot's `SESSION_ID` env var and it auto-connects.

## Notes

- Pairing sessions auto-expire after **6 minutes** and auth folders are cleaned from `/tmp`.
- The free Render plan sleeps after inactivity; the first request after sleep takes ~30s to wake.
- For educational purposes only. Not affiliated with WhatsApp.
