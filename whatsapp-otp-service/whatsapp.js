/**
 * Baileys WhatsApp client:
 * - Multi-file auth state (auth/ folder)
 * - Tracks connection status + latest QR
 * - Exposes helper functions for the web dashboard (QR/status/reconnect/logs)
 */

import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, 'auth');

/** Optional backup file (updated each time the QR refreshes) */
export const PAIRING_QR_FILE = path.join(__dirname, 'pairing-qr.png');

/** @type {import('@whiskeysockets/baileys').WASocket | null} */
let sock = null;
let connectionReady = false;

/**
 * Dashboard status:
 * - "connected": ready to send
 * - "disconnected": not connected and no QR available
 * - "qr": waiting for user to scan pairing QR
 * @type {"connected" | "disconnected" | "qr"}
 */
let status = 'disconnected';

/** Latest raw QR string emitted by Baileys (null if not available) */
let latestQrRaw = null;

let latestPairingQrDataUrl = null;

const logger = pino({ level: 'silent' });

const qrImageOptions = {
  width: 512,
  margin: 3,
  errorCorrectionLevel: 'H',
  color: { dark: '#000000', light: '#ffffff' },
};

export function getPairingQrDataUrl() {
  return latestPairingQrDataUrl;
}

/**
 * @returns {string | null} raw QR string from Baileys
 */
export function getQR() {
  return latestQrRaw;
}

/**
 * @returns {"connected" | "disconnected" | "qr"}
 */
export function getStatus() {
  return status;
}

export function isWhatsAppConnected() {
  return connectionReady && sock !== null;
}

function toWhatsAppJid(digits) {
  return `${digits}@s.whatsapp.net`;
}

export async function sendWhatsAppText(phoneDigits, messageText) {
  if (!isWhatsAppConnected() || !sock) {
    throw new Error('WhatsApp not connected');
  }
  const jid = toWhatsAppJid(phoneDigits);
  await sock.sendMessage(jid, { text: messageText });
}

/** In-memory log buffer (max 10) */
const logs = [];

function pushLog(message) {
  const ts = new Date().toISOString().replace('T', ' ').replace('Z', '');
  logs.push(`${ts} - ${message}`);
  while (logs.length > 10) logs.shift();
}

export function getLogs() {
  return [...logs];
}

/**
 * Let the API log OTP sends without coupling to Express.
 * @param {string} phoneDisplay
 */
export function logOtpSent(phoneDisplay) {
  pushLog(`OTP sent to ${phoneDisplay}`);
}

async function buildPairingDataUrl(qrRaw) {
  return QRCode.toDataURL(qrRaw, qrImageOptions);
}

async function writePairingQrPng(qrRaw) {
  await new Promise((resolve, reject) => {
    QRCode.toFile(PAIRING_QR_FILE, qrRaw, qrImageOptions, (err) =>
      err ? reject(err) : resolve()
    );
  });
}

let connectingPromise = null;

async function connectWhatsApp() {
  if (connectingPromise) return connectingPromise;
  connectingPromise = (async () => {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
    browser: ['WhatsApp OTP Service', 'Chrome', '1.0.0'],
    markOnlineOnConnect: true,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      status = 'qr';
      latestQrRaw = qr;
      pushLog('QR generated');

      void (async () => {
        try {
          await writePairingQrPng(qr);
          latestPairingQrDataUrl = await buildPairingDataUrl(qr);
        } catch (e) {
          console.error('[WhatsApp] Could not save pairing-qr.png:', e?.message || e);
        }
      })();
    }

    if (connection === 'open') {
      connectionReady = true;
      status = 'connected';
      latestQrRaw = null;
      latestPairingQrDataUrl = null;
      pushLog('WhatsApp connected');
      console.log('[WhatsApp] Connected.');
    }

    if (connection === 'close') {
      connectionReady = false;
      status = 'disconnected';
      latestQrRaw = null;
      latestPairingQrDataUrl = null;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `[WhatsApp] Connection closed. statusCode=${statusCode}, reconnect=${shouldReconnect}`
      );
      pushLog('WhatsApp disconnected');

      if (shouldReconnect) {
        setTimeout(() => {
          connectWhatsApp().catch((err) => {
            console.error('[WhatsApp] Reconnect failed:', err?.message || err);
            setTimeout(() => connectWhatsApp().catch(() => {}), 5000);
          });
        }, 3000);
      } else {
        console.log('[WhatsApp] Logged out. Delete auth folder and scan QR again.');
      }
    }
  });
  })()
    .catch((e) => {
      // If initial connect fails, reset state so dashboard shows disconnected.
      status = 'disconnected';
      latestQrRaw = null;
      latestPairingQrDataUrl = null;
      throw e;
    })
    .finally(() => {
      connectingPromise = null;
    });
  return connectingPromise;
}

export function startWhatsApp() {
  connectWhatsApp().catch((err) => {
    console.error('[WhatsApp] Initial connection error:', err?.message || err);
    setTimeout(() => startWhatsApp(), 5000);
  });
}

/**
 * Force a reconnect (used by dashboard button).
 * Safe to call even if currently connected/connecting.
 */
export async function reconnectWhatsApp() {
  pushLog('Reconnect requested');
  status = 'disconnected';
  latestQrRaw = null;
  latestPairingQrDataUrl = null;

  try {
    // Best-effort close of existing socket; avoid crashing if API differs between versions.
    sock?.end?.();
    sock?.ws?.close?.();
  } catch {
    // ignore
  } finally {
    sock = null;
    connectionReady = false;
  }

  await connectWhatsApp();
}
