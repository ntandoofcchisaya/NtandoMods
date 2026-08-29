# NtandoMods ⚡

A lightweight, fast, and feature-rich WhatsApp bot built on Baileys (`@whiskeysockets/baileys`).

Designed to be simple, clean, and easy to host — perfect for the KnightBot Multi-Hosting Platform.

## ✨ Features

- **141 commands** across 11 categories
- **Modular architecture** — commands live in `menu.js`, shared utilities in `lib.js`, handler logic in `handler.js`
- Lightweight & fast — minimal dependencies, uses Node built-in `https` (no axios needed)
- Auto-typing, auto-react, auto-read, auto-bio
- Group management with per-group settings (welcome, goodbye, antilink, mute, custom messages)
- Owner, admin & sudo permission system
- Self-mode (private/public) support
- JSON-backed persistent settings (group settings, sudo users)
- Fun commands with self-contained arrays (no flaky external APIs needed)
- **10 hack-themed fun commands** with live message-editing animations
- **10 image editing commands** (blur, grayscale, sepia, invert, rotate, flip, mirror, border, circle, resize) powered by Jimp
- **10 view-once (VV) commands** for revealing, converting, editing, and sending view-once media
- AI, anime, text-maker, and downloader commands
- Anti-call support
- Utility tools: password generator, hashing, URL shortener, Wikipedia search, fancy text, and more

## 📂 Project Structure

```
ntandomods/
├── index.js      # Standalone entry point (Baileys socket + connection)
├── handler.js    # Message & group event handlers (entry point for hosting platform)
├── menu.js       # All 141 command definitions + helper functions
├── lib.js        # Shared library (HTTP fetch, mentions, group settings, sudo users)
├── config.js     # Bot configuration
├── data/         # Runtime data (group settings, sudo users) — auto-created
├── package.json
└── README.md
```

- **`handler.js`** — Exports `handleMessage(sock, msg, config)` and `handleGroupUpdate(sock, update, config)`. This is the interface the hosting platform's `bot-worker.js` loads. It imports commands from `menu.js` and utilities from `lib.js`.
- **`menu.js`** — Contains all 141 command definitions and the helper functions they depend on (`getSender`, `getNumber`, `isOwner`, `isGroupAdmin`, `isBotAdmin`, `getBody`, `getQuotedText`, `getQuotedImage`, `fmtUptime`, `pickRandom`). Exports `{ commands, helpers }`.
- **`lib.js`** — Shared library with HTTP helpers (`fetchJSON`, `fetchBuffer`), mention/reply utilities (`getMentions`, `getQuotedParticipant`, `getTargetUser`, `toJid`), and JSON-backed stores (`getGroupSettings`, `updateGroupSettings`, `getSudoUsers`, `addSudoUser`, `removeSudoUser`, `isSudo`).
- **`index.js`** — Standalone entry point for running the bot directly. Sets up the Baileys socket, loads config, and wires up the handler.
- **`data/`** — Auto-created at runtime. Stores `groupSettings.json` (per-group settings) and `sudoUsers.json` (sudo user list). Gitignored except for `.gitkeep`.

## 🎮 Commands

