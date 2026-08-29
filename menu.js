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
      const catNames = { core: '🔧 Core', fun: '🎮 Fun', utility: '🛠️ Utility', media: '🎨 Media', group: '👥 Group', admin: '⚡ Admin', owner: '👑 Owner', other: '📦 Other' };
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
