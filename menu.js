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

  // ────────────────────────────────────────────────────────────
  //  20 ADDITIONAL GOOD COMMANDS
  // ────────────────────────────────────────────────────────────

  fact: {
    desc: 'Get a random fun fact',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const facts = [
        'Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that is still edible.',
        'Octopuses have three hearts and blue blood.',
        'A day on Venus is longer than a year on Venus.',
        'Bananas are berries, but strawberries are not.',
        'The shortest war in history lasted 38 minutes (Anglo-Zanzibar War, 1896).',
        'Wombat poop is cube-shaped.',
        'A group of flamingos is called a "flamboyance".',
        'The unicorn is the national animal of Scotland.',
        'Sharks existed before trees did.',
        'A bolt of lightning is five times hotter than the surface of the sun.',
        'Cows have best friends and get stressed when separated from them.',
        'The human nose can remember 50,000 different scents.',
        'A blue whale\'s heart is the size of a small car.',
        'There are more possible chess games than atoms in the universe.',
        'Sea otters hold hands while sleeping so they don\'t drift apart.',
        'The Eiffel Tower can grow more than 6 inches taller in summer due to heat expansion.',
        'A jiffy is an actual unit of time: 1/100th of a second.',
        'The longest English word without a vowel is "rhythm".',
        'Dolphins give each other names and call each other by them.',
        'A snail can sleep for up to 3 years.',
      ];
      return sock.sendMessage(ctx.from, { text: `💡 *Fun Fact*\n\n${pickRandom(facts)}` }, { quoted: msg });
    },
  },

  advice: {
    desc: 'Get a random piece of life advice',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const advices = [
        'Don\'t compare yourself to others. Compare yourself to who you were yesterday.',
        'If you\'re not early, you\'re late. Show up prepared.',
        'Save 10% of every paycheck before you spend anything.',
        'Listen more than you speak. You learn nothing by talking.',
        'Your reputation is built over years and destroyed in seconds. Guard it.',
        'Treat everyone with respect, especially those who can do nothing for you.',
        'Take care of your body — it\'s the only place you have to live.',
        'Learn to say no without feeling guilty.',
        'Invest in experiences, not things. Memories appreciate; possessions depreciate.',
        'When in doubt, sleep on it. Big decisions rarely need to be made at midnight.',
        'Read for 30 minutes a day. It compounds over a lifetime.',
        'Keep your circle small and your mind open.',
        'Failures are data. Collect it, adjust, and try again.',
        'Never make a permanent decision based on a temporary emotion.',
        'Be the person your younger self needed.',
        'Discipline beats motivation every time. Build habits, not hype.',
        'Compliment people behind their backs. It says more about you.',
        'Money is a tool, not a score. Use it to buy time, not status.',
        'Forgive quickly, but don\'t forget the lesson.',
        'The best time to start was yesterday. The second best time is now.',
      ];
      return sock.sendMessage(ctx.from, { text: `🧭 *Advice*\n\n${pickRandom(advices)}` }, { quoted: msg });
    },
  },

  why: {
    desc: 'Get a random funny "why" question',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const whys = [
        'Why do we press the remote harder when the batteries are dying?',
        'Why is the word "abbreviation" so long?',
        'Why does lemon juice have artificial flavor but dishwashing liquid has real lemons?',
        'Why do they call it a building if it\'s already built?',
        'Why is the man who invests all your money called a "broker"?',
        'Why do they sterilize needles for lethal injections?',
        'Why don\'t sheep shrink when it rains?',
        'Why do we park in driveways and drive on parkways?',
        'Why is "phonics" not spelled the way it sounds?',
        'Why do they put Braille dots on the keypad of drive-up ATMs?',
        'Why do you need a driver\'s license to buy liquor when you can\'t drink and drive?',
        'Why are they called "apartments" when they\'re stuck together?',
        'Why do we call it a "hot water heater"? If the water is already hot, why heat it?',
        'Why do noses run and feet smell?',
        'Why do you need an appointment to see a therapist? Aren\'t we all walk-ins?',
      ];
      return sock.sendMessage(ctx.from, { text: `🤔 *Why?*\n\n${pickRandom(whys)}` }, { quoted: msg });
    },
  },

  hack: {
    desc: 'Fake hacking animation (just for fun)',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const target = ctx.args.join(' ') || 'the target';
      const lines = [
        '🔑 Initializing hack protocol...',
        '📡 Connecting to mainframe...',
        '💻 Bypassing firewall layer 1...',
        '🛡️ Bypassing firewall layer 2...',
        '🔓 Decrypting password hash...',
        '📥 Downloading data packets...',
        '⚠️ Injecting trojan payload...',
        '✅ Access granted!',
        '💀 Hacking complete.',
        `\n*Successfully hacked ${target}!* (totally real 😏)`,
      ];
      let sent = await sock.sendMessage(ctx.from, { text: '🟢 *HACK INITIATED*\n' + lines[0] }, { quoted: msg });
      for (let i = 1; i < lines.length; i++) {
        await new Promise(r => setTimeout(r, 800));
        try { await sock.sendMessage(ctx.from, { text: lines[i], edit: sent.key }); } catch (_) {}
      }
    },
  },

  rate: {
    desc: 'Rate something out of 100',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const subject = ctx.args.join(' ');
      if (!subject) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}rate <thing or @user>` }, { quoted: msg });
      // Deterministic-ish rating based on text hash so the same input gives same result
      let hash = 0;
      for (let i = 0; i < subject.length; i++) hash = ((hash << 5) - hash + subject.charCodeAt(i)) | 0;
      const rating = Math.abs(hash) % 101;
      const stars = '⭐'.repeat(Math.ceil(rating / 20));
      const comments = rating >= 90 ? 'Absolutely elite!' : rating >= 75 ? 'Pretty great!' : rating >= 50 ? 'Not bad at all.' : rating >= 25 ? 'Could be better...' : 'Yikes 😬';
      return sock.sendMessage(ctx.from, { text: `📊 *Rating*\n\n*${subject}* gets: *${rating}/100*\n${stars}\n\n_${comments}_` }, { quoted: msg });
    },
  },

  couple: {
    desc: 'Check couple compatibility between two mentioned users',
    category: 'fun',
    groupOnly: true,
    run: async (sock, msg, ctx) => {
      const mentions = getMentions(msg);
      if (mentions.length < 2) return sock.sendMessage(ctx.from, { text: `❌ Tag two people!\nUsage: ${ctx.cfg.prefix}couple @user1 @user2` }, { quoted: msg });
      const a = getNumber(mentions[0]);
      const b = getNumber(mentions[1]);
      // Deterministic compatibility from the two numbers
      let hash = 0;
      const seed = a + b;
      for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
      const pct = Math.abs(hash) % 101;
      const heart = '❤️'.repeat(Math.ceil(pct / 20));
      const verdict = pct >= 90 ? 'Soulmates! 💍' : pct >= 70 ? 'A great match! 💕' : pct >= 50 ? 'Could work out 😊' : pct >= 30 ? 'It\'s complicated... 🤔' : 'Maybe just stay friends 😅';
      return sock.sendMessage(ctx.from, {
        text: `💘 *Couple Compatibility*\n\n@${a} ❤️ @${b}\n\nLove Score: *${pct}%*\n${heart}\n\n_${verdict}_`,
        mentions: [mentions[0], mentions[1]],
      }, { quoted: msg });
    },
  },

  character: {
    desc: 'Get a random character description for a user',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const mentions = getMentions(msg);
      const target = mentions.length ? `@${getNumber(mentions[0])}` : 'You';
      const traits = ['loyal', 'brave', 'mysterious', 'chaotic', 'kind-hearted', 'stubborn', 'ambitious', 'clever', 'dramatic', 'chill', 'competitive', 'sweet', 'rebellious', 'wise', 'funny', 'quiet', 'bold', 'gentle', 'sneaky', 'passionate'];
      const zodiacs = ['Aries 🔥', 'Taurus 🐂', 'Gemini ♊', 'Cancer 🦀', 'Leo 🦁', 'Virgo ♍', 'Libra ⚖️', 'Scorpio 🦂', 'Sagittarius 🏹', 'Capricorn 🐐', 'Aquarius 🌊', 'Pisces 🐟'];
      const vibes = ['main character energy', 'secret villain energy', 'comic relief energy', 'silent protector energy', 'chaotic neutral energy', 'mentor energy', 'ride-or-die energy', 'plot twist energy'];
      const t1 = pickRandom(traits), t2 = pickRandom(traits.filter(t => t !== t1));
      return sock.sendMessage(ctx.from, {
        text: `🎭 *Character Profile*\n\n${target} is *${t1}* and *${t2}*.\nZodiac: ${pickRandom(zodiacs)}\nVibe: ${pickRandom(vibes)}\n\n_Rating: ${Math.floor(Math.random() * 40) + 60}/100_`,
        mentions: mentions.length ? [mentions[0]] : [],
      }, { quoted: msg });
    },
  },

  hug: {
    desc: 'Send a virtual hug to a mentioned user',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const mentions = getMentions(msg);
      if (!mentions.length) return sock.sendMessage(ctx.from, { text: `❌ Tag someone to hug!\nUsage: ${ctx.cfg.prefix}hug @user` }, { quoted: msg });
      const sender = getNumber(ctx.sender);
      const hugs = ['🤗', '🫂', '💞🤗', '温暖的拥抱~ 🤗', 'big squishy hug 🤗💕'];
      return sock.sendMessage(ctx.from, {
        text: `*${sender}* sent a ${pickRandom(hugs)} to *@${getNumber(mentions[0])}*\n\n"A hug is a handshake from the heart." 💚`,
        mentions: [mentions[0]],
      }, { quoted: msg });
    },
  },

  slap: {
    desc: 'Slap a mentioned user (fun)',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const mentions = getMentions(msg);
      if (!mentions.length) return sock.sendMessage(ctx.from, { text: `❌ Tag someone to slap!\nUsage: ${ctx.cfg.prefix}slap @user` }, { quoted: msg });
      const sender = getNumber(ctx.sender);
      const slaps = ['a mighty slap 👋💥', 'a wet fish slap 🐟💥', 'a pillow slap 🛏️💥', 'a flying noodle slap 🍜💥', 'a dramatic slap 👋🔥'];
      return sock.sendMessage(ctx.from, {
        text: `*${sender}* gave *@${getNumber(mentions[0])}* ${pickRandom(slaps)}`,
        mentions: [mentions[0]],
      }, { quoted: msg });
    },
  },

  styletext: {
    desc: 'Convert text into fancy unicode styles',
    category: 'utility',
    run: async (sock, msg, ctx) => {
      const text = ctx.args.join(' ');
      if (!text) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}styletext <text>` }, { quoted: msg });
      const map = {
        bold: c => c.split('').map(ch => String.fromCharCode(ch.charCodeAt(0) + 0x1D400 - 65)).join(''),
        italic: c => c.split('').map(ch => String.fromCharCode(ch.charCodeAt(0) + 0x1D434 - 65)).join(''),
        monospace: c => c.split('').map(ch => String.fromCharCode(ch.charCodeAt(0) + 0x1D670 - 65)).join(''),
        strikethrough: c => c.split('').map(ch => ch + '\u0336').join(''),
        underline: c => c.split('').map(ch => ch + '\u0332').join(''),
      };
      // Simple fancy maps using unicode offsets for A-Z / a-z
      const fancy = (c, off) => c.split('').map(ch => {
        const code = ch.charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCharCode(0x1D400 + off + (code - 65));
        if (code >= 97 && code <= 122) return String.fromCharCode(0x1D400 + off + 26 + (code - 97));
        return ch;
      }).join('');
      const out = [
        `𝐁𝐨𝐥𝐝: ${fancy(text, 0)}`,
        `𝐼𝑡𝑎𝑙𝑖𝑐: ${fancy(text, 4)}`,
        `𝙗𝙤𝙡𝙙 𝙞𝙩𝙖𝙡𝙞𝙘: ${fancy(text, 6)}`,
        `𝔅𝔬𝔩𝔡 𝔉𝔯𝔞𝔨𝔱𝔲𝔯: ${fancy(text, 8)}`,
        `𝕄𝕠𝕟𝕠𝕤𝕡𝕒𝕔𝕖: ${fancy(text, 12)}`,
        `𝖲𝖺𝗇𝗌 𝖡𝗈𝗅𝖽: ${fancy(text, 14)}`,
        `S̶t̶r̶i̶k̶e̶: ${text.split('').map(ch => ch + '\u0336').join('')}`,
        `U̲n̲d̲e̲r̲l̲i̲n̲e̲: ${text.split('').map(ch => ch + '\u0332').join('')}`,
      ];
      return sock.sendMessage(ctx.from, { text: `✨ *Fancy Text Styles*\n\n${out.join('\n\n')}` }, { quoted: msg });
    },
  },

  fancy: {
    desc: 'Generate fancy text in multiple decorative styles',
    category: 'utility',
    run: async (sock, msg, ctx) => {
      const text = ctx.args.join(' ');
      if (!text) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}fancy <text>` }, { quoted: msg });
      const convert = (c, start) => c.split('').map(ch => {
        const code = ch.charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCharCode(start + (code - 65));
        if (code >= 97 && code <= 122) return String.fromCharCode(start + 26 + (code - 97));
        return ch;
      }).join('');
      const circled = (c) => c.split('').map(ch => {
        const code = ch.charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCharCode(0x24B6 + (code - 65));
        if (code >= 97 && code <= 122) return String.fromCharCode(0x24D0 + (code - 97));
        return ch;
      }).join('');
      const fullwidth = (c) => c.split('').map(ch => {
        const code = ch.charCodeAt(0);
        if (code >= 33 && code <= 126) return String.fromCharCode(code + 0xFEE0);
        return ch;
      }).join('');
      const styles = [
        `𝓢𝓬𝓻𝓲𝓹𝓽: ${convert(text, 0x1D4D0)}`,
        `𝔉𝔯𝔞𝔨𝔱𝔲𝔯: ${convert(text, 0x1D504)}`,
        `𝕆𝕝𝕪𝕞𝕡𝕚𝕒: ${convert(text, 0x1D538)}`,
        `Ⓒⓘⓡⓒⓛⓔⓓ: ${circled(text)}`,
        `Ｆｕｌｌｗｉｄｔｈ: ${fullwidth(text)}`,
        `𝗦𝗮𝗻𝘀: ${convert(text, 0x1D5D4)}`,
        `𝘉𝘰𝘭𝘥 𝘐𝘵𝘢𝘭𝘪𝘤: ${convert(text, 0x1D608)}`,
        `𝒮𝒸𝓇𝒾𝓅𝓉: ${convert(text, 0x1D4B6)}`,
      ];
      return sock.sendMessage(ctx.from, { text: `🎭 *Fancy Text*\n\n${styles.join('\n\n')}` }, { quoted: msg });
    },
  },

  tinyurl: {
    desc: 'Shorten a URL using TinyURL',
    category: 'utility',
    run: async (sock, msg, ctx) => {
      const url = ctx.args[0];
      if (!url || !/^https?:\/\//i.test(url)) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}tinyurl <url>\nExample: ${ctx.cfg.prefix}tinyurl https://example.com` }, { quoted: msg });
      try {
        const data = await fetchJSON(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, { text: true });
        return sock.sendMessage(ctx.from, { text: `🔗 *Shortened URL*\n\n${data}` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Failed to shorten URL: ${e.message}` }, { quoted: msg });
      }
    },
  },

  google: {
    desc: 'Generate a Google search link',
    category: 'utility',
    run: async (sock, msg, ctx) => {
      const query = ctx.args.join(' ');
      if (!query) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}google <search query>` }, { quoted: msg });
      const link = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      return sock.sendMessage(ctx.from, { text: `🔍 *Google Search*\n\nQuery: ${query}\nLink: ${link}` }, { quoted: msg });
    },
  },

  wikipedia: {
    desc: 'Search Wikipedia for a summary',
    category: 'utility',
    run: async (sock, msg, ctx) => {
      const query = ctx.args.join(' ');
      if (!query) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}wikipedia <topic>` }, { quoted: msg });
      try {
        const data = await fetchJSON(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/ /g, '_'))}`);
        if (data.type === 'disambiguation' || !data.extract) {
          return sock.sendMessage(ctx.from, { text: `❌ No direct article found for "${query}". Try a more specific term.` }, { quoted: msg });
        }
        const text = `📚 *Wikipedia: ${data.title}*\n\n${data.extract}${data.thumbnail?.source ? '' : ''}\n\n🔗 ${data.content_urls?.desktop?.page || ''}`;
        return sock.sendMessage(ctx.from, { text }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Wikipedia lookup failed: ${e.message}` }, { quoted: msg });
      }
    },
  },

  repo: {
    desc: 'Get GitHub repository info by name (owner/repo)',
    category: 'utility',
    run: async (sock, msg, ctx) => {
      const repo = ctx.args.join(' ').trim();
      if (!repo || !repo.includes('/')) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}repo <owner/repo>\nExample: ${ctx.cfg.prefix}repo ntandoofcchisaya/NtandoMods` }, { quoted: msg });
      try {
        const data = await fetchJSON(`https://api.github.com/repos/${repo}`);
        const text = `📦 *GitHub Repo*\n\n*${data.full_name}*\n${data.description || '_No description_'}\n\n⭐ Stars: ${data.stargazers_count}\n🍴 Forks: ${data.forks_count}\n👁️ Watchers: ${data.watchers_count}\n📝 Language: ${data.language || 'N/A'}\n📅 Created: ${data.created_at?.slice(0, 10)}\n🔄 Updated: ${data.updated_at?.slice(0, 10)}\n\n🔗 ${data.html_url}`;
        return sock.sendMessage(ctx.from, { text }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Repo not found or error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  tagme: {
    desc: 'Tag yourself (mention your own number)',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const num = getNumber(ctx.sender);
      return sock.sendMessage(ctx.from, { text: `👋 Here you go: @${num}`, mentions: [ctx.sender] }, { quoted: msg });
    },
  },

  poll: {
    desc: 'Create a simple poll',
    category: 'group',
    groupOnly: true,
    run: async (sock, msg, ctx) => {
      const text = ctx.args.join(' ');
      if (!text || !text.includes('|')) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}poll Question | Option1 | Option2 | ...\nExample: ${ctx.cfg.prefix}poll Best food? | Pizza | Burger | Sushi` }, { quoted: msg });
      const parts = text.split('|').map(s => s.trim());
      const question = parts.shift();
      if (parts.length < 2) return sock.sendMessage(ctx.from, { text: `❌ Provide at least 2 options separated by |` }, { quoted: msg });
      let body = `📊 *Poll*\n\n*${question}*\n\n`;
      parts.forEach((opt, i) => { body += `${i + 1}️⃣ ${opt}\n`; });
      body += `\n_React with the number to vote!_`;
      return sock.sendMessage(ctx.from, { text: body }, { quoted: msg });
    },
  },

  randompw: {
    desc: 'Generate a random secure password',
    category: 'utility',
    run: async (sock, msg, ctx) => {
      const len = Math.min(Math.max(parseInt(ctx.args[0]) || 12, 6), 64);
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
      let pw = '';
      for (let i = 0; i < len; i++) pw += chars[Math.floor(Math.random() * chars.length)];
      return sock.sendMessage(ctx.from, { text: `🔐 *Generated Password* (${len} chars)\n\n\`${pw}\`\n\n_Keep it safe and don't share it!_` }, { quoted: msg });
    },
  },

  hash: {
    desc: 'Hash text using MD5 or SHA256',
    category: 'utility',
    run: async (sock, msg, ctx) => {
      const algo = (ctx.args[0] || '').toLowerCase();
      const text = ctx.args.slice(1).join(' ');
      if (!algo || !text || !['md5', 'sha256'].includes(algo)) {
        return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}hash <md5|sha256> <text>\nExample: ${ctx.cfg.prefix}hash sha256 hello` }, { quoted: msg });
      }
      const crypto = require('crypto');
      const hash = crypto.createHash(algo).update(text).digest('hex');
      return sock.sendMessage(ctx.from, { text: `🔐 *${algo.toUpperCase()} Hash*\n\nInput: ${text}\nHash: \`${hash}\`` }, { quoted: msg });
    },
  },

  reverse: {
    desc: 'Reverse the given text',
    category: 'utility',
    run: async (sock, msg, ctx) => {
      const text = ctx.args.join(' ');
      if (!text) return sock.sendMessage(ctx.from, { text: `❌ Usage: ${ctx.cfg.prefix}reverse <text>` }, { quoted: msg });
      const reversed = text.split('').reverse().join('');
      return sock.sendMessage(ctx.from, { text: `🔁 *Reversed Text*\n\n${reversed}` }, { quoted: msg });
    },
  },

  // ────────────────────────────────────────────────────────────
  //  10 HACK-THEMED FUN COMMANDS
  // ────────────────────────────────────────────────────────────

  trace: {
    desc: 'Fake IP trace animation (fun)',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const target = ctx.args.join(' ') || 'target';
      const lines = [
        '🔍 Starting IP trace...',
        '📡 Pinging network nodes...',
        '🌐 Routing through 7 servers...',
        '📍 Locating ISP gateway...',
        ' triangulating signal...',
        '✅ IP Address: 41.203.' + (Math.floor(Math.random()*255)) + '.' + (Math.floor(Math.random()*255)),
        '🏙️ Location: Johannesburg, South Africa',
        '📡 ISP: MTN Network',
        '💻 Device: Android 14',
        '✅ Trace complete for ' + target + '! (not real 😏)',
      ];
      let sent = await sock.sendMessage(ctx.from, { text: '🌐 *IP TRACE*\n' + lines[0] }, { quoted: msg });
      for (let i = 1; i < lines.length; i++) {
        await new Promise(r => setTimeout(r, 700));
        try { await sock.sendMessage(ctx.from, { text: lines[i], edit: sent.key }); } catch (_) {}
      }
    },
  },

  decrypt: {
    desc: 'Fake message decryption animation (fun)',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const lines = [
        '🔐 Intercepting encrypted message...',
        '📦 Packet captured: 1024 bytes',
        '🔑 Analyzing encryption layer (AES-256)...',
        '🧮 Brute-forcing decryption key...',
        '⏳ 25%... 50%... 75%... 100%',
        '🔓 Decryption successful!',
        '💬 Message reads: "Don\'t forget to buy milk" 🥛',
        '✅ Mission accomplished! (totally fake 😏)',
      ];
      let sent = await sock.sendMessage(ctx.from, { text: '🔓 *DECRYPT MODE*\n' + lines[0] }, { quoted: msg });
      for (let i = 1; i < lines.length; i++) {
        await new Promise(r => setTimeout(r, 650));
        try { await sock.sendMessage(ctx.from, { text: lines[i], edit: sent.key }); } catch (_) {}
      }
    },
  },

  inject: {
    desc: 'Fake code injection animation (fun)',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const lines = [
        '💉 Preparing injection payload...',
        '🎯 Target: main database server',
        '🔌 Connecting to port 3306...',
        '📝 Crafting SQL injection string...',
        ` payload: ' OR '1'='1 --`,
        '⚡ Injecting payload...',
        '✅ Database access granted!',
        '📊 Extracting 10,000 records...',
        '✅ Injection complete! (just a joke 😏)',
      ];
      let sent = await sock.sendMessage(ctx.from, { text: '💉 *CODE INJECTION*\n' + lines[0] }, { quoted: msg });
      for (let i = 1; i < lines.length; i++) {
        await new Promise(r => setTimeout(r, 700));
        try { await sock.sendMessage(ctx.from, { text: lines[i], edit: sent.key }); } catch (_) {}
      }
    },
  },

  breach: {
    desc: 'Fake security breach animation (fun)',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const target = ctx.args.join(' ') || 'the server';
      const lines = [
        '🚨 Initiating breach protocol on ' + target + '...',
        '🛡️ Scanning for vulnerabilities...',
        '⚠️ CVE-2024-1337 detected!',
        '💣 Exploiting buffer overflow...',
        '🔓 Bypassing 3 security layers...',
        '📥 Dumping credentials table...',
        '💀 Breach successful!',
        '📊 5,234 accounts compromised. (not really 😏)',
      ];
      let sent = await sock.sendMessage(ctx.from, { text: '🚨 *SECURITY BREACH*\n' + lines[0] }, { quoted: msg });
      for (let i = 1; i < lines.length; i++) {
        await new Promise(r => setTimeout(r, 750));
        try { await sock.sendMessage(ctx.from, { text: lines[i], edit: sent.key }); } catch (_) {}
      }
    },
  },

  virus: {
    desc: 'Fake virus release animation (fun)',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const lines = [
        '🦠 Compiling virus payload...',
        '📦 Package: trojan.exe (2.4 MB)',
        '🌐 Uploading to C2 server...',
        '📧 Spamming 1,000 email targets...',
        '💻 Infecting connected devices...',
        '⏳ Infection rate: 73%...',
        '💀 System compromised!',
        '🧹 Just kidding — no virus here! 😏 Stay safe online.',
      ];
      let sent = await sock.sendMessage(ctx.from, { text: '🦠 *VIRUS DEPLOYMENT*\n' + lines[0] }, { quoted: msg });
      for (let i = 1; i < lines.length; i++) {
        await new Promise(r => setTimeout(r, 700));
        try { await sock.sendMessage(ctx.from, { text: lines[i], edit: sent.key }); } catch (_) {}
      }
    },
  },

  ddos: {
    desc: 'Fake DDoS attack animation (fun)',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const target = ctx.args.join(' ') || 'example.com';
      const lines = [
        '⚡ Launching DDoS attack on ' + target + '...',
        '🤖 Deploying 10,000 botnet nodes...',
        '📡 Sending 50,000 req/sec...',
        '📈 Traffic: 2.3 Gbps...',
        '🔥 Target response time: 5000ms+',
        '💀 Server is down!',
        '⏹️ Attack stopped after 30 seconds.',
        '😏 Relax — this is just a simulation!',
      ];
      let sent = await sock.sendMessage(ctx.from, { text: '⚡ *DDOS ATTACK*\n' + lines[0] }, { quoted: msg });
      for (let i = 1; i < lines.length; i++) {
        await new Promise(r => setTimeout(r, 700));
        try { await sock.sendMessage(ctx.from, { text: lines[i], edit: sent.key }); } catch (_) {}
      }
    },
  },

  brute: {
    desc: 'Fake brute force password animation (fun)',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const lines = [
        '🔨 Loading brute force dictionary...',
        '📦 14,000,000 passwords loaded',
        '⚡ Trying: password123... ❌',
        '⚡ Trying: admin2024... ❌',
        '⚡ Trying: iloveyou... ❌',
        '⚡ Trying: qwerty123... ❌',
        '✅ Password found: "ntando123" 🔑',
        '😏 Just a joke — use strong passwords IRL!',
      ];
      let sent = await sock.sendMessage(ctx.from, { text: '🔨 *BRUTE FORCE*\n' + lines[0] }, { quoted: msg });
      for (let i = 1; i < lines.length; i++) {
        await new Promise(r => setTimeout(r, 600));
        try { await sock.sendMessage(ctx.from, { text: lines[i], edit: sent.key }); } catch (_) {}
      }
    },
  },

  spy: {
    desc: 'Fake surveillance spy animation (fun)',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const target = ctx.args.join(' ') || 'the target';
      const lines = [
        '🕵️ Activating spy mode on ' + target + '...',
        '📷 Accessing front camera...',
        '🎙️ Tapping microphone feed...',
        '📍 GPS: -26.2041°, 28.0473°',
        '💬 Last message: "on my way"',
        '🔋 Battery: 67%',
        '📸 Screenshot captured!',
        '🕵️ Surveillance complete! (fake — privacy matters 😏)',
      ];
      let sent = await sock.sendMessage(ctx.from, { text: '🕵️ *SPY MODE*\n' + lines[0] }, { quoted: msg });
      for (let i = 1; i < lines.length; i++) {
        await new Promise(r => setTimeout(r, 700));
        try { await sock.sendMessage(ctx.from, { text: lines[i], edit: sent.key }); } catch (_) {}
      }
    },
  },

  steal: {
    desc: 'Fake data theft animation (fun)',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const target = ctx.args.join(' ') || 'the victim';
      const lines = [
        '🎭 Disguising as trusted contact...',
        '🔗 Sending phishing link to ' + target + '...',
        '👆 Target clicked the link!',
        '🍪 Stealing session cookies...',
        '💳 Grabbing saved card details...',
        '📸 Downloading gallery (127 photos)...',
        '📦 Packaging stolen data...',
        '✅ Data theft complete! (not real — don\'t phish 😏)',
      ];
      let sent = await sock.sendMessage(ctx.from, { text: '🎭 *DATA THEFT*\n' + lines[0] }, { quoted: msg });
      for (let i = 1; i < lines.length; i++) {
        await new Promise(r => setTimeout(r, 700));
        try { await sock.sendMessage(ctx.from, { text: lines[i], edit: sent.key }); } catch (_) {}
      }
    },
  },

  crack: {
    desc: 'Fake WiFi password crack animation (fun)',
    category: 'fun',
    run: async (sock, msg, ctx) => {
      const target = ctx.args.join(' ') || 'WiFi_Network';
      const lines = [
        '📡 Scanning for WiFi networks...',
        '✅ Found: ' + target,
        '🔒 Encryption: WPA2',
        ' handshake captured!',
        '🧮 Running dictionary attack...',
        '⏳ 10%... 40%... 80%... 100%',
        '🔑 Password: "mzansi2024"',
        '✅ WiFi cracked! (purely fictional 😏)',
      ];
      let sent = await sock.sendMessage(ctx.from, { text: '📶 *WIFI CRACK*\n' + lines[0] }, { quoted: msg });
      for (let i = 1; i < lines.length; i++) {
        await new Promise(r => setTimeout(r, 700));
        try { await sock.sendMessage(ctx.from, { text: lines[i], edit: sent.key }); } catch (_) {}
      }
    },
  },

  // ────────────────────────────────────────────────────────────
  //  10 IMAGE EDIT COMMANDS (require Jimp, reply to an image)
  // ────────────────────────────────────────────────────────────

  blur: {
    desc: 'Blur the replied image',
    category: 'media',
    run: async (sock, msg, ctx) => {
      const imgMsg = getQuotedImage(msg);
      if (!imgMsg) return sock.sendMessage(ctx.from, { text: '❌ Reply to an image with this command.' }, { quoted: msg });
      try {
        const buffer = await sock.downloadMediaMessage?.({ key: msg.key, message: { imageMessage: imgMsg } });
        if (!buffer) throw new Error('download failed');
        const Jimp = require('jimp');
        const image = await Jimp.read(buffer);
        image.blur(10);
        const out = await image.getBufferAsync(Jimp.MIME_PNG);
        return sock.sendMessage(ctx.from, { image: out, caption: '🌫️ Blurred image' }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  grayscale: {
    desc: 'Convert replied image to grayscale',
    category: 'media',
    run: async (sock, msg, ctx) => {
      const imgMsg = getQuotedImage(msg);
      if (!imgMsg) return sock.sendMessage(ctx.from, { text: '❌ Reply to an image with this command.' }, { quoted: msg });
      try {
        const buffer = await sock.downloadMediaMessage?.({ key: msg.key, message: { imageMessage: imgMsg } });
        if (!buffer) throw new Error('download failed');
        const Jimp = require('jimp');
        const image = await Jimp.read(buffer);
        image.grayscale();
        const out = await image.getBufferAsync(Jimp.MIME_PNG);
        return sock.sendMessage(ctx.from, { image: out, caption: '🖤 Grayscale image' }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  sepia: {
    desc: 'Apply sepia tone to replied image',
    category: 'media',
    run: async (sock, msg, ctx) => {
      const imgMsg = getQuotedImage(msg);
      if (!imgMsg) return sock.sendMessage(ctx.from, { text: '❌ Reply to an image with this command.' }, { quoted: msg });
      try {
        const buffer = await sock.downloadMediaMessage?.({ key: msg.key, message: { imageMessage: imgMsg } });
        if (!buffer) throw new Error('download failed');
        const Jimp = require('jimp');
        const image = await Jimp.read(buffer);
        image.sepia();
        const out = await image.getBufferAsync(Jimp.MIME_PNG);
        return sock.sendMessage(ctx.from, { image: out, caption: '🟤 Sepia tone image' }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  invert: {
    desc: 'Invert colors of replied image',
    category: 'media',
    run: async (sock, msg, ctx) => {
      const imgMsg = getQuotedImage(msg);
      if (!imgMsg) return sock.sendMessage(ctx.from, { text: '❌ Reply to an image with this command.' }, { quoted: msg });
      try {
        const buffer = await sock.downloadMediaMessage?.({ key: msg.key, message: { imageMessage: imgMsg } });
        if (!buffer) throw new Error('download failed');
        const Jimp = require('jimp');
        const image = await Jimp.read(buffer);
        image.invert();
        const out = await image.getBufferAsync(Jimp.MIME_PNG);
        return sock.sendMessage(ctx.from, { image: out, caption: '🔃 Inverted colors' }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  rotate: {
    desc: 'Rotate replied image (usage: .rotate <degrees>)',
    category: 'media',
    run: async (sock, msg, ctx) => {
      const imgMsg = getQuotedImage(msg);
      if (!imgMsg) return sock.sendMessage(ctx.from, { text: '❌ Reply to an image with this command.' }, { quoted: msg });
      const deg = parseInt(ctx.args[0]) || 90;
      try {
        const buffer = await sock.downloadMediaMessage?.({ key: msg.key, message: { imageMessage: imgMsg } });
        if (!buffer) throw new Error('download failed');
        const Jimp = require('jimp');
        const image = await Jimp.read(buffer);
        image.rotate(deg);
        const out = await image.getBufferAsync(Jimp.MIME_PNG);
        return sock.sendMessage(ctx.from, { image: out, caption: `🔄 Rotated ${deg}°` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  flip: {
    desc: 'Flip replied image horizontally',
    category: 'media',
    run: async (sock, msg, ctx) => {
      const imgMsg = getQuotedImage(msg);
      if (!imgMsg) return sock.sendMessage(ctx.from, { text: '❌ Reply to an image with this command.' }, { quoted: msg });
      try {
        const buffer = await sock.downloadMediaMessage?.({ key: msg.key, message: { imageMessage: imgMsg } });
        if (!buffer) throw new Error('download failed');
        const Jimp = require('jimp');
        const image = await Jimp.read(buffer);
        image.flip(true, false);
        const out = await image.getBufferAsync(Jimp.MIME_PNG);
        return sock.sendMessage(ctx.from, { image: out, caption: '🔃 Flipped horizontally' }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  mirror: {
    desc: 'Mirror replied image vertically',
    category: 'media',
    run: async (sock, msg, ctx) => {
      const imgMsg = getQuotedImage(msg);
      if (!imgMsg) return sock.sendMessage(ctx.from, { text: '❌ Reply to an image with this command.' }, { quoted: msg });
      try {
        const buffer = await sock.downloadMediaMessage?.({ key: msg.key, message: { imageMessage: imgMsg } });
        if (!buffer) throw new Error('download failed');
        const Jimp = require('jimp');
        const image = await Jimp.read(buffer);
        image.flip(false, true);
        const out = await image.getBufferAsync(Jimp.MIME_PNG);
        return sock.sendMessage(ctx.from, { image: out, caption: '🪞 Mirrored vertically' }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  border: {
    desc: 'Add a border to replied image (usage: .border <size>)',
    category: 'media',
    run: async (sock, msg, ctx) => {
      const imgMsg = getQuotedImage(msg);
      if (!imgMsg) return sock.sendMessage(ctx.from, { text: '❌ Reply to an image with this command.' }, { quoted: msg });
      const size = Math.min(Math.max(parseInt(ctx.args[0]) || 10, 1), 50);
      try {
        const buffer = await sock.downloadMediaMessage?.({ key: msg.key, message: { imageMessage: imgMsg } });
        if (!buffer) throw new Error('download failed');
        const Jimp = require('jimp');
        const image = await Jimp.read(buffer);
        const w = image.bitmap.width + (size * 2);
        const h = image.bitmap.height + (size * 2);
        const bg = new Jimp(w, h, 0x000000ff);
        bg.composite(image, size, size);
        const out = await bg.getBufferAsync(Jimp.MIME_PNG);
        return sock.sendMessage(ctx.from, { image: out, caption: `🖼️ Border added (${size}px)` }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  circle: {
    desc: 'Make replied image circular',
    category: 'media',
    run: async (sock, msg, ctx) => {
      const imgMsg = getQuotedImage(msg);
      if (!imgMsg) return sock.sendMessage(ctx.from, { text: '❌ Reply to an image with this command.' }, { quoted: msg });
      try {
        const buffer = await sock.downloadMediaMessage?.({ key: msg.key, message: { imageMessage: imgMsg } });
        if (!buffer) throw new Error('download failed');
        const Jimp = require('jimp');
        const image = await Jimp.read(buffer);
        const size = Math.min(image.bitmap.width, image.bitmap.height);
        image.cover(size, size);
        const mask = new Jimp(size, size, 0x00000000);
        // Draw a white circle on the mask
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const dx = x - size / 2;
            const dy = y - size / 2;
            if (Math.sqrt(dx * dx + dy * dy) <= size / 2) {
              mask.setPixelColor(0xffffffff, x, y);
            }
          }
        }
        image.mask(mask, 0, 0);
        const out = await image.getBufferAsync(Jimp.MIME_PNG);
        return sock.sendMessage(ctx.from, { image: out, caption: '⭕ Circular image' }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(ctx.from, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      }
    },
  },

  resize: {
    desc: 'Resize replied image (usage: .resize <width> <height>)',
    category: 'media',
    run: async (sock, msg, ctx) => {
      const imgMsg = getQuotedImage(msg);
      if (!imgMsg) return sock.sendMessage(ctx.from, { text: '❌ Reply to an image with this command.' }, { quoted: msg });
      const w = parseInt(ctx.args[0]) || 300;
      const h = parseInt(ctx.args[1]) || Jimp.AUTO;
      try {
        const buffer = await sock.downloadMediaMessage?.({ key: msg.key, message: { imageMessage: imgMsg } });
        if (!buffer) throw new Error('download failed');
        const Jimp = require('jimp');
        const image = await Jimp.read(buffer);
        image.resize(w, h);
        const out = await image.getBufferAsync(Jimp.MIME_PNG);
        return sock.sendMessage(ctx.from, { image: out, caption: `📐 Resized to ${image.bitmap.width}x${image.bitmap.height}` }, { quoted: msg });
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