| Category | Commands |
|---|---|
| **🔧 Core** (9) | `.menu`, `.alive`, `.ping`, `.info`, `.runtime`, `.uptime`, `.help`, `.github`, `.owner` |
| **🎮 Fun** (35) | `.joke`, `.quote`, `.8ball`, `.rps`, `.dice`, `.coinflip`, `.pick`, `.ship`, `.truth`, `.dare`, `.flirt`, `.compliment`, `.insult`, `.gayrate`, `.meme`, `.fact`, `.advice`, `.why`, `.hack`, `.rate`, `.couple`, `.character`, `.hug`, `.slap`, `.tagme`, `.trace`, `.decrypt`, `.inject`, `.breach`, `.virus`, `.ddos`, `.brute`, `.spy`, `.steal`, `.crack` |
| **🛠️ Utility** (20) | `.time`, `.date`, `.calc`, `.define`, `.weather`, `.base64`, `.uuid`, `.qr`, `.ssweb`, `.getpp`, `.translate`, `.styletext`, `.fancy`, `.tinyurl`, `.google`, `.wikipedia`, `.repo`, `.randompw`, `.hash`, `.reverse` |
| **🎨 Media** (25) | `.sticker`, `.toimg`, `.tts`, `.viewonce`, `.lyrics`, `.blur`, `.grayscale`, `.sepia`, `.invert`, `.rotate`, `.flip`, `.mirror`, `.border`, `.circle`, `.resize`, `.vvimg`, `.vvvid`, `.vvaudio`, `.vvsticker`, `.vvtoimg`, `.vvblur`, `.vvgray`, `.vvrotate`, `.vvsend`, `.vvinfo` |
| **👥 Group** (10) | `.tagall`, `.hidetag`, `.grouplink`, `.kick`, `.promote`, `.demote`, `.setname`, `.setdesc`, `.groupinfo`, `.poll` |
| **⚡ Admin** (10) | `.welcome`, `.setwelcome`, `.goodbye`, `.setgoodbye`, `.antilink`, `.mute`, `.unmute`, `.warn`, `.resetwarn`, `.del` |
| **👑 Owner** (14) | `.self`, `.mode`, `.block`, `.unblock`, `.setprefix`, `.setbotname`, `.setbotpp`, `.eval`, `.getfile`, `.setvar`, `.broadcast`, `.sudo`, `.anticall`, `.clear` |
| **🤖 AI** (2) | `.ai`, `.gpt` |
| **🍵 Anime** (5) | `.waifu`, `.neko`, `.megumin`, `.shinobu`, `.anime` |
| **✨ Text Maker** (6) | `.neon`, `.blackpink`, `.glitch`, `.fire`, `.thunder`, `.text3d` |
| **📥 Downloader** (5) | `.tiktok`, `.pinterest`, `.song`, `.ytmp3`, `.ytmp4` |

**Total: 141 commands**

### Permission Flags
- `ownerOnly` — Only the bot owner can use
- `adminOnly` — Only group admins (or owner) can use
- `groupOnly` — Only works in groups

### Sudo Users
Sudo users are trusted users who can use commands even in private (self) mode. Manage them with:
- `.sudo add @user` — Add a sudo user
- `.sudo del @user` — Remove a sudo user
- `.sudo list` — List all sudo users

### Group Settings
Per-group settings are stored in `data/groupSettings.json` and managed via commands:
- `.welcome on/off` — Toggle welcome messages
- `.setwelcome <text>` — Set custom welcome message (use `@user` as placeholder)
- `.goodbye on/off` — Toggle goodbye messages
- `.setgoodbye <text>` — Set custom goodbye message
- `.antilink on/off` — Toggle anti-link protection
- `.mute` / `.unmute` — Mute/unmute the group

### Bot Mode
- `.mode` — Check current mode
- `.mode private` — Only owner and sudo users can use commands
- `.mode public` — Everyone can use commands

### View-Once (VV) Commands
View-once media commands let you reveal, convert, edit, and send view-once messages. All require replying to the view-once message (except `.vvsend` which replies to a regular image):
- `.viewonce` / `.vvimg` / `.vvvid` / `.vvaudio` — Reveal & download view-once media by type
- `.vvsticker` — Convert a view-once image to a sticker
- `.vvtoimg` — Convert a view-once sticker to an image
- `.vvblur` / `.vvgray` / `.vvrotate` — Reveal a view-once image and apply an effect
- `.vvsend` — Send a regular image as view-once (reply to any image)
- `.vvinfo` — Check if a replied message is view-once and get its type

## 🚀 Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Edit `config.js` to set your owner number, bot name, and prefix.

3. Run the bot:
   ```bash
   node index.js
   ```

4. Scan the QR code with WhatsApp to connect — **or** use the **Pair Site** to get a Session ID and skip the QR (see below).

## 🔗 Pair Site & Session ID (No QR Needed)

