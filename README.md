# NtandoMods ⚡

A lightweight, fast, and feature-rich WhatsApp bot built on Baileys (`@whiskeysockets/baileys`).

Designed to be simple, clean, and easy to host — perfect for the KnightBot Multi-Hosting Platform.

## ✨ Features

- **91 commands** across 11 categories
- **Modular architecture** — commands live in `menu.js`, shared utilities in `lib.js`, handler logic in `handler.js`
- Lightweight & fast — minimal dependencies, uses Node built-in `https` (no axios needed)
- Auto-typing, auto-react, auto-read, auto-bio
- Group management with per-group settings (welcome, goodbye, antilink, mute, custom messages)
- Owner, admin & sudo permission system
- Self-mode (private/public) support
- JSON-backed persistent settings (group settings, sudo users)
- Fun commands with self-contained arrays (no flaky external APIs needed)
- AI, anime, text-maker, and downloader commands
- Anti-call support

## 📂 Project Structure

```
ntandomods/
├── index.js      # Standalone entry point (Baileys socket + connection)
├── handler.js    # Message & group event handlers (entry point for hosting platform)
├── menu.js       # All 91 command definitions + helper functions
├── lib.js        # Shared library (HTTP fetch, mentions, group settings, sudo users)
├── config.js     # Bot configuration
├── data/         # Runtime data (group settings, sudo users) — auto-created
├── package.json
└── README.md
```

- **`handler.js`** — Exports `handleMessage(sock, msg, config)` and `handleGroupUpdate(sock, update, config)`. This is the interface the hosting platform's `bot-worker.js` loads. It imports commands from `menu.js` and utilities from `lib.js`.
- **`menu.js`** — Contains all 91 command definitions and the helper functions they depend on (`getSender`, `getNumber`, `isOwner`, `isGroupAdmin`, `isBotAdmin`, `getBody`, `getQuotedText`, `getQuotedImage`, `fmtUptime`, `pickRandom`). Exports `{ commands, helpers }`.
- **`lib.js`** — Shared library with HTTP helpers (`fetchJSON`, `fetchBuffer`), mention/reply utilities (`getMentions`, `getQuotedParticipant`, `getTargetUser`, `toJid`), and JSON-backed stores (`getGroupSettings`, `updateGroupSettings`, `getSudoUsers`, `addSudoUser`, `removeSudoUser`, `isSudo`).
- **`index.js`** — Standalone entry point for running the bot directly. Sets up the Baileys socket, loads config, and wires up the handler.
- **`data/`** — Auto-created at runtime. Stores `groupSettings.json` (per-group settings) and `sudoUsers.json` (sudo user list). Gitignored except for `.gitkeep`.

## 🎮 Commands

| Category | Commands |
|---|---|
| **🔧 Core** (9) | `.menu`, `.alive`, `.ping`, `.info`, `.runtime`, `.uptime`, `.help`, `.github`, `.owner` |
| **🎮 Fun** (15) | `.joke`, `.quote`, `.8ball`, `.rps`, `.dice`, `.coinflip`, `.pick`, `.ship`, `.truth`, `.dare`, `.flirt`, `.compliment`, `.insult`, `.gayrate`, `.meme` |
| **🛠️ Utility** (11) | `.time`, `.date`, `.calc`, `.define`, `.weather`, `.base64`, `.uuid`, `.qr`, `.ssweb`, `.getpp`, `.translate` |
| **🎨 Media** (5) | `.sticker`, `.toimg`, `.tts`, `.viewonce`, `.lyrics` |
| **👥 Group** (9) | `.tagall`, `.hidetag`, `.grouplink`, `.kick`, `.promote`, `.demote`, `.setname`, `.setdesc`, `.groupinfo` |
| **⚡ Admin** (10) | `.welcome`, `.setwelcome`, `.goodbye`, `.setgoodbye`, `.antilink`, `.mute`, `.unmute`, `.warn`, `.resetwarn`, `.del` |
| **👑 Owner** (14) | `.self`, `.mode`, `.block`, `.unblock`, `.setprefix`, `.setbotname`, `.setbotpp`, `.eval`, `.getfile`, `.setvar`, `.broadcast`, `.sudo`, `.anticall`, `.clear` |
| **🤖 AI** (2) | `.ai`, `.gpt` |
| **🍵 Anime** (5) | `.waifu`, `.neko`, `.megumin`, `.shinobu`, `.anime` |
| **✨ Text Maker** (6) | `.neon`, `.blackpink`, `.glitch`, `.fire`, `.thunder`, `.text3d` |
| **📥 Downloader** (5) | `.tiktok`, `.pinterest`, `.song`, `.ytmp3`, `.ytmp4` |

**Total: 91 commands**

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

4. Scan the QR code with WhatsApp to connect.

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

- Fun commands (truth, dare, insult, compliment, flirt) use self-contained arrays — no external API dependencies, so they always work.
- Downloader and text-maker commands use external APIs which may require API keys or have rate limits.
- Anime image commands use the Nekos.life API (free, no key needed).
- All HTTP requests use Node's built-in `https`/`http` modules via `lib.js` — no axios or node-fetch required.

## 📄 License

MIT — Free to use, modify, and distribute.
