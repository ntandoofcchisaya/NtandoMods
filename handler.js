/**
 * NtandoMods — Command Handler (Entry Point)
 * ============================================================
 * Lightweight, fast, and feature-rich WhatsApp bot handler.
 * Commands and helpers are modularized in menu.js for clean separation.
 * Exports: handleMessage(sock, msg, config), handleGroupUpdate(sock, update, config), commands
 * ============================================================
 */

const { commands, helpers } = require('./menu.js');
const {
  getSender, getNumber, isOwner, isGroupAdmin, isBotAdmin,
  getBody, getQuotedText, getQuotedImage, fmtUptime, pickRandom,
} = helpers;
const lib = require('./lib.js');
const { isSudo, getGroupSettings } = lib;


/* ════════════════════════════════════════════════════════════
   MAIN MESSAGE HANDLER
   ════════════════════════════════════════════════════════════ */

async function handleMessage(sock, msg, config) {
  if (!msg.message || !msg.key?.id) return;

  const from = msg.key.remoteJid;
  if (!from || from.includes('@broadcast') || from.includes('status.broadcast') || from.includes('@newsletter')) return;

  const sender = getSender(sock, msg);
  const body = getBody(msg).trim();
  if (!body || !body.startsWith(config.prefix)) return;

  // Parse command
  const args = body.slice(config.prefix.length).trim().split(/\s+/);
  const name = args.shift().toLowerCase();
  const cmd = commands[name];
  if (!cmd) return;

  // Self mode: only owner and sudo users can use commands
  if (config.selfMode && !isOwner(sender, config) && !isSudo(sender)) return;

  // Owner-only check
  if (cmd.ownerOnly && !isOwner(sender, config)) {
    return sock.sendMessage(from, { text: config.messages?.ownerOnly || '👑 Owner only.' }, { quoted: msg });
  }

  // Group-only check
  const isGroup = from.endsWith('@g.us');
  if (cmd.groupOnly && !isGroup) {
    return sock.sendMessage(from, { text: config.messages?.groupOnly || '👥 Groups only.' }, { quoted: msg });
  }

  // Admin-only check (group admin or owner)
  if (cmd.adminOnly) {
    if (!isGroup) {
      return sock.sendMessage(from, { text: config.messages?.groupOnly || '👥 Groups only.' }, { quoted: msg });
    }
    const isOwnerUser = isOwner(sender, config);
    if (!isOwnerUser) {
      try {
        const meta = await sock.groupMetadata(from);
        if (!isGroupAdmin(sender, meta)) {
          return sock.sendMessage(from, { text: config.messages?.adminOnly || '🛡️ Admins only.' }, { quoted: msg });
        }
      } catch (_) {
        return sock.sendMessage(from, { text: '❌ Could not verify admin status.' }, { quoted: msg });
      }
    }
  }

  // Auto-typing
  if (config.autoTyping) {
    try { await sock.sendPresenceUpdate('composing', from); } catch (_) {}
  }

  // Auto-react
  if (config.autoReact) {
    try {
      const reactions = ['⚡', '❤️', '👍', '🔥', '✨', '💫'];
      await sock.sendMessage(from, { react: { text: pickRandom(reactions), key: msg.key } });
    } catch (_) {}
  }

  const ctx = { from, sender, cfg: config, args, msg };

  try {
    await cmd.run(sock, msg, ctx);
  } catch (e) {
    console.error(`Command "${name}" error:`, e.message);
    try {
      await sock.sendMessage(from, { text: `❌ Error in command ${name}: ${e.message}` }, { quoted: msg });
    } catch (_) {}
  }
}

/* ════════════════════════════════════════════════════════════
   GROUP EVENT HANDLER
   ════════════════════════════════════════════════════════════ */

async function handleGroupUpdate(sock, update, config) {
  try {
    const { id, participants, action } = update;
    if (!participants || participants.length === 0) return;

    const settings = getGroupSettings(id) || {};

    for (const participant of participants) {
      const num = getNumber(participant);
      if (action === 'add') {
        if (settings.welcome === false) continue;
        const custom = settings.welcomeMessage && settings.welcomeMessage.trim();
        const text = custom
          ? custom.replace(/@user/gi, '@' + num)
          : '\u256d\u2501\u2501\u2501\u2770 *' + config.botName + '* \u2771\u2501\u2501\u2501\u256e\n\u2503 \ud83d\udc4b Welcome @' + num + '!\n\u2503 \ud83c\udf89 You joined the group.\n\u2503 Type ' + config.prefix + 'menu for commands.\n\u2570\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u256f\n> Powered by NtandoMods \u26a1';
        await sock.sendMessage(id, { text, mentions: [participant] });
      } else if (action === 'remove') {
        if (settings.goodbye === false) continue;
        const custom = settings.goodbyeMessage && settings.goodbyeMessage.trim();
        const text = custom
          ? custom.replace(/@user/gi, '@' + num)
          : '\u256d\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u256e\n\u2503 \ud83d\udc4b Goodbye @' + num + '!\n\u2503 We will miss you. \ud83e\udd7a\n\u2570\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u256f\n> ' + config.botName;
        await sock.sendMessage(id, { text, mentions: [participant] });
      } else if (action === 'promote') {
        await sock.sendMessage(id, { text: '\ud83c\udf89 @' + num + ' is now an admin!', mentions: [participant] });
      } else if (action === 'demote') {
        await sock.sendMessage(id, { text: '\ud83d\udcc9 @' + num + ' is no longer an admin.', mentions: [participant] });
      }
    }
  } catch (e) {
    // non-fatal
  }
}

module.exports = { handleMessage, handleGroupUpdate, commands };
