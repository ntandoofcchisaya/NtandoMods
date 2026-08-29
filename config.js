/**
 * NtandoMods — Bot Configuration
 * Edit this file to customize your bot, or override via environment variables.
 */

module.exports = {
  // ─── Identity ───
  botName: process.env.BOT_NAME || 'NtandoMods',
  ownerNumber: (process.env.OWNER_NUMBER || '27123456789').split(',').map(s => s.trim()),
  ownerName: (process.env.OWNER_NAME || 'Ntando').split(',').map(s => s.trim()),

  // ─── Behavior ───
  prefix: process.env.BOT_PREFIX || '.',
  selfMode: false,         // true = only owner can use commands
  autoRead: true,          // auto-read incoming messages
  autoTyping: true,        // show "typing..." when processing
  autoReact: true,         // auto-react to commands
  autoBio: true,           // auto-update bio status

  // ─── Session ───
  sessionName: 'session',
  sessionID: process.env.SESSION_ID || '',  // KnightBot! session string

  // ─── Media ───
  packname: 'NtandoMods',
  author: 'NtandoMods',

  // ─── Locale ───
  timezone: process.env.TZ || 'Africa/Johannesburg',

  // ─── Messages ───
  messages: {
    wait: '⏳ Please wait...',
    success: '✅ Done!',
    error: '❌ Something went wrong.',
    ownerOnly: '👑 This command is for the bot owner only.',
    adminOnly: '🛡️ Group admins only.',
    groupOnly: '👥 This command works in groups only.',
    privateOnly: '💬 This command works in private chat only.',
    botAdminNeeded: '🤖 I need to be a group admin to do that.',
    invalidCommand: '❓ Unknown command. Type {prefix}menu for help.',
  },
};
