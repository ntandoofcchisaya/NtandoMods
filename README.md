# NtandoMods ⚡

A lightweight, fast, and feature-rich WhatsApp bot built on Baileys (`@whiskeysockets/baileys`).

Designed to be simple, clean, and easy to host — perfect for the KnightBot Multi-Hosting Platform.

## ✨ Features

- **41 commands** across 6 categories
- **Modular architecture** — commands live in `menu.js`, handler logic in `handler.js`
- Lightweight & fast — minimal dependencies
- Auto-typing, auto-react, auto-read, auto-bio
- Group management (welcome, goodbye, promote/demote messages)
- Owner & admin permission system
- Self-mode (owner-only) support

## 📂 Project Structure

```
ntandomods/
├── index.js      # Standalone entry point (Baileys socket + connection)
├── handler.js    # Message & group event handlers (entry point for hosting platform)
├── menu.js       # All 41 command definitions + helper functions
├── config.js     # Bot configuration
├── package.json
└── README.md
```

- **`handler.js`** — Exports `handleMessage(sock, msg, config)` and `handleGroupUpdate(sock, update, config)`. This is the interface the hosting platform's `bot-worker.js` loads. It imports commands from `menu.js`.
- **`menu.js`** — Contains all command definitions and the helper functions they depend on (`getSender`, `getNumber`, `isOwner`, `isGroupAdmin`, `isBotAdmin`, `getBody`, `getQuotedText`, `getQuotedImage`, `fmtUptime`, `pickRandom`). Exports `{ commands, helpers }`.
- **`index.js`** — Standalone entry point for running the bot directly. Sets up the Baileys socket, loads config, and wires up the handler.

## 🎮 Commands

| Category | Commands |
|---|---|
| **Core** (7) | `.menu`, `.alive`, `.ping`, `.info`, `.runtime`, `.uptime`, `.help` |
| **Fun** (8) | `.joke`, `.quote`, `.8ball`, `.rps`, `.dice`, `.coinflip`, `.pick`, `.ship` |
| **Utility** (7) | `.time`, `.date`, `.calc`, `.define`, `.weather`, `.base64`, `.uuid` |
| **Media** (3) | `.sticker`, `.toimg`, `.tts` |
| **Group** (8) | `.tagall`, `.hidetag`, `.grouplink`, `.kick`, `.promote`, `.demote`, `.setname`, `.setdesc` |
| **Owner** (8) | `.self`, `.block`, `.unblock`, `.setprefix`, `.setbotname`, `.eval`, `.getfile`, `.setvar` |

**Total: 41 commands**

### Permission Flags
- `ownerOnly` — Only the bot owner can use
- `adminOnly` — Only group admins (or owner) can use
- `groupOnly` — Only works in groups

## 🚀 Quick Start

```bash
npm install
# Set your session string and config in config.js or via environment variables
node index.js
```

## ⚙️ Configuration

Edit `config.js` or set environment variables:

```javascript
module.exports = {
  botName: 'NtandoMods',
  ownerNumber: ['27XXXXXXXXX'],
  ownerName: ['Ntando'],
  prefix: '.',
  sessionID: '', // Your session string
  selfMode: false,
  autoRead: true,
  autoTyping: true,
  autoReact: true,
  autoBio: true,
  timezone: 'Africa/Johannesburg',
  packname: 'NtandoMods',
  author: 'NtandoMods',
  version: '1.0.0',
};
```

## 📦 Requirements

- Node.js 18+
- A WhatsApp session string (generate one from the hosting platform's pair-code generator)

## 🧩 Hosting Platform Integration

The hosting platform's `bot-worker.js` loads this bot from the `knightbot-engine` directory. It expects:
- `handler.js` exporting `handleMessage(sock, msg, config)` and `handleGroupUpdate(sock, update, config)`
- `config.js` exporting the bot configuration

The `menu.js` module is loaded automatically by `handler.js` — no extra wiring needed.

## 📝 License

MIT — Made with ❤️ by NtandoMods