The repo includes a standalone **Pair Code Generator** in the `pair-site/` folder. Deploy it on Render, enter your phone number, get a pairing code, link WhatsApp, and receive a **Session ID string**. Set that string as the `SESSION_ID` env var on your bot deployment and it auto-connects — no QR scan required.

### Deploy the pair site on Render

1. On [render.com](https://render.com) → **New → Web Service**.
2. Connect this repo. Set **Root Directory** to `pair-site`.
3. Render auto-detects `pair-site/render.yaml`:
   - **Build:** `npm install`
   - **Start:** `node server.js`
4. Deploy → you'll get a URL like `https://ntandomods-pair.onrender.com`.

### Get your Session ID

1. Open the pair site URL.
2. Enter your WhatsApp number **with country code** (e.g. `27123456789`).
3. An 8-digit code appears — open WhatsApp → **Settings → Linked Devices → Link a Device → Link with phone number instead** → type the code.
4. Once linked, the site shows your **Session ID** (`KnightBot!<base64>...`). Copy it.

### Deploy the bot with the Session ID

1. On Render, create another Web Service from the same repo (root = repo root, **not** `pair-site`).
2. **Build:** `npm install` · **Start:** `node index.js`.
3. Add env var **`SESSION_ID`** = your copied session string.
4. Deploy — the bot decodes the session string into `creds.json` and boots up already linked.

> See [`pair-site/README.md`](pair-site/README.md) for the full API reference and local dev instructions.

## ⚙️ Configuration

All settings are in `config.js` and can be overridden via environment variables:

| Setting | Env Var | Default | Description |
|---|---|---|---|
| `botName` | `BOT_NAME` | `NtandoMods` | Bot display name |
| `ownerNumber` | `OWNER_NUMBER` | `27123456789` | Owner's WhatsApp number(s) |
| `ownerName` | `OWNER_NAME` | `Ntando` | Owner display name |
| `prefix` | `BOT_PREFIX` | `.` | Command prefix |
| `selfMode` | — | `false` | Private mode (owner/sudo only) |
| `antiCall` | — | `false` | Auto-reject incoming calls |
| `autoRead` | — | `true` | Auto-read messages |
| `autoTyping` | — | `true` | Show typing indicator |
| `autoReact` | — | `true` | Auto-react to commands |
| `autoBio` | — | `true` | Auto-update bio status |

## 📝 Notes

- Fun commands (truth, dare, insult, compliment, flirt, fact, advice, why) use self-contained arrays — no external API dependencies, so they always work.
- **Hack-themed commands** (`.hack`, `.trace`, `.decrypt`, `.inject`, `.breach`, `.virus`, `.ddos`, `.brute`, `.spy`, `.steal`, `.crack`) are purely for entertainment — they display a fake animation by progressively editing a message. No actual hacking occurs.
- **Image editing commands** (`.blur`, `.grayscale`, `.sepia`, `.invert`, `.rotate`, `.flip`, `.mirror`, `.border`, `.circle`, `.resize`) require the [Jimp](https://www.npmjs.com/package/jimp) package and work by replying to an image. They process the image locally — no external API needed.
- **View-once (VV) commands** use Baileys' `downloadContentFromMessage` to reveal view-once media. The `.vvblur`, `.vvgray`, `.vvrotate`, and `.vvtoimg` commands also use Jimp for processing.
- The `.rate` and `.couple` commands use deterministic hashing so the same input always gives the same result.
- The `.styletext` and `.fancy` commands convert text to decorative Unicode styles (bold, italic, script, circled, fullwidth, etc.) — no external API needed.
- The `.hash` command uses Node's built-in `crypto` module (MD5 and SHA256).
- The `.randompw` command generates a secure random password using Node's built-in `crypto`.
- Downloader and text-maker commands use external APIs which may require API keys or have rate limits.
- Anime image commands use the Nekos.life API (free, no key needed).
- All HTTP requests use Node's built-in `https`/`http` modules via `lib.js` — no axios or node-fetch required.

## 📄 License

MIT — Free to use, modify, and distribute.
