/**
 * NtandoMods — Shared Library
 * ============================================================
 * Lightweight utilities used by commands in menu.js:
 *  - fetchJSON / fetchBuffer: HTTP via Node built-in https (no axios needed)
 *  - getMention / getQuotedParticipant: extract mentioned/replied users
 *  - groupSettings: simple JSON-backed per-group settings store
 *  - sudoStore: simple JSON-backed sudo users list
 * Exports all utilities for use in menu.js
 * ============================================================
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

/* ═══════════════════════════════════════════════════════════════
   HTTP HELPERS (built-in, no external deps)
   ═══════════════════════════════════════════════════════════════ */

function _req(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        ...(options.headers || {}),
      },
      timeout: options.timeout || 30000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(_req(res.headers.location, options));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Request timed out')));
  });
}

/** Fetch a URL and parse JSON. Returns parsed object. */
async function fetchJSON(url, options = {}) {
  const { body } = await _req(url, options);
  return JSON.parse(body.toString('utf8'));
}

/** Fetch a URL and return a Buffer (for images/videos). */
async function fetchBuffer(url, options = {}) {
  const { body } = await _req(url, options);
  return body;
}

/* ═══════════════════════════════════════════════════════════════
   MENTION / REPLY HELPERS
   ═══════════════════════════════════════════════════════════════ */

function getCtxInfo(msg) {
  return msg.message?.extendedTextMessage?.contextInfo
    || msg.message?.imageMessage?.contextInfo
    || msg.message?.videoMessage?.contextInfo
    || {};
}

/** Get mentioned JIDs from a message. */
function getMentions(msg) {
  return getCtxInfo(msg).mentionedJid || [];
}

/** Get the participant of a replied-to message. */
function getQuotedParticipant(msg) {
  return getCtxInfo(msg).participant || null;
}

/** Resolve a target user: mentioned > replied participant > sender. */
function getTargetUser(msg, sender) {
  const mentioned = getMentions(msg);
  if (mentioned.length > 0) return mentioned[0];
  const quoted = getQuotedParticipant(msg);
  if (quoted) return quoted;
  return sender;
}

/** Convert a raw number string to a WhatsApp JID. */
function toJid(input) {
  const s = String(input || '').trim();
  if (s.includes('@')) return s;
  const n = s.replace(/\D/g, '');
  return n.length >= 7 ? `${n}@s.whatsapp.net` : null;
}

/* ═══════════════════════════════════════════════════════════════
   GROUP SETTINGS STORE (JSON-backed, survives restarts)
   ═══════════════════════════════════════════════════════════════ */

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'groupSettings.json');

function _readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function _writeSettings(data) {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('groupSettings write error:', e.message);
  }
}

const _settingsCache = _readSettings();

function getGroupSettings(groupId) {
  if (!_settingsCache[groupId]) {
    _settingsCache[groupId] = {
      welcome: true,
      goodbye: true,
      welcomeMessage: '',
      goodbyeMessage: '',
      antilink: false,
      antilinkAction: 'delete',
      antibadword: false,
      mute: false,
    };
  }
  return _settingsCache[groupId];
}

function updateGroupSettings(groupId, updates) {
  if (!_settingsCache[groupId]) getGroupSettings(groupId);
  Object.assign(_settingsCache[groupId], updates);
  _writeSettings(_settingsCache);
  return _settingsCache[groupId];
}

/* ═══════════════════════════════════════════════════════════════
   SUDO USERS STORE (JSON-backed)
   ═══════════════════════════════════════════════════════════════ */

const SUDO_FILE = path.join(process.cwd(), 'data', 'sudoUsers.json');

function _readSudo() {
  try {
    if (fs.existsSync(SUDO_FILE)) {
      return JSON.parse(fs.readFileSync(SUDO_FILE, 'utf8'));
    }
  } catch (_) {}
  return [];
}

const _sudoCache = _readSudo();

function getSudoUsers() {
  return _sudoCache.slice();
}

function addSudoUser(jid) {
  const num = String(jid).split('@')[0].replace(/\D/g, '');
  if (_sudoCache.some(s => s.split('@')[0] === num)) return false;
  _sudoCache.push(`${num}@s.whatsapp.net`);
  try {
    const dir = path.dirname(SUDO_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SUDO_FILE, JSON.stringify(_sudoCache, null, 2));
  } catch (e) { console.error('sudo write error:', e.message); }
  return true;
}

function removeSudoUser(jid) {
  const num = String(jid).split('@')[0].replace(/\D/g, '');
  const idx = _sudoCache.findIndex(s => s.split('@')[0] === num);
  if (idx === -1) return false;
  _sudoCache.splice(idx, 1);
  try {
    const dir = path.dirname(SUDO_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SUDO_FILE, JSON.stringify(_sudoCache, null, 2));
  } catch (e) { console.error('sudo write error:', e.message); }
  return true;
}

function isSudo(sender) {
  const num = String(sender || '').split('@')[0].replace(/\D/g, '');
  return _sudoCache.some(s => s.split('@')[0] === num);
}

module.exports = {
  fetchJSON,
  fetchBuffer,
  getCtxInfo,
  getMentions,
  getQuotedParticipant,
  getTargetUser,
  toJid,
  getGroupSettings,
  updateGroupSettings,
  getSudoUsers,
  addSudoUser,
  removeSudoUser,
  isSudo,
};
