# NtandoMods

A lightweight, fast, and feature-rich WhatsApp bot built on Baileys (`@whiskeysockets/baileys`).

Designed to be simple, clean, and easy to host — perfect for the KnightBot Multi-Hosting Platform.

## ✨ Features

| Category | Commands |
|---|---|
| **Core** | `.menu`, `.alive`, `.ping`, `.info`, `.runtime`, `.uptime` |
| **Fun** | `.joke`, `.quote`, `.8ball`, `.rps`, `.dice`, `.coinflip`, `.pick`, `.ship` |
| **Utility** | `.weather`, `.time`, `.date`, `.calc`, `.define`, `.translate`, `.base64`, `.uuid` |
| **Media** | `.sticker`, `.toimg`, `.tts` |
| **Group** | `.tagall`, `.hidetag`, `.promote`, `.demote`, `.kick`, `.add`, `. grouplink`, `.setname`, `.setdesc` |
| **Admin** | `.setprefix`, `.setname`, `.ban`, `.unban`, `.block`, `.unblock`, `.self` |
| **Owner** | `.restart`, `.shutdown`, `.eval`, `.getfile`, `.setvar` |

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
  sessionID: '', // Your KnightBot! session string
  selfMode: false,
  autoRead: true,
  autoTyping: true,
  autoReact: true,
  autoBio: true,
  timezone: 'Africa/Johannesburg',
  packname: 'NtandoMods',
  author: 'NtandoMods',
};
```

## 📦 Requirements

- Node.js 18+
- A WhatsApp session string (generate one from the hosting platform's pair-code generator)

## 📝 License

MIT — Made with ❤️ by NtandoMods
