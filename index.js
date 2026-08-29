/**
 * NtandoMods — WhatsApp Bot
 * ============================================================
 * Lightweight, fast, and feature-rich WhatsApp bot.
 * Built on @whiskeysockets/baileys.
 *
 * Can run standalone OR be loaded as an engine by the
 * KnightBot Multi-Hosting Platform.
 * ============================================================
 */

process.env.PUPPETEER_SKIP_DOWNLOAD = 'true';
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const pino = require('pino');
const config = require('./config');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const handler = require('./handler');
const SESSION_DIR = path.join(__dirname, 'sessions', config.sessionName || 'session');

/* ─── Setup session from string ─── */
function setupSession() {
  if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
  const credsFile = path.join(SESSION_DIR, 'creds.json');

  if (config.sessionID && config.sessionID.startsWith('KnightBot!')) {
    try {
      const [, b64data] = config.sessionID.split('!');
      const cleanB64 = b64data.replace('...', '');
      const compressed = Buffer.from(cleanB64, 'base64');
      const decompressed = zlib.gunzipSync(compressed);
      fs.writeFileSync(credsFile, decompressed, 'utf8');
      console.log('🔐 Session restored from session string');
    } catch (e) {
      console.error('❌ Failed to decode session string:', e.message);
    }
  }
  return credsFile;
}

/* ─── Connect ─── */
let sock;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;

async function connect() {
  setupSession();
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: !config.sessionID,
    browser: Browsers.macOS('NtandoMods'),
    auth: state,
    syncFullHistory: false,
    downloadHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      reconnectAttempts = 0;
      const number = sock.user?.id?.split(':')[0] || 'unknown';
      console.log(`✅ NtandoMods connected! Number: ${number} | Prefix: ${config.prefix}`);
      if (config.autoBio) {
        try { await sock.updateProfileStatus(`${config.botName} | Active 24/7 ⚡`); } catch (_) {}
      }
    } else if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      if (shouldReconnect && reconnectAttempts < MAX_RECONNECT) {
        reconnectAttempts++;
        console.log(`⚠️ Connection closed (${code}). Reconnecting (${reconnectAttempts}/${MAX_RECONNECT})...`);
        setTimeout(connect, 3000);
      } else if (code === DisconnectReason.loggedOut) {
        console.log('❌ Session logged out. Generate a new session string.');
      }
    }
  });

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || !msg.key?.id) continue;
      const from = msg.key.remoteJid;
      if (!from || from.includes('@broadcast') || from.includes('status.broadcast') || from.includes('@newsletter')) continue;
      handler.handleMessage(sock, msg, config).catch(e => {
        if (!e?.message?.includes('rate-overlimit')) console.error('Handler error:', e.message);
      });
    }
  });

  sock.ev.on('group-participants.update', (update) => {
    if (handler.handleGroupUpdate) {
      handler.handleGroupUpdate(sock, update, config).catch(() => {});
    }
  });

  if (config.autoRead) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
      try { await sock.readMessages(messages.map(m => m.key)); } catch (_) {}
    });
  }
}

/* ─── Graceful shutdown ─── */
process.on('SIGINT', () => { try { sock?.end?.(); } catch (_) {} process.exit(0); });
process.on('SIGTERM', () => { try { sock?.end?.(); } catch (_) {} process.exit(0); });
process.on('uncaughtException', (err) => console.error('Uncaught:', err.message));
process.on('unhandledRejection', (err) => {
  const m = err?.message || String(err);
  if (!m.includes('rate-overlimit')) console.error('Unhandled:', m);
});

console.log(`🚀 Starting NtandoMods v1.0.0 (prefix: ${config.prefix})...`);
connect().catch(e => console.error('Fatal:', e.message));
