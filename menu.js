/**
 * NtandoMods — Commands & Menu Module (me.js / menu.js)
 * ============================================================
 * All command definitions and helper functions live here.
 * handler.js imports this module to keep things clean and modular.
 * Exports: { commands, helpers }
 * ============================================================
 */

/* ════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
   ════════════════════════════════════════════════════════════ */

function getSender(sock, msg) {
  if (msg.key.fromMe) return sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
  return msg.key.participant || msg.key.remoteJid;
}

function getNumber(jid) {
  return String(jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function isOwner(sender, config) {
  if (!sender) return false;
  const num = getNumber(sender);
  return (config.ownerNumber || []).some(o => getNumber(o) === num);
}

function isGroupAdmin(participant, metadata) {
  if (!metadata || !metadata.participants) return false;
  const p = metadata.participants.find(x => x.id === participant);
  return p && (p.admin === 'admin' || p.admin === 'superadmin');
}

function isBotAdmin(sock, metadata) {
  if (!metadata || !metadata.participants) return false;
  const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
  const p = metadata.participants.find(x => x.id === botId);
  return p && (p.admin === 'admin' || p.admin === 'superadmin');
}

function getBody(msg) {
  const m = msg.message;
  if (!m) return '';
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage) return m.extendedTextMessage.text || '';
  if (m.imageMessage) return m.imageMessage.caption || '';
  if (m.videoMessage) return m.videoMessage.caption || '';
  return '';
}

function getQuotedText(msg) {
  const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!q) return '';
  if (q.conversation) return q.conversation;
  if (q.extendedTextMessage) return q.extendedTextMessage?.text || '';
  return '';
}

function getQuotedImage(msg) {
  const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (q?.imageMessage) return q.imageMessage;
  if (msg.message?.imageMessage) return msg.message.imageMessage;
  return null;
}

function fmtUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d) parts.push(d + 'd');
  if (h) parts.push(h + 'h');
  if (m) parts.push(m + 'm');
  parts.push(s + 's');
  return parts.join(' ');
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ════════════════════════════════════════════════════════════
   COMMAND DEFINITIONS
   ════════════════════════════════════════════════════════════ */

const lib = require('./lib.js');
const { fetchJSON, fetchBuffer, getMentions, getQuotedParticipant, getTargetUser, toJid,
  getGroupSettings, updateGroupSettings, getSudoUsers, addSudoUser, removeSudoUser, isSudo } = lib;

const commands = {

  /* ─── CORE ─── */

  menu: {
    desc: 'Show the command menu',
    category: 'core',
    run: (sock, msg, ctx) => {
      const c = ctx.cfg;
      const cats = {};
      for (const [name, cmd] of Object.entries(commands)) {
        const cat = cmd.category || 'other';
        if (!cats[cat]) cats[cat] = [];
        cats[cat].push({ name, desc: cmd.desc });
      }
      const catNames = { core: '🔧 Core', fun: '🎮 Fun', utility: '🛠️ Utility', media: '🎨 Media', group: '👥 Group', admin: '⚡ Admin', owner: '👑 Owner', ai: '🤖 AI', anime: '🍶 Anime', textmaker: '✨ Text Maker', downloader: '📥 Downloader', other: '📦 Other' };
      let text =
        `╭━━━❰ *${c.botName}* ❱━━━╮\n` +
        `┃ 👤 Owner: ${c.ownerName?.[0] || 'Admin'}\n` +
        `┃ ⚡ Prefix: ${c.prefix}\n` +
        `┃ 🟢 Status: Online\n` +
        `┃ ⏱️ Uptime: ${fmtUptime(process.uptime())}\n` +
        `┃ 📦 Version: 1.0.0\n` +
        `╰━━━━━━━━━━━━━━━━━╯\n\n`;
      for (const [cat, cmds] of Object.entries(cats)) {
        text += `*${catNames[cat] || cat}:*\n`;
        for (const cmd of cmds) {
          text += `  ${c.prefix}${cmd.name} — ${cmd.desc}\n`;
        }
        text += '\n';
      }
      text += `> Powered by NtandoMods ⚡`;
      return sock.sendMessage(ctx.from, { text }, { quoted: msg });
    },
  },

  alive: {
    desc: 'Check if the bot is alive',
    category: 'core',
    run: (sock, msg, ctx) =>
      sock.sendMessage(ctx.from, {
        text: `✅ *${ctx.cfg.botName}* is alive!\n🟢 Uptime: ${fmtUptime(process.uptime())}\n⚡ Version: 1.0.0`,
      }, { quoted: msg }),
  },

  ping: {
    desc: 'Check response speed',
    category: 'core',
    run: async (sock, msg, ctx) => {
      const start = Date.now();
      await sock.sendMessage(ctx.from, { text: '⏳ Pinging...' }, { quoted: msg });
      const ms = Date.now() - start;
      return sock.sendMessage(ctx.from, { text: `🏓 Pong! ${ms}ms\n> ${ctx.cfg.botName}` });
    },
  },

  info: {
    desc: 'Show bot information',
    category: 'core',
    run: (sock, msg, ctx) => {
      const c = ctx.cfg;
      return sock.sendMessage(ctx.from, {
        text: `ℹ️ *Bot Information*\n\n*Name:* ${c.botName}\n*Prefix:* ${c.prefix}\n*Owner:* ${c.ownerName?.[0] || 'Admin'}\n*Version:* 1.0.0\n*Uptime:* ${fmtUptime(process.uptime())}\n*Platform:* NtandoMods\n*Node:* ${process.version}`,
      }, { quoted: msg });
    },
  },

  runtime: {
    desc: 'Show bot runtime',
    category: 'core',
    run: (sock, msg, ctx) =>
      sock.sendMessage(ctx.from, { text: `⏱️ Runtime: ${fmtUptime(process.uptime())}` }, { quoted: msg }),
  },

  uptime: {
    desc: 'Show bot uptime',
    category: 'core',
    run: (sock, msg, ctx) =>
      sock.sendMessage(ctx.from, { text: `⏱️ Uptime: ${fmtUptime(process.uptime())}` }, { quoted: msg }),
  },

  /* ─── FUN ─── */

  joke: {
    desc: 'Get a random joke',
    category: 'fun',
    run: (sock, msg, ctx) => {
      const jokes = [
        "Why don't programmers like nature? It has too many bugs. 🐛",
        "Why do Java developers wear glasses? Because they don't C#. 👓",
        "What's a programmer's favorite hangout place? The Foo Bar. 🍺",
        "Why was the JavaScript developer sad? Because he didn't Node how to Express himself. 😢",
        "How many programmers does it take to change a light bulb? None — that's a hardware problem. 💡",
        "Why do Python programmers prefer snakes? Because they can't C. 🐍",
        "What did the router say to the doctor? It hurts when IP. 🩺",
        "Why did the developer go broke? Because he used up all his cache. 💸",
        "What is a programmer's favorite song? Hello World by Adele. 🎵",
        "Why did the function return early? Because it lost its callback. 📞",
      ];
      return sock.sendMessage(ctx.from, { text: '😂 ' + pickRandom(jokes) }, { quoted: msg });
    },
  },

  quote: {
    desc: 'Get an inspirational quote',
    category: 'fun',
    run: (sock, msg, ctx) => {
      const quotes = [
        '"The only way to do great work is to love what you do." — Steve Jobs',
        '"Code is like humor. When you have to explain it, it\'s bad." — Cory House',
        '"First, solve the problem. Then, write the code." — John Johnson',
        '"Experience is the name everyone gives to their mistakes." — Oscar Wilde',
        '"The best error message is the one that never shows up." — Thomas Fuchs',
        '"Simplicity is the soul of efficiency." — Austin Freeman',
        '"Make it work, make it right, make it fast." — Kent Beck',
        '"Talk is cheap. Show me the code." — Linus Torvalds',
        '"Programs must be written for people to read." — Harold Abelson',
        '"The most important property of a program is whether it accomplishes the intention of its user." — C.A.R. Hoare',
      ];
      return sock.sendMessage(ctx.from, { text: '💬 ' + pickRandom(quotes) }, { quoted: msg });
    },
  },

  '8ball': {
    desc: 'Ask the magic 8-ball',
    category: 'fun',
    run: (sock, msg, ctx) => {
      const question = ctx.args.join(' ');
      if (!question) return sock.sendMessage(ctx.from, { text: '🎱 Ask a question!\nExample: .8ball Will I win the lottery?' }, { quoted: msg });
      const answers = ['Yes definitely ✅', 'Without a doubt 💯', 'Yes 🔮', 'Signs point to yes 👍', 'Most likely 📈', 'Outlook good 🌟', 'Yes, in due time ⏰', 'Ask again later 🤔', 'Better not tell you now 🤐', 'Cannot predict now 🔮', 'Don\'t count on it ❌', 'My reply is no 🚫', 'Outlook not so good 📉', 'Very doubtful 😒'];
      return sock.sendMessage(ctx.from, { text: `🎱 *Question:* ${question}\n🔮 *Answer:* ${pickRandom(answers)}` }, { quoted: msg });
    },
  },

  rps: {
    desc: 'Rock paper scissors',
    category: 'fun',
    run: (sock, msg, ctx) => {
      const choice = (ctx.args[0] || '').toLowerCase();
      const valid = ['rock', 'paper', 'scissors'];
      if (!valid.includes(choice)) return sock.sendMessage(ctx.from, { text: '✊✋✌️ Choose: rock, paper, or scissors\nExample: .rps rock' }, { quoted: msg });
      const bot = pickRandom(valid);
      const wins = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
      let result;
      if (choice === bot) result = '🤝 Draw!';
      else if (wins[choice] === bot) result = '🎉 You win!';
      else result = '😈 I win!';
      const emoji = { rock: '✊', paper: '✋', scissors: '✌️' };
      return sock.sendMessage(ctx.from, { text: `🎮 *RPS*\nYou: ${emoji[choice]}\nMe: ${emoji[bot]}\n${result}` }, { quoted: msg });
    },
  },

  dice: {
    desc: 'Roll a dice (1-6)',
    category: 'fun',
    run: (sock, msg, ctx) => {
      const n = Math.floor(Math.random() * 6) + 1;
      return sock.sendMessage(ctx.from, { text: `🎲 You rolled: *${n}*` }, { quoted: msg });
    },
  },

  coinflip: {
    desc: 'Flip a coin',
    category: 'fun',
    run: (sock, msg, ctx) => {
      const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
      return sock.sendMessage(ctx.from, { text: `🪙 *${result}*` }, { quoted: msg });
    },
  },

  pick: {
    desc: 'Random pick from options',
    category: 'fun',
    run: (sock, msg, ctx) => {
      const opts = ctx.args.join(' ').split(',').map(s => s.trim()).filter(Boolean);
      if (opts.length < 2) return sock.sendMessage(ctx.from, { text: '🤔 Give me comma-separated options\nExample: .pick pizza, burger, sushi' }, { quoted: msg });
      return sock.sendMessage(ctx.from, { text: `🎯 I pick: *${pickRandom(opts)}*` }, { quoted: msg });
    },
  },

  ship: {
    desc: 'Ship two people',
    category: 'fun',
    run: (sock, msg, ctx) => {
      const names = ctx.args.join(' ').split(',').map(s => s.trim()).filter(Boolean);
      if (names.length < 2) return sock.sendMessage(ctx.from, { text: '💕 Give two names separated by comma\nExample: .ship Alice, Bob' }, { quoted: msg });
      const score = Math.floor(Math.random() * 100) + 1;
      const heart = '❤️'.repeat(Math.ceil(score / 20));
      let comment;
      if (score >= 80) comment = 'Perfect match! 💑';
      else if (score >= 60) comment = 'Great couple! 💖';
      else if (score >= 40) comment = 'Could work... 🤔';
      else if (score >= 20) comment = 'Not great... 💔';
      else comment = 'Better as friends! 🫂';
      return sock.sendMessage(ctx.from, { text: `💕 *Ship: ${names[0]} x ${names[1]}*\n${heart}\nCompatibility: ${score}%\n${comment}` }, { quoted: msg });
    },
  },

  /* ─── UTILITY ─── */

  time: {
    desc: 'Show current time',
    category: 'utility',
    run: (sock, msg, ctx) => {
      const tz = ctx.cfg.timezone || 'UTC';
      try {
        const time = new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        return sock.sendMessage(ctx.from, { text: `🕐 Current time (${tz}): *${time}*` }, { quoted: msg });
      } catch (_) {
        return sock.sendMessage(ctx.from, { text: `🕐 Current time: *${new Date().toLocaleTimeString()}*` }, { quoted: msg });
      }
    },
  },

  date: {
    desc: 'Show current date',
    category: 'utility',
    run: (sock, msg, ctx) => {
      const tz = ctx.cfg.timezone || 'UTC';
      try {
        const date = new Date().toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        return sock.sendMessage(ctx.from, { text: `📅 Today is: *${date}*` }, { quoted: msg });
      } catch (_) {
        return sock.sendMessage(ctx.from, { text: `📅 Today is: *${new Date().toLocaleDateString()}*` }, { quoted: msg });
      }
    },
  },

  calc: {
    desc: 'Simple calculator',
    category: 'utility',
    run: (sock, msg, ctx) => {
      const expr = ctx.args.join(' ');
      if (!expr) return sock.sendMessage(ctx.from, { text: '🧮 Example: .calc 2 + 2 * 3' }, { quoted: msg });
      if (!/^[0-9+\-*/().\s]+$/.test(expr)) return sock.sendMessage(ctx.from, { text: '❌ Only numbers and + - * / ( ) allowed.' }, { quoted: msg });
      try {
        const result = Function('"use strict"; return (' + expr + ')')();
        return sock.sendMessage(ctx.from, { text: `🧮 ${expr} = *${result}*` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: '❌ Invalid expression.' }, { quoted: msg });
      }
    },
  },

  define: {
    desc: 'Define a word',
    category: 'utility',
    run: async (sock, msg, ctx) => {
      const word = ctx.args.join(' ');
      if (!word) return sock.sendMessage(ctx.from, { text: '📖 Example: .define awesome' }, { quoted: msg });
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        const def = data[0]?.meanings?.[0]?.definitions?.[0];
        if (!def) throw new Error('no definition');
        const phonetic = data[0]?.phonetic || data[0]?.phonetics?.[0]?.text || '';
        return sock.sendMessage(ctx.from, {
          text: `📖 *${word.toUpperCase()}*${phonetic ? ` (${phonetic})` : ''}\n\n${def.definition}${def.example ? `\n\n_Example: ${def.example}_` : ''}`,
        }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ No definition found for "${word}".` }, { quoted: msg });
      }
    },
  },

  weather: {
    desc: 'Get weather for a city',
    category: 'utility',
    run: async (sock, msg, ctx) => {
      const city = ctx.args.join(' ');
      if (!city) return sock.sendMessage(ctx.from, { text: '🌤️ Example: .weather Johannesburg' }, { quoted: msg });
      try {
        const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        const cur = data.current_condition?.[0];
        const area = data.nearest_area?.[0]?.areaName?.[0]?.value || city;
        if (!cur) throw new Error('no data');
        return sock.sendMessage(ctx.from, {
          text: `🌤️ *Weather in ${area}*\n\n🌡️ Temp: ${cur.temp_C}°C / ${cur.temp_F}°F\n🤔 Feels: ${cur.FeelsLikeC}°C\n💧 Humidity: ${cur.humidity}%\n💨 Wind: ${cur.windspeedKmph} km/h\n☁️ Condition: ${cur.weatherDesc?.[0]?.value || 'N/A'}`,
        }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Weather data unavailable for "${city}".` }, { quoted: msg });
      }
    },
  },

  base64: {
    desc: 'Encode/decode base64',
    category: 'utility',
    run: (sock, msg, ctx) => {
      const sub = (ctx.args[0] || '').toLowerCase();
      const text = ctx.args.slice(1).join(' ');
      if (!sub || !text) return sock.sendMessage(ctx.from, { text: '🔤 Example:\n.base64 encode hello\n.base64 decode aGVsbG8=' }, { quoted: msg });
      try {
        if (sub === 'encode') {
          return sock.sendMessage(ctx.from, { text: `📤 Result: ${Buffer.from(text).toString('base64')}` }, { quoted: msg });
        } else if (sub === 'decode') {
          return sock.sendMessage(ctx.from, { text: `📥 Result: ${Buffer.from(text, 'base64').toString('utf8')}` }, { quoted: msg });
        } else {
          return sock.sendMessage(ctx.from, { text: '❌ Use "encode" or "decode".' }, { quoted: msg });
        }
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: '❌ Invalid input.' }, { quoted: msg });
      }
    },
  },

  uuid: {
    desc: 'Generate a UUID',
    category: 'utility',
    run: (sock, msg, ctx) => {
      const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      return sock.sendMessage(ctx.from, { text: `🆔 UUID: \`${uuid}\`` }, { quoted: msg });
    },
  },

  /* ─── MEDIA ─── */

  sticker: {
    desc: 'Convert image to sticker (reply to image)',
    category: 'media',
    run: async (sock, msg, ctx) => {
      const img = getQuotedImage(msg);
      if (!img) return sock.sendMessage(ctx.from, { text: '❌ Reply to an image with this command.' }, { quoted: msg });
      try {
        const buffer = await sock.downloadMediaMessage?.(msg) || await sock.downloadMediaMessage?.({ key: msg.key, message: { imageMessage: img } });
        if (!buffer) throw new Error('download failed');
        return sock.sendMessage(ctx.from, {
          sticker: buffer,
        }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Sticker error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  toimg: {
    desc: 'Convert sticker to image (reply to sticker)',
    category: 'media',
    run: async (sock, msg, ctx) => {
      const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const sticker = q?.stickerMessage;
      if (!sticker) return sock.sendMessage(ctx.from, { text: '❌ Reply to a sticker with this command.' }, { quoted: msg });
      try {
        const buffer = await sock.downloadMediaMessage?.({ key: msg.key, message: { stickerMessage: sticker } });
        if (!buffer) throw new Error('download failed');
        return sock.sendMessage(ctx.from, { image: buffer }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  tts: {
    desc: 'Text to speech',
    category: 'media',
    run: async (sock, msg, ctx) => {
      const text = ctx.args.join(' ');
      if (!text) return sock.sendMessage(ctx.from, { text: '🔊 Example: .tts Hello world' }, { quoted: msg });
      if (text.length > 200) return sock.sendMessage(ctx.from, { text: '❌ Text too long (max 200 chars).' }, { quoted: msg });
      try {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('tts failed');
        const buffer = Buffer.from(await res.arrayBuffer());
        return sock.sendMessage(ctx.from, { audio: buffer, mimetype: 'audio/mpeg' }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ TTS error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  /* ─── GROUP ─── */

  tagall: {
    desc: 'Tag everyone in group (admin)',
    category: 'group',
    adminOnly: true,
    groupOnly: true,
    run: async (sock, msg, ctx) => {
      try {
        const meta = await sock.groupMetadata(ctx.from);
        const mentions = meta.participants.map(p => p.id);
        const text = `👥 *Tag All*\n${ctx.args.join(' ') || 'Attention everyone!'}\n\n` + mentions.map(m => '@' + getNumber(m)).join(' ');
        return sock.sendMessage(ctx.from, { text, mentions });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg });
      }
    },
  },

  hidetag: {
    desc: 'Hidden tag all (admin)',
    category: 'group',
    adminOnly: true,
    groupOnly: true,
    run: async (sock, msg, ctx) => {
      try {
        const meta = await sock.groupMetadata(ctx.from);
        const mentions = meta.participants.map(p => p.id);
        return sock.sendMessage(ctx.from, {
          text: ctx.args.join(' ') || '📢 Attention!',
          mentions,
        }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg });
      }
    },
  },

  grouplink: {
    desc: 'Get group invite link (admin)',
    category: 'group',
    adminOnly: true,
    groupOnly: true,
    run: async (sock, msg, ctx) => {
      try {
        const code = await sock.groupInviteCode(ctx.from);
        return sock.sendMessage(ctx.from, { text: `🔗 Group invite link:\nhttps://chat.whatsapp.com/${code}` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg });
      }
    },
  },

  kick: {
    desc: 'Kick a member (reply or tag)',
    category: 'group',
    adminOnly: true,
    groupOnly: true,
    run: async (sock, msg, ctx) => {
      const target = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const who = target || mentioned;
      if (!who) return sock.sendMessage(ctx.from, { text: '❌ Reply to or mention the person to kick.' }, { quoted: msg });
      if (isOwner(who, ctx.cfg)) return sock.sendMessage(ctx.from, { text: '❌ Cannot kick the owner!' }, { quoted: msg });
      try {
        await sock.groupParticipantsUpdate(ctx.from, [who], 'remove');
        return sock.sendMessage(ctx.from, { text: `✅ Kicked @${getNumber(who)}`, mentions: [who] });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg });
      }
    },
  },

  promote: {
    desc: 'Promote to admin (admin)',
    category: 'group',
    adminOnly: true,
    groupOnly: true,
    run: async (sock, msg, ctx) => {
      const target = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const who = target || mentioned;
      if (!who) return sock.sendMessage(ctx.from, { text: '❌ Reply to or mention the person.' }, { quoted: msg });
      try {
        await sock.groupParticipantsUpdate(ctx.from, [who], 'promote');
        return sock.sendMessage(ctx.from, { text: `✅ Promoted @${getNumber(who)}`, mentions: [who] });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg });
      }
    },
  },

  demote: {
    desc: 'Demote from admin (admin)',
    category: 'group',
    adminOnly: true,
    groupOnly: true,
    run: async (sock, msg, ctx) => {
      const target = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const who = target || mentioned;
      if (!who) return sock.sendMessage(ctx.from, { text: '❌ Reply to or mention the person.' }, { quoted: msg });
      try {
        await sock.groupParticipantsUpdate(ctx.from, [who], 'demote');
        return sock.sendMessage(ctx.from, { text: `✅ Demoted @${getNumber(who)}`, mentions: [who] });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg });
      }
    },
  },

  setname: {
    desc: 'Change group name (admin)',
    category: 'group',
    adminOnly: true,
    groupOnly: true,
    run: async (sock, msg, ctx) => {
      const name = ctx.args.join(' ');
      if (!name) return sock.sendMessage(ctx.from, { text: '❌ Provide a new name.' }, { quoted: msg });
      try {
        await sock.groupUpdateSubject(ctx.from, name);
        return sock.sendMessage(ctx.from, { text: `✅ Group name changed to: ${name}` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg });
      }
    },
  },

  setdesc: {
    desc: 'Change group description (admin)',
    category: 'group',
    adminOnly: true,
    groupOnly: true,
    run: async (sock, msg, ctx) => {
      const desc = ctx.args.join(' ');
      if (!desc) return sock.sendMessage(ctx.from, { text: '❌ Provide a description.' }, { quoted: msg });
      try {
        await sock.groupUpdateDescription(ctx.from, desc);
        return sock.sendMessage(ctx.from, { text: `✅ Group description updated.` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg });
      }
    },
  },

  /* ─── ADMIN ─── */

  self: {
    desc: 'Toggle self mode (owner only)',
    category: 'owner',
    ownerOnly: true,
    run: (sock, msg, ctx) => {
      ctx.cfg.selfMode = !ctx.cfg.selfMode;
      return sock.sendMessage(ctx.from, { text: `✅ Self mode is now *${ctx.cfg.selfMode ? 'ON' : 'OFF'}*.\n${ctx.cfg.selfMode ? 'Only the owner can use commands.' : 'Everyone can use commands.'}` }, { quoted: msg });
    },
  },

  block: {
    desc: 'Block a user (owner)',
    category: 'owner',
    ownerOnly: true,
    run: async (sock, msg, ctx) => {
      const target = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const who = target || mentioned;
      if (!who) return sock.sendMessage(ctx.from, { text: '❌ Reply to or mention the user.' }, { quoted: msg });
      try {
        await sock.updateBlockStatus(who, 'block');
        return sock.sendMessage(ctx.from, { text: `✅ Blocked @${getNumber(who)}`, mentions: [who] });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg });
      }
    },
  },

  unblock: {
    desc: 'Unblock a user (owner)',
    category: 'owner',
    ownerOnly: true,
    run: async (sock, msg, ctx) => {
      const target = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const who = target || mentioned;
      if (!who) return sock.sendMessage(ctx.from, { text: '❌ Reply to or mention the user.' }, { quoted: msg });
      try {
        await sock.updateBlockStatus(who, 'unblock');
        return sock.sendMessage(ctx.from, { text: `✅ Unblocked @${getNumber(who)}`, mentions: [who] });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg });
      }
    },
  },

  setprefix: {
    desc: 'Change command prefix (owner)',
    category: 'owner',
    ownerOnly: true,
    run: (sock, msg, ctx) => {
      const p = ctx.args[0];
      if (!p || p.length > 3) return sock.sendMessage(ctx.from, { text: '❌ Provide a valid prefix (1-3 chars).' }, { quoted: msg });
      ctx.cfg.prefix = p;
      return sock.sendMessage(ctx.from, { text: `✅ Prefix changed to: ${p}` }, { quoted: msg });
    },
  },

  setbotname: {
    desc: 'Change bot name (owner)',
    category: 'owner',
    ownerOnly: true,
    run: (sock, msg, ctx) => {
      const name = ctx.args.join(' ');
      if (!name) return sock.sendMessage(ctx.from, { text: '❌ Provide a new name.' }, { quoted: msg });
      ctx.cfg.botName = name;
      return sock.sendMessage(ctx.from, { text: `✅ Bot name changed to: ${name}` }, { quoted: msg });
    },
  },

  eval: {
    desc: 'Evaluate JS code (owner)',
    category: 'owner',
    ownerOnly: true,
    run: async (sock, msg, ctx) => {
      const code = ctx.args.join(' ');
      if (!code) return sock.sendMessage(ctx.from, { text: '❌ Provide code to evaluate.' }, { quoted: msg });
      try {
        let result = await eval(code);
        if (typeof result !== 'string') result = JSON.stringify(result, null, 2);
        if (result && result.length > 1000) result = result.slice(0, 1000) + '\n... (truncated)';
        return sock.sendMessage(ctx.from, { text: `📤 Result:\n\`\`\`${result}\`\`\`` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  /* ─── OWNER ─── */

  getfile: {
    desc: 'Get a file from server (owner)',
    category: 'owner',
    ownerOnly: true,
    run: async (sock, msg, ctx) => {
      const fp = ctx.args.join(' ');
      if (!fp) return sock.sendMessage(ctx.from, { text: '❌ Provide a file path.' }, { quoted: msg });
      try {
        const fs = require('fs');
        const path = require('path');
        const resolved = path.resolve(fp);
        if (!fs.existsSync(resolved)) return sock.sendMessage(ctx.from, { text: '❌ File not found.' }, { quoted: msg });
        const stat = fs.statSync(resolved);
        if (stat.size > 5 * 1024 * 1024) return sock.sendMessage(ctx.from, { text: '❌ File too large (max 5MB).' }, { quoted: msg });
        if (stat.isDirectory()) {
          const files = fs.readdirSync(resolved).slice(0, 50);
          return sock.sendMessage(ctx.from, { text: `📁 Directory contents of ${fp}:\n\n${files.map(f => '  ' + f).join('\n')}` }, { quoted: msg });
        }
        const content = fs.readFileSync(resolved, 'utf8');
        if (content.length > 3000) return sock.sendMessage(ctx.from, { text: `📄 File: ${fp} (${content.length} chars, showing first 3000):\n\n\`\`\`${content.slice(0, 3000)}\`\`\`` }, { quoted: msg });
        return sock.sendMessage(ctx.from, { text: `📄 File: ${fp}\n\n\`\`\`${content}\`\`\`` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg });
      }
    },
  },

  setvar: {
    desc: 'Set a config variable (owner)',
    category: 'owner',
    ownerOnly: true,
    run: (sock, msg, ctx) => {
      const [key, ...rest] = ctx.args;
      const value = rest.join(' ');
      if (!key || !value) return sock.sendMessage(ctx.from, { text: '❌ Example: .setvar autoRead true' }, { quoted: msg });
      try {
        if (value === 'true') ctx.cfg[key] = true;
        else if (value === 'false') ctx.cfg[key] = false;
        else if (!isNaN(Number(value))) ctx.cfg[key] = Number(value);
        else ctx.cfg[key] = value;
        return sock.sendMessage(ctx.from, { text: `✅ Set ${key} = ${typeof ctx.cfg[key]} (${ctx.cfg[key]})` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg });
      }
    },
  },


  /* ──── FUN (KnightBot-Mini adapted) ──── */

  truth: {
    desc: 'Get a random truth question',
    category: 'fun',
    run: (sock, msg, ctx) => {
      const truths = [
        "What's the most embarrassing thing you've ever done?",
        "What's a secret you've never told anyone?",
        "What's the biggest lie you've ever told?",
        "What's your biggest fear?",
        "Have you ever cheated on a test?",
        "What's the cringiest thing you've ever posted?",
        "Who do you have a crush on right now?",
        "What's the weirdest dream you've ever had?",
        "Have you ever pretended to be sick to skip something?",
        "What's the most childish thing you still do?",
        "Have you ever stalked someone on social media?",
        "What's the worst gift you've ever received?",
        "Have you ever blamed someone else for your mistake?",
        "What's your most useless talent?",
        "Have you ever cried during a movie? Which one?",
        "What's the strangest thing you've ever eaten?",
        "Have you ever been jealous of a friend?",
        "What's the longest you've gone without showering?",
        "Have you ever read someone's private messages?",
        "What's your guilty pleasure song?",
      ];
      return sock.sendMessage(ctx.from, { text: `🤔 *Truth:*\n\n${pickRandom(truths)}` }, { quoted: msg });
    },
  },

  dare: {
    desc: 'Get a random dare challenge',
    category: 'fun',
    run: (sock, msg, ctx) => {
      const dares = [
        "Send a screenshot of your gallery!",
        "Let someone else write a status on your WhatsApp!",
        "Call a random contact and sing them a song!",
        "Post an embarrassing selfie!",
        "Text your crush and confess your feelings!",
        "Do 20 pushups and send a video!",
        "Change your profile picture to something funny for 24 hours!",
        "Send a voice note singing the alphabet!",
        "Let the group choose your status for a day!",
        "Tell the group your most embarrassing moment!",
        "Share your last 5 Google searches!",
        "Dance in front of everyone for 1 minute!",
        "Do your best impression of someone in the group!",
        "Speak in an accent for the next 10 minutes!",
        "Post a story saying 'I lost a bet' for 24 hours!",
        "Let someone go through your phone for 2 minutes!",
        "Send a flirty message to a random contact!",
        "Do 50 jumping jacks!",
        "Tell a joke, if no one laughs do the dare again!",
        "Record yourself doing a TikTok dance!",
      ];
      return sock.sendMessage(ctx.from, { text: `😈 *Dare:*\n\n${pickRandom(dares)}` }, { quoted: msg });
    },
  },

  flirt: {
    desc: 'Get a random flirty pickup line',
    category: 'fun',
    run: (sock, msg, ctx) => {
      const lines = [
        "Are you a magician? Because whenever I look at you, everyone else disappears. ✨",
        "Do you have a map? I keep getting lost in your eyes. 🗺️",
        "Is your name Google? Because you have everything I've been searching for. 🔍",
        "Are you French? Because Eiffel for you. 🗼",
        "Do you believe in love at first sight, or should I walk by again? 😏",
        "Are you a parking ticket? Because you've got 'FINE' written all over you. 🚗",
        "Is it hot in here, or is it just you? 🔥",
        "Are you a Wi-Fi signal? Because I'm feeling a connection. 📶",
        "Do you have a Band-Aid? I just scraped my knee falling for you. 🩹",
        "Are you a camera? Because every time I look at you, I smile. 📷",
        "If you were a triangle, you'd be acute one. 📐",
        "Are you made of copper and tellurium? Because you're Cu-Te. 🧪",
        "Do you play soccer? Because you're a keeper! ⚽",
        "Is your dad a baker? Because you're a cutie pie! 🥧",
        "Are you a time traveler? Because I see you in my future. ⏰",
      ];
      const mentioned = getMentions(msg);
      const line = pickRandom(lines);
      if (mentioned.length > 0) {
        return sock.sendMessage(ctx.from, { text: line, mentions: mentioned }, { quoted: msg });
      }
      return sock.sendMessage(ctx.from, { text: `💬 ${line}` }, { quoted: msg });
    },
  },

  compliment: {
    desc: 'Give a random compliment',
    category: 'fun',
    run: (sock, msg, ctx) => {
      const compliments = [
        "You're an awesome friend! 💙",
        "You light up the room! ✨",
        "You're someone's reason to smile! 😊",
        "You're even better than a unicorn! 🦄",
        "You're a gift to those around you! 🎁",
        "You're a smart cookie! 🍪",
        "You have the best laugh! 😄",
        "You're gorgeous! 💖",
        "You're more helpful than you realize! 🤝",
        "You have a great sense of humor! 😂",
        "You're really something special! ⭐",
        "You're an incredible friend! 🫂",
        "Your perspective is refreshing! 🌈",
        "You're making a difference! 🌍",
        "You're stronger than you think! 💪",
        "Your smile is contagious! 😁",
        "You're one of a kind! 💎",
        "You bring out the best in people! 👏",
        "You're inspiring! 🌟",
        "You have impeccable manners! 🎩",
      ];
      const mentioned = getMentions(msg);
      const text = pickRandom(compliments);
      if (mentioned.length > 0) {
        return sock.sendMessage(ctx.from, { text, mentions: mentioned }, { quoted: msg });
      }
      return sock.sendMessage(ctx.from, { text: `🌟 ${text}` }, { quoted: msg });
    },
  },

  insult: {
    desc: 'Give a silly insult (reply or tag)',
    category: 'fun',
    run: (sock, msg, ctx) => {
      const target = getTargetUser(msg, ctx.sender);
      const tag = `@${getNumber(target)}`;
      const insults = [
        "You're as useful as a white crayon. 🖍️",
        "I'd call you sharp, but that would be offensive to pencils. ✏️",
        "You're like a cloud. When you disappear, it's a beautiful day. ☁️",
        "You bring everyone so much joy... when you leave the room. 🚪",
        "If laziness was an Olympic sport, you'd come in fourth — so you wouldn't have to walk up to the podium. 🥉",
        "You have miles to go before you reach mediocre. 📏",
        "Your secrets are always safe with me. I never even listen. 🙉",
        "I'm not insulting you, I'm describing you. 📝",
        "You're the reason the gene pool needs a lifeguard. 🏊",
        "I'd agree with you, but then we'd both be wrong. ❌",
      ];
      return sock.sendMessage(ctx.from, { text: `${tag}, ${pickRandom(insults)}`, mentions: [target] }, { quoted: msg });
    },
  },

  gayrate: {
    desc: 'Playful gay percentage (reply or tag)',
    category: 'fun',
    run: (sock, msg, ctx) => {
      const target = getTargetUser(msg, ctx.sender);
      const tag = `@${getNumber(target)}`;
      const base = String(target).split('').reduce((s, c) => s + c.charCodeAt(0), 0);
      const percent = ((base % 101) + Math.floor(Math.random() * 7)) % 101;
      const messages = [
        `${tag} is ${percent}% fabulous 🌈`,
        `💖 Compatibility with rainbows: ${percent}% for ${tag}`,
        `${tag} score: ${percent}% pure glitter ✨`,
      ];
      return sock.sendMessage(ctx.from, { text: pickRandom(messages), mentions: [target] }, { quoted: msg });
    },
  },

  meme: {
    desc: 'Get a random meme',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      try {
        const data = await fetchJSON('https://meme-api.com/gimme');
        if (!data || !data.url) throw new Error('No meme found');
        const caption = `😂 *${data.title || 'Meme'}*\n📱 r/${data.subreddit || 'memes'}\n👤 ${data.author || 'Unknown'}\n⬆️ ${data.ups || 0} upvotes`;
        return sock.sendMessage(ctx.from, { image: { url: data.url }, caption }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Could not fetch meme: ${e.message}` }, { quoted: msg });
      }
    },
  },

  /* ──── GENERAL (KnightBot-Mini adapted) ──── */

  github: {
    desc: 'Show bot GitHub repository info',
    category: 'core',
    run: async (sock, msg, ctx) => {
      try {
        const data = await fetchJSON('https://api.github.com/repos/ntandoofcchisaya/NtandoMods', { headers: { 'User-Agent': 'NtandoMods' } });
        const text =
          `╭━━〈 *GitHub Repository* 〉━━╮\n\n` +
          `🤖 *Bot:* ${ctx.cfg.botName}\n` +
          `🔗 *Repo:* ${data.name}\n` +
          `👨‍💻 *Owner:* ${data.owner?.login || 'ntandoofcchisaya'}\n` +
          `📄 *Desc:* ${data.description || 'NtandoMods WhatsApp Bot'}\n` +
          `🌐 *URL:* ${data.html_url}\n\n` +
          `📊 *Stats*\n` +
          `⭐ Stars: ${data.stargazers_count || 0}\n` +
          `🍴 Forks: ${data.forks_count || 0}\n` +
          `👁️ Watchers: ${data.watchers_count || 0}\n` +
          `📦 Size: ${((data.size || 0) / 1024).toFixed(2)} MB\n\n` +
          `╰━━━━━━━━━━━━━━━━╯\n` +
          `> Powered by ${ctx.cfg.botName}`;
        return sock.sendMessage(ctx.from, { text }, { quoted: msg });
      } catch (e) {
        const text =
          `╭━━〈 *GitHub Repository* 〉━━╮\n\n` +
          `🤖 *Bot:* ${ctx.cfg.botName}\n` +
          `🔗 *Repo:* NtandoMods\n` +
          `🌐 *URL:* https://github.com/ntandoofcchisaya/NtandoMods\n\n` +
          `⚠️ Could not fetch live stats.\n` +
          `╰━━━━━━━━━━━━━━━━╯\n` +
          `> Powered by ${ctx.cfg.botName}`;
        return sock.sendMessage(ctx.from, { text }, { quoted: msg });
      }
    },
  },

  owner: {
    desc: 'Get bot owner contact info',
    category: 'core',
    run: (sock, msg, ctx) => {
      const c = ctx.cfg;
      const ownerNames = Array.isArray(c.ownerName) ? c.ownerName : [c.ownerName];
      const ownerNumbers = Array.isArray(c.ownerNumber) ? c.ownerNumber : [c.ownerNumber];
      const vCards = ownerNumbers.map((num, i) => ({
        vcard:
          'BEGIN:VCARD\n' +
          'VERSION:3.0\n' +
          `FN:${ownerNames[i] || ownerNames[0] || 'Bot Owner'}\n` +
          `TEL;waid=${getNumber(num)}:+${getNumber(num)}\n` +
          'END:VCARD',
      }));
      return sock.sendMessage(ctx.from, {
        contacts: { displayName: ownerNames[0] || 'Bot Owner', contacts: vCards },
      }).then(() => sock.sendMessage(ctx.from, { text: `👑 Here is the contact of my *Owner*.` }, { quoted: msg }));
    },
  },

  qr: {
    desc: 'Generate a QR code from text',
    category: 'utility',
    run: async (sock, msg, ctx) => {
      const text = ctx.args.join(' ');
      if (!text) {
        return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}qr <text>\n\nExample: ${ctx.cfg.prefix}qr https://google.com` }, { quoted: msg });
      }
      try {
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text)}`;
        return sock.sendMessage(ctx.from, { image: { url }, caption: `✅ QR Code generated!\n\n📝 Text: ${text}` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  ssweb: {
    desc: 'Take a screenshot of a website',
    category: 'utility',
    run: async (sock, msg, ctx) => {
      const url = ctx.args.join(' ');
      if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        return sock.sendMessage(ctx.from, { text: `❌ Please provide a valid URL!\n\nExample: ${ctx.cfg.prefix}ssweb https://github.com` }, { quoted: msg });
      }
      try {
        const ssUrl = `https://image.thum.io/get/width/1200/crop/800/${url}`;
        return sock.sendMessage(ctx.from, { image: { url: ssUrl }, caption: `📸 Screenshot of ${url}` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Failed to screenshot: ${e.message}` }, { quoted: msg });
      }
    },
  },

  getpp: {
    desc: 'Get profile picture (reply or tag)',
    category: 'utility',
    run: async (sock, msg, ctx) => {
      const target = getTargetUser(msg, ctx.sender);
      try {
        const ppUrl = await sock.profilePictureUrl(target, 'image');
        return sock.sendMessage(ctx.from, {
          image: { url: ppUrl },
          caption: `👤 Profile picture of @${getNumber(target)}`,
          mentions: [target],
        }, { quoted: msg });
      } catch (_) {
        return sock.sendMessage(ctx.from, { text: `❌ Profile picture not found for @${getNumber(target)}. It may be private.` }, { quoted: msg });
      }
    },
  },

  groupinfo: {
    desc: 'Show group information',
    category: 'group',
    groupOnly: true,
    run: async (sock, msg, ctx) => {
      try {
        const meta = await sock.groupMetadata(ctx.from);
        const admins = meta.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
        let text =
          `📋 *GROUP INFORMATION*\n\n` +
          `🏷️ Name: ${meta.subject}\n` +
          `🆔 ID: ${meta.id}\n` +
          `👥 Members: ${meta.participants.length}\n` +
          `👑 Admins: ${admins.length}\n` +
          `📝 Description: ${meta.desc || 'No description'}\n` +
          `🔒 Restricted: ${meta.restrict ? 'Yes' : 'No'}\n` +
          `📢 Announce: ${meta.announce ? 'Yes' : 'No'}\n` +
          `📅 Created: ${new Date((meta.creation || 0) * 1000).toLocaleDateString()}\n\n` +
          `👑 *Admins:*\n`;
        admins.forEach((a, i) => { text += `${i + 1}. @${getNumber(a.id)}\n`; });
        return sock.sendMessage(ctx.from, { text, mentions: admins.map(a => a.id) }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  viewonce: {
    desc: 'Reveal a view-once message (reply)',
    category: 'media',
    run: async (sock, msg, ctx) => {
      try {
        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
        const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!q) {
          return sock.sendMessage(ctx.from, { text: `🗑️ Reply to a *view-once* message to reveal it.` }, { quoted: msg });
        }
        const vo = q.viewOnceMessageV2?.message || q.viewOnceMessage?.message || q.viewOnceMessageV2Extension?.message || q;
        const mtype = Object.keys(vo)[0];
        if (!mtype || !mtype.endsWith('Message')) {
          return sock.sendMessage(ctx.from, { text: `❌ This is not a view-once message!` }, { quoted: msg });
        }
        const stream = await downloadContentFromMessage(vo[mtype], mtype.replace('Message', ''));
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        const opts = { quoted: msg };
        if (mtype === 'imageMessage') return sock.sendMessage(ctx.from, { image: buffer, caption: '👁️ View-once revealed!' }, opts);
        if (mtype === 'videoMessage') return sock.sendMessage(ctx.from, { video: buffer, caption: '👁️ View-once revealed!' }, opts);
        if (mtype === 'audioMessage') return sock.sendMessage(ctx.from, { audio: buffer, mimetype: 'audio/mpeg' }, opts);
        return sock.sendMessage(ctx.from, { text: `❌ Unsupported view-once type: ${mtype}` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Could not reveal message: ${e.message}` }, { quoted: msg });
      }
    },
  },

  translate: {
    desc: 'Translate text to another language',
    category: 'utility',
    run: async (sock, msg, ctx) => {
      if (ctx.args.length < 2) {
        return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}translate <lang> <text>\n\nExample: ${ctx.cfg.prefix}translate es Hello world\n\nCodes: en, es, fr, de, it, pt, ru, ja, ko, zh, ar, hi` }, { quoted: msg });
      }
      const lang = ctx.args[0];
      const text = ctx.args.slice(1).join(' ');
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
        const data = await fetchJSON(url);
        const translated = (data[0] || []).map(s => s[0]).join('');
        return sock.sendMessage(ctx.from, {
          text: `🌐 *Translation*\n\n📝 Original: ${text}\n🔤 Translated: ${translated}\n🌍 Language: ${lang.toUpperCase()}`,
        }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Translation failed: ${e.message}` }, { quoted: msg });
      }
    },
  },

  /* ──── ANIME (KnightBot-Mini adapted, SFW) ──── */

  waifu: {
    desc: 'Get a random SFW waifu image',
    category: 'anime',
    run: async (sock, msg, ctx) => {
      try {
        const data = await fetchJSON('https://api.waifu.pics/sfw/waifu');
        if (!data?.url) throw new Error('No image');
        return sock.sendMessage(ctx.from, { image: { url: data.url }, caption: `👘 Here's your waifu!` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Could not fetch waifu: ${e.message}` }, { quoted: msg });
      }
    },
  },

  neko: {
    desc: 'Get a random SFW neko image',
    category: 'anime',
    run: async (sock, msg, ctx) => {
      try {
        const data = await fetchJSON('https://api.waifu.pics/sfw/neko');
        if (!data?.url) throw new Error('No image');
        return sock.sendMessage(ctx.from, { image: { url: data.url }, caption: `🐱 Here's a neko!` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Could not fetch neko: ${e.message}` }, { quoted: msg });
      }
    },
  },

  megumin: {
    desc: 'Get a random Megumin image',
    category: 'anime',
    run: async (sock, msg, ctx) => {
      try {
        const data = await fetchJSON('https://api.waifu.pics/sfw/megumin');
        if (!data?.url) throw new Error('No image');
        return sock.sendMessage(ctx.from, { image: { url: data.url }, caption: `💥 Megumin! EXPLOSION!` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Could not fetch image: ${e.message}` }, { quoted: msg });
      }
    },
  },

  shinobu: {
    desc: 'Get a random Shinobu image',
    category: 'anime',
    run: async (sock, msg, ctx) => {
      try {
        const data = await fetchJSON('https://api.waifu.pics/sfw/shinobu');
        if (!data?.url) throw new Error('No image');
        return sock.sendMessage(ctx.from, { image: { url: data.url }, caption: `🦋 Shinobu!` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Could not fetch image: ${e.message}` }, { quoted: msg });
      }
    },
  },

  anime: {
    desc: 'Get anime info by name',
    category: 'anime',
    run: async (sock, msg, ctx) => {
      const query = ctx.args.join(' ');
      if (!query) {
        return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}anime <name>\n\nExample: ${ctx.cfg.prefix}anime Naruto` }, { quoted: msg });
      }
      try {
        const data = await fetchJSON(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
        const a = data?.data?.[0];
        if (!a) return sock.sendMessage(ctx.from, { text: `❌ No anime found for "${query}"` }, { quoted: msg });
        const text =
          `🎬 *${a.title}*\n` +
          `🔤 *English:* ${a.title_english || 'N/A'}\n` +
          `⭐ *Score:* ${a.score || 'N/A'}\n` +
          `📊 *Rank:* #${a.rank || 'N/A'}\n` +
          `📺 *Episodes:* ${a.episodes || 'N/A'}\n` +
          `📅 *Aired:* ${a.aired?.string || 'N/A'}\n` +
          `🎭 *Genre:* ${(a.genres || []).map(g => g.name).join(', ') || 'N/A'}\n` +
          `📖 *Synopsis:* ${(a.synopsis || 'N/A').slice(0, 300)}...\n` +
          `🔗 ${a.url}`;
        return sock.sendMessage(ctx.from, { image: { url: a.images?.jpg?.image_url }, caption: text }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  /* ──── TEXT MAKER (KnightBot-Mini adapted) ──── */

  neon: {
    desc: 'Create neon text effect',
    category: 'textmaker',
    run: async (sock, msg, ctx) => {
      const text = ctx.args.join(' ');
      if (!text) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}neon <text>\n\nExample: ${ctx.cfg.prefix}neon NtandoMods` }, { quoted: msg });
      try {
        const url = `https://api.lolhuman.xyz/api/textprome/neon?apikey=gonjeki&text=${encodeURIComponent(text)}`;
        return sock.sendMessage(ctx.from, { image: { url }, caption: `✨ Neon text by ${ctx.cfg.botName}` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  blackpink: {
    desc: 'Create BlackPink style logo',
    category: 'textmaker',
    run: async (sock, msg, ctx) => {
      const text = ctx.args.join(' ');
      if (!text) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}blackpink <text>` }, { quoted: msg });
      try {
        const url = `https://api.lolhuman.xyz/api/textprome/blackpink?apikey=gonjeki&text=${encodeURIComponent(text)}`;
        return sock.sendMessage(ctx.from, { image: { url }, caption: `🖤 BlackPink logo by ${ctx.cfg.botName}` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  glitch: {
    desc: 'Create glitch text effect',
    category: 'textmaker',
    run: async (sock, msg, ctx) => {
      const text = ctx.args.join(' ');
      if (!text) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}glitch <text>` }, { quoted: msg });
      try {
        const url = `https://api.lolhuman.xyz/api/textprome/glitch?apikey=gonjeki&text=${encodeURIComponent(text)}`;
        return sock.sendMessage(ctx.from, { image: { url }, caption: `🎮 Glitch text by ${ctx.cfg.botName}` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  fire: {
    desc: 'Create fire text effect',
    category: 'textmaker',
    run: async (sock, msg, ctx) => {
      const text = ctx.args.join(' ');
      if (!text) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}fire <text>` }, { quoted: msg });
      try {
        const url = `https://api.lolhuman.xyz/api/textprome/luxfire?apikey=gonjeki&text=${encodeURIComponent(text)}`;
        return sock.sendMessage(ctx.from, { image: { url }, caption: `🔥 Fire text by ${ctx.cfg.botName}` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  thunder: {
    desc: 'Create thunder text effect',
    category: 'textmaker',
    run: async (sock, msg, ctx) => {
      const text = ctx.args.join(' ');
      if (!text) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}thunder <text>` }, { quoted: msg });
      try {
        const url = `https://api.lolhuman.xyz/api/ephoto1/thundertext?apikey=gonjeki&text=${encodeURIComponent(text)}`;
        return sock.sendMessage(ctx.from, { image: { url }, caption: `⚡ Thunder text by ${ctx.cfg.botName}` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  text3d: {
    desc: 'Create 3D text effect',
    category: 'textmaker',
    run: async (sock, msg, ctx) => {
      const text = ctx.args.join(' ');
      if (!text) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}text3d <text>` }, { quoted: msg });
      try {
        const url = `https://api.lolhuman.xyz/api/textprome/3dtext?apikey=gonjeki&text=${encodeURIComponent(text)}`;
        return sock.sendMessage(ctx.from, { image: { url }, caption: `📐 3D text by ${ctx.cfg.botName}` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  /* ──── DOWNLOADER (KnightBot-Mini adapted) ──── */

  tiktok: {
    desc: 'Download TikTok videos',
    category: 'downloader',
    run: async (sock, msg, ctx) => {
      const url = ctx.args.join(' ');
      if (!url) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}tiktok <TikTok URL>` }, { quoted: msg });
      if (!/tiktok\.com/i.test(url)) return sock.sendMessage(ctx.from, { text: `❌ That's not a valid TikTok link!` }, { quoted: msg });
      try {
        const data = await fetchJSON(`https://api.tiklydown.me/api/download?url=${encodeURIComponent(url)}`);
        const video = data?.video || data?.images;
        if (data?.images && data.images.length > 0) {
          for (const img of data.images) {
            await sock.sendMessage(ctx.from, { image: { url: img } }, { quoted: msg });
          }
          return;
        }
        if (data?.video?.noWatermark) {
          return sock.sendMessage(ctx.from, { video: { url: data.video.noWatermark }, caption: `📥 Downloaded by ${ctx.cfg.botName}` }, { quoted: msg });
        }
        return sock.sendMessage(ctx.from, { text: `❌ Could not download video. Try another link.` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Download failed: ${e.message}` }, { quoted: msg });
      }
    },
  },

  pinterest: {
    desc: 'Download Pinterest images',
    category: 'downloader',
    run: async (sock, msg, ctx) => {
      const url = ctx.args.join(' ');
      if (!url) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}pinterest <Pinterest URL>` }, { quoted: msg });
      const pinMatch = url.match(/https?:\/\/[^\s]*pinterest[^\s]*\/pin\/[^\s]+/i) || url.match(/https?:\/\/pin\.it\/[^\s]+/i);
      if (!pinMatch) return sock.sendMessage(ctx.from, { text: `❌ Please provide a valid Pinterest pin URL!` }, { quoted: msg });
      try {
        const data = await fetchJSON(`https://api.pinout.app/?url=${encodeURIComponent(pinMatch[0])}`);
        const imageUrl = data?.image || data?.url || data?.result;
        if (!imageUrl) return sock.sendMessage(ctx.from, { text: `❌ No media found for this pin.` }, { quoted: msg });
        return sock.sendMessage(ctx.from, { image: { url: imageUrl }, caption: `📌 Downloaded by ${ctx.cfg.botName}` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Download failed: ${e.message}` }, { quoted: msg });
      }
    },
  },

  lyrics: {
    desc: 'Get song lyrics',
    category: 'media',
    run: async (sock, msg, ctx) => {
      const query = ctx.args.join(' ');
      if (!query) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}lyrics <song name>\n\nExample: ${ctx.cfg.prefix}lyrics Despacito` }, { quoted: msg });
      try {
        const data = await fetchJSON(`https://api.vreden.my.id/api/lyrics?query=${encodeURIComponent(query)}`);
        const r = data?.result;
        if (!r) return sock.sendMessage(ctx.from, { text: `❌ Could not find lyrics for "${query}"` }, { quoted: msg });
        let lyrics = r.lyrics || '';
        if (lyrics.length > 4000) lyrics = lyrics.slice(0, 4000) + '...\n\n_Lyrics too long, showing first part only_';
        const caption = `🎵 *${r.title || query}*\n👤 *Artist:* ${r.artist || 'Unknown'}\n\n📝 *Lyrics:*\n${lyrics}\n\n_Fetched by ${ctx.cfg.botName}_`;
        if (r.thumbnail) {
          return sock.sendMessage(ctx.from, { image: { url: r.thumbnail }, caption }, { quoted: msg });
        }
        return sock.sendMessage(ctx.from, { text: caption }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error fetching lyrics: ${e.message}` }, { quoted: msg });
      }
    },
  },

  song: {
    desc: 'Search and download a song',
    category: 'downloader',
    run: async (sock, msg, ctx) => {
      const query = ctx.args.join(' ');
      if (!query) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}song <song name>` }, { quoted: msg });
      try {
        const data = await fetchJSON(`https://api.vreden.my.id/api/ytplay?query=${encodeURIComponent(query)}`);
        const r = data?.result;
        if (!r) return sock.sendMessage(ctx.from, { text: `❌ No results for "${query}"` }, { quoted: msg });
        return sock.sendMessage(ctx.from, {
          audio: { url: r.url || r.download },
          mimetype: 'audio/mpeg',
          caption: `🎵 *${r.title}*\n⏱️ ${r.duration || 'N/A'}\n📥 Downloaded by ${ctx.cfg.botName}`,
        }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Download failed: ${e.message}` }, { quoted: msg });
      }
    },
  },

  ytmp3: {
    desc: 'Download YouTube audio',
    category: 'downloader',
    run: async (sock, msg, ctx) => {
      const url = ctx.args.join(' ');
      if (!url || !/youtu/i.test(url)) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}ytmp3 <YouTube URL>` }, { quoted: msg });
      try {
        const data = await fetchJSON(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`);
        const r = data?.result;
        if (!r) return sock.sendMessage(ctx.from, { text: `❌ Could not download audio` }, { quoted: msg });
        return sock.sendMessage(ctx.from, {
          audio: { url: r.url || r.download },
          mimetype: 'audio/mpeg',
          caption: `🎵 *${r.title}*\n📥 Downloaded by ${ctx.cfg.botName}`,
        }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Download failed: ${e.message}` }, { quoted: msg });
      }
    },
  },

  ytmp4: {
    desc: 'Download YouTube video',
    category: 'downloader',
    run: async (sock, msg, ctx) => {
      const url = ctx.args.join(' ');
      if (!url || !/youtu/i.test(url)) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}ytmp4 <YouTube URL>` }, { quoted: msg });
      try {
        const data = await fetchJSON(`https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`);
        const r = data?.result;
        if (!r) return sock.sendMessage(ctx.from, { text: `❌ Could not download video` }, { quoted: msg });
        return sock.sendMessage(ctx.from, {
          video: { url: r.url || r.download },
          caption: `📹 *${r.title}*\n📥 Downloaded by ${ctx.cfg.botName}`,
        }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Download failed: ${e.message}` }, { quoted: msg });
      }
    },
  },

  /* ──── AI (KnightBot-Mini adapted) ──── */

  ai: {
    desc: 'Chat with AI (ask anything)',
    category: 'ai',
    run: async (sock, msg, ctx) => {
      const question = ctx.args.join(' ');
      if (!question) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}ai <question>\n\nExample: ${ctx.cfg.prefix}ai What is the capital of France?` }, { quoted: msg });
      try {
        const data = await fetchJSON(`https://api.vreden.my.id/api/aiinfo?query=${encodeURIComponent(question)}`);
        const answer = data?.result || data?.response || data?.data || 'No response from AI.';
        return sock.sendMessage(ctx.from, { text: `🤖 *AI:*\n\n${answer}` }, { quoted: msg });
      } catch (e) {
        try {
          const data2 = await fetchJSON(`https://api.siputzx.my.id/api/ai/gpt?content=${encodeURIComponent(question)}`);
          return sock.sendMessage(ctx.from, { text: `🤖 *AI:*\n\n${data2?.data || data2?.response || 'No response from AI.'}` }, { quoted: msg });
        } catch (e2) {
          return sock.sendMessage(ctx.from, { text: `❌ AI Error: ${e.message}` }, { quoted: msg });
        }
      }
    },
  },

  gpt: {
    desc: 'Alias for AI chat',
    category: 'ai',
    run: (sock, msg, ctx) => commands.ai.run(sock, msg, ctx),
  },

  /* ──── ADMIN / GROUP MANAGEMENT (KnightBot-Mini adapted) ──── */

  welcome: {
    desc: 'Enable/disable welcome messages',
    category: 'admin',
    adminOnly: true,
    groupOnly: true,
    run: (sock, msg, ctx) => {
      const action = ctx.args[0]?.toLowerCase();
      if (!action || !['on', 'off'].includes(action)) {
        const s = getGroupSettings(ctx.from);
        return sock.sendMessage(ctx.from, {
          text: `👋 *Welcome Messages*\n\nStatus: ${s.welcome ? '✅ Enabled' : '❌ Disabled'}\n\nUsage: ${ctx.cfg.prefix}welcome on/off\n\nCustomize: ${ctx.cfg.prefix}setwelcome <message>`,
        }, { quoted: msg });
      }
      const enable = action === 'on';
      updateGroupSettings(ctx.from, { welcome: enable });
      return sock.sendMessage(ctx.from, { text: `✅ Welcome messages ${enable ? 'enabled' : 'disabled'}!` }, { quoted: msg });
    },
  },

  setwelcome: {
    desc: 'Set custom welcome message',
    category: 'admin',
    adminOnly: true,
    groupOnly: true,
    run: (sock, msg, ctx) => {
      const text = ctx.args.join(' ');
      if (!text) {
        const s = getGroupSettings(ctx.from);
        return sock.sendMessage(ctx.from, {
          text: `📝 *Current Welcome Message*\n\n${s.welcomeMessage || '(default)'}\n\n*Usage:* ${ctx.cfg.prefix}setwelcome <message>\n\n*Tip:* Use @user to mention the new member`,
        }, { quoted: msg });
      }
      if (text.length > 500) return sock.sendMessage(ctx.from, { text: `❌ Message too long! Max 500 characters.` }, { quoted: msg });
      updateGroupSettings(ctx.from, { welcomeMessage: text });
      return sock.sendMessage(ctx.from, { text: `✅ Welcome message updated!\n\n*Preview:*\n${text.replace('@user', '@' + getNumber(ctx.sender))}`, mentions: [ctx.sender] }, { quoted: msg });
    },
  },

  goodbye: {
    desc: 'Enable/disable goodbye messages',
    category: 'admin',
    adminOnly: true,
    groupOnly: true,
    run: (sock, msg, ctx) => {
      const action = ctx.args[0]?.toLowerCase();
      if (!action || !['on', 'off'].includes(action)) {
        const s = getGroupSettings(ctx.from);
        return sock.sendMessage(ctx.from, {
          text: `👋 *Goodbye Messages*\n\nStatus: ${s.goodbye ? '✅ Enabled' : '❌ Disabled'}\n\nUsage: ${ctx.cfg.prefix}goodbye on/off`,
        }, { quoted: msg });
      }
      const enable = action === 'on';
      updateGroupSettings(ctx.from, { goodbye: enable });
      return sock.sendMessage(ctx.from, { text: `✅ Goodbye messages ${enable ? 'enabled' : 'disabled'}!` }, { quoted: msg });
    },
  },

  setgoodbye: {
    desc: 'Set custom goodbye message',
    category: 'admin',
    adminOnly: true,
    groupOnly: true,
    run: (sock, msg, ctx) => {
      const text = ctx.args.join(' ');
      if (!text) {
        const s = getGroupSettings(ctx.from);
        return sock.sendMessage(ctx.from, {
          text: `📝 *Current Goodbye Message*\n\n${s.goodbyeMessage || '(default)'}\n\n*Usage:* ${ctx.cfg.prefix}setgoodbye <message>`,
        }, { quoted: msg });
      }
      if (text.length > 500) return sock.sendMessage(ctx.from, { text: `❌ Message too long! Max 500 characters.` }, { quoted: msg });
      updateGroupSettings(ctx.from, { goodbyeMessage: text });
      return sock.sendMessage(ctx.from, { text: `✅ Goodbye message updated!` }, { quoted: msg });
    },
  },

  antilink: {
    desc: 'Toggle antilink protection',
    category: 'admin',
    adminOnly: true,
    groupOnly: true,
    run: (sock, msg, ctx) => {
      const opt = ctx.args[0]?.toLowerCase();
      if (!opt) {
        const s = getGroupSettings(ctx.from);
        return sock.sendMessage(ctx.from, {
          text: `🔗 *Antilink Status*\n\nStatus: ${s.antilink ? 'ON' : 'OFF'}\nAction: ${s.antilinkAction || 'delete'}\n\nUsage:\n  ${ctx.cfg.prefix}antilink on\n  ${ctx.cfg.prefix}antilink off\n  ${ctx.cfg.prefix}antilink set delete|kick`,
        }, { quoted: msg });
      }
      if (opt === 'on') {
        updateGroupSettings(ctx.from, { antilink: true });
        return sock.sendMessage(ctx.from, { text: `✅ Antilink turned ON` }, { quoted: msg });
      }
      if (opt === 'off') {
        updateGroupSettings(ctx.from, { antilink: false });
        return sock.sendMessage(ctx.from, { text: `✅ Antilink turned OFF` }, { quoted: msg });
      }
      if (opt === 'set' && ctx.args[1]) {
        const a = ctx.args[1].toLowerCase();
        if (!['delete', 'kick'].includes(a)) return sock.sendMessage(ctx.from, { text: `❌ Invalid action. Choose delete or kick.` }, { quoted: msg });
        updateGroupSettings(ctx.from, { antilinkAction: a, antilink: true });
        return sock.sendMessage(ctx.from, { text: `✅ Antilink action set to ${a}` }, { quoted: msg });
      }
      return sock.sendMessage(ctx.from, { text: `❌ Use ${ctx.cfg.prefix}antilink for usage.` }, { quoted: msg });
    },
  },

  mute: {
    desc: 'Close group (admins only)',
    category: 'admin',
    adminOnly: true,
    groupOnly: true,
    run: async (sock, msg, ctx) => {
      try {
        await sock.groupSettingUpdate(ctx.from, 'announcement');
        return sock.sendMessage(ctx.from, { text: `🔒 Group has been closed!\n\nOnly admins can send messages now.` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}. Make sure the bot is admin.` }, { quoted: msg });
      }
    },
  },

  unmute: {
    desc: 'Open group (everyone can send)',
    category: 'admin',
    adminOnly: true,
    groupOnly: true,
    run: async (sock, msg, ctx) => {
      try {
        await sock.groupSettingUpdate(ctx.from, 'not_announcement');
        return sock.sendMessage(ctx.from, { text: `🔓 Group has been opened!\n\nEveryone can send messages now.` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}. Make sure the bot is admin.` }, { quoted: msg });
      }
    },
  },

  warn: {
    desc: 'Warn a user (reply or tag)',
    category: 'admin',
    adminOnly: true,
    groupOnly: true,
    run: (sock, msg, ctx) => {
      const target = getTargetUser(msg, ctx.sender);
      const tag = `@${getNumber(target)}`;
      const s = getGroupSettings(ctx.from);
      const warns = (s.warns || {});
      const key = getNumber(target);
      warns[key] = (warns[key] || 0) + 1;
      updateGroupSettings(ctx.from, { warns });
      let text = `⚠️ *Warning*\n\n${tag} has been warned.\nTotal warnings: ${warns[key]}/3`;
      if (warns[key] >= 3) {
        text += `\n\n🚫 ${tag} has reached 3 warnings and may be removed.`;
      }
      return sock.sendMessage(ctx.from, { text, mentions: [target] }, { quoted: msg });
    },
  },

  resetwarn: {
    desc: 'Reset warnings for a user',
    category: 'admin',
    adminOnly: true,
    groupOnly: true,
    run: (sock, msg, ctx) => {
      const target = getTargetUser(msg, ctx.sender);
      const tag = `@${getNumber(target)}`;
      const s = getGroupSettings(ctx.from);
      const warns = (s.warns || {});
      warns[getNumber(target)] = 0;
      updateGroupSettings(ctx.from, { warns });
      return sock.sendMessage(ctx.from, { text: `✅ Warnings reset for ${tag}.`, mentions: [target] }, { quoted: msg });
    },
  },

  del: {
    desc: 'Delete a message (reply)',
    category: 'admin',
    adminOnly: true,
    groupOnly: true,
    run: async (sock, msg, ctx) => {
      const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
      if (!ctxInfo?.stanzaId) return sock.sendMessage(ctx.from, { text: `❌ Reply to a message to delete it.` }, { quoted: msg });
      try {
        await sock.sendMessage(ctx.from, { delete: { remoteJid: ctx.from, fromMe: false, id: ctxInfo.stanzaId, participant: ctxInfo.participant } });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Could not delete: ${e.message}` }, { quoted: msg });
      }
    },
  },

  /* ──── OWNER (KnightBot-Mini adapted) ──── */

  broadcast: {
    desc: 'Broadcast to all groups',
    category: 'owner',
    ownerOnly: true,
    run: async (sock, msg, ctx) => {
      const message = ctx.args.join(' ');
      if (!message) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}broadcast <message>` }, { quoted: msg });
      try {
        const chats = await sock.groupFetchAllParticipating();
        const groups = Object.values(chats);
        let success = 0, failed = 0;
        for (const group of groups) {
          try {
            await sock.sendMessage(group.id, { text: `📢 *BROADCAST MESSAGE*\n\n${message}\n\n_This is a broadcast from the bot owner_` });
            success++;
          } catch (_) { failed++; }
        }
        return sock.sendMessage(ctx.from, { text: `✅ Broadcast complete!\n\n✅ Success: ${success}\n❌ Failed: ${failed}` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  mode: {
    desc: 'Toggle private/public mode',
    category: 'owner',
    ownerOnly: true,
    run: (sock, msg, ctx) => {
      const mode = ctx.args[0]?.toLowerCase();
      if (!mode) {
        const current = ctx.cfg.selfMode ? 'PRIVATE' : 'PUBLIC';
        const desc = ctx.cfg.selfMode ? 'Only owner and sudo can use commands' : 'Everyone can use commands';
        return sock.sendMessage(ctx.from, {
          text: `🤖 *Bot Mode*\n\nCurrent: *${current}*\nStatus: ${desc}\n\nUsage:\n  ${ctx.cfg.prefix}mode private\n  ${ctx.cfg.prefix}mode public`,
        }, { quoted: msg });
      }
      if (mode === 'private' || mode === 'priv') {
        ctx.cfg.selfMode = true;
        return sock.sendMessage(ctx.from, { text: `🔒 Bot mode changed to *PRIVATE*\n\nOnly owner and sudo can use commands.` }, { quoted: msg });
      }
      if (mode === 'public' || mode === 'pub') {
        ctx.cfg.selfMode = false;
        return sock.sendMessage(ctx.from, { text: `🌐 Bot mode changed to *PUBLIC*\n\nEveryone can use commands.` }, { quoted: msg });
      }
      return sock.sendMessage(ctx.from, { text: `❌ Invalid mode! Use private or public.` }, { quoted: msg });
    },
  },

  sudo: {
    desc: 'Manage sudo users',
    category: 'owner',
    ownerOnly: true,
    run: (sock, msg, ctx) => {
      const action = ctx.args[0]?.toLowerCase();
      if (!action || action === 'list') {
        const sudos = getSudoUsers();
        const list = sudos.length ? sudos.map((s, i) => `${i + 1}. @${getNumber(s)}`).join('\n') : '_No sudo users_';
        return sock.sendMessage(ctx.from, {
          text: `🔑 *Sudo Users*\n\nSudo users have owner-like privileges.\n\n*Usage:*\n  ${ctx.cfg.prefix}sudo add @user\n  ${ctx.cfg.prefix}sudo add <number>\n  ${ctx.cfg.prefix}sudo remove @user\n  ${ctx.cfg.prefix}sudo list\n\n*Current sudo users:*\n${list}`,
          mentions: sudos,
        }, { quoted: msg });
      }
      let target = getMentions(msg)[0] || getQuotedParticipant(msg) || (ctx.args[1] ? toJid(ctx.args[1]) : null);
      if (action === 'add' || action === 'a') {
        if (!target) return sock.sendMessage(ctx.from, { text: `❌ Mention a user, provide a number, or reply to a message.` }, { quoted: msg });
        const added = addSudoUser(target);
        return sock.sendMessage(ctx.from, { text: added ? `✅ @${getNumber(target)} added as sudo user.` : `ℹ️ @${getNumber(target)} is already a sudo user.`, mentions: [target] }, { quoted: msg });
      }
      if (action === 'remove' || action === 'rem' || action === 'del') {
        if (!target) return sock.sendMessage(ctx.from, { text: `❌ Mention a user, provide a number, or reply to a message.` }, { quoted: msg });
        const removed = removeSudoUser(target);
        return sock.sendMessage(ctx.from, { text: removed ? `✅ @${getNumber(target)} removed from sudo.` : `ℹ️ @${getNumber(target)} was not in the sudo list.`, mentions: [target] }, { quoted: msg });
      }
      return sock.sendMessage(ctx.from, { text: `❌ Invalid action! Use add, remove, or list.` }, { quoted: msg });
    },
  },

  anticall: {
    desc: 'Toggle anti-call (reject calls)',
    category: 'owner',
    ownerOnly: true,
    run: (sock, msg, ctx) => {
      const opt = ctx.args[0]?.toLowerCase();
      if (!opt || !['on', 'off'].includes(opt)) {
        return sock.sendMessage(ctx.from, { text: `📞 *Anti-Call: ${ctx.cfg.antiCall ? 'ON' : 'OFF'}*\n\nUsage: ${ctx.cfg.prefix}anticall on/off` }, { quoted: msg });
      }
      ctx.cfg.antiCall = opt === 'on';
      return sock.sendMessage(ctx.from, { text: ctx.cfg.antiCall ? `✅ Anti-call enabled. Calls will be auto-rejected.` : `❌ Anti-call disabled.` }, { quoted: msg });
    },
  },

  setbotpp: {
    desc: 'Set bot profile picture (reply)',
    category: 'owner',
    ownerOnly: true,
    run: async (sock, msg, ctx) => {
      const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!q?.imageMessage) return sock.sendMessage(ctx.from, { text: `❌ Reply to an image to set as bot profile picture.` }, { quoted: msg });
      try {
        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
        const stream = await downloadContentFromMessage(q.imageMessage, 'image');
        const chunks = [];
        for await (const c of stream) chunks.push(c);
        const buffer = Buffer.concat(chunks);
        await sock.updateProfilePicture(sock.user.id, buffer);
        return sock.sendMessage(ctx.from, { text: `✅ Bot profile picture updated!` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  clear: {
    desc: 'Clear chat messages',
    category: 'owner',
    ownerOnly: true,
    run: async (sock, msg, ctx) => {
      try {
        await sock.chatModify({ clear: { messages: [{ key: msg.key, messageTimestamp: msg.messageTimestamp }] } }, ctx.from);
        return sock.sendMessage(ctx.from, { text: `🧹 Chat cleared!` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  help: {
    desc: 'Alias for menu',
    category: 'core',
    run: (sock, msg, ctx) => commands.menu.run(sock, msg, ctx),
  },
};

/* ════════════════════════════════════════════════════════════
   EXPORTS
   ════════════════════════════════════════════════════════════ */

const helpers = {
  getSender, getNumber, isOwner, isGroupAdmin, isBotAdmin,
  getBody, getQuotedText, getQuotedImage, fmtUptime, pickRandom,
};

module.exports = { commands, helpers };
