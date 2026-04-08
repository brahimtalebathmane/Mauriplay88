/**
 * Express API (existing):
 * - POST /send-otp
 * - POST /verify-otp
 *
 * Dashboard:
 * - GET / (simple HTML/CSS/JS)
 * - GET /api/status, /api/qr, /api/logs
 * - POST /api/reconnect
 */

import express from 'express';
import { generateOtp, normalizePhone, saveOtp, verifyOtp } from './otp.js';
import {
  getPairingQrDataUrl,
  getStatus,
  getLogs,
  isWhatsAppConnected,
  logOtpSent,
  reconnectWhatsApp,
  sendWhatsAppText,
  startWhatsApp,
} from './whatsapp.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

process.on('unhandledRejection', (reason) => {
  console.error('[process] unhandledRejection:', reason);
});

app.use(express.json());

function delaySendMs() {
  return 3000 + Math.floor(Math.random() * 2001);
}

function dashboardHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>WhatsApp OTP Dashboard</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      background: radial-gradient(1000px 600px at 20% 10%, #1f2a44 0%, #0b1220 55%, #070b14 100%);
      color: #e5e7eb;
    }
    .card {
      width: min(820px, 100%);
      background: rgba(15, 23, 42, .75);
      border: 1px solid rgba(148, 163, 184, .18);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,.45);
      padding: 22px;
      backdrop-filter: blur(10px);
    }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    h1 { font-size: 1.15rem; margin: 0; font-weight: 650; letter-spacing: .2px; }
    .subtitle { margin: 6px 0 0; color: #94a3b8; font-size: .95rem; }
    .pill {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid rgba(148,163,184,.22);
      background: rgba(2,6,23,.35);
      font-weight: 600;
      font-size: .9rem;
    }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,.15); }
    .dot.connected { background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.15); }
    .dot.disconnected { background: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,.15); }
    .grid { margin-top: 18px; display: grid; gap: 16px; grid-template-columns: 1.1fr .9fr; }
    @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } }
    .panel {
      background: rgba(2, 6, 23, .45);
      border: 1px solid rgba(148, 163, 184, .18);
      border-radius: 14px;
      padding: 16px;
    }
    .panel h2 { margin: 0 0 10px; font-size: .95rem; color: #cbd5e1; font-weight: 650; }
    .qrWrap { display: grid; place-items: center; padding: 12px; }
    .qrImg {
      width: min(360px, 90vw);
      height: auto;
      border-radius: 12px;
      background: #fff;
      padding: 12px;
    }
    .hint { margin-top: 10px; color: #94a3b8; font-size: .92rem; text-align: center; line-height: 1.45; }
    button {
      appearance: none;
      border: 0;
      border-radius: 12px;
      padding: 10px 14px;
      font-weight: 700;
      cursor: pointer;
      background: linear-gradient(135deg, #2563eb, #60a5fa);
      color: white;
      box-shadow: 0 10px 24px rgba(37,99,235,.28);
    }
    button:disabled { opacity: .55; cursor: not-allowed; }
    .btnRow { display: flex; gap: 10px; flex-wrap: wrap; }
    .logs {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 10px;
      max-height: 320px;
      overflow: auto;
    }
    .logItem {
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid rgba(148,163,184,.14);
      background: rgba(15, 23, 42, .6);
      color: #dbeafe;
      font-size: .92rem;
      line-height: 1.35;
      word-break: break-word;
    }
    .muted { color: #94a3b8; font-size: .92rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <h1>WhatsApp OTP Service</h1>
        <div class="subtitle">Scan QR to connect, view status, reconnect, and monitor events.</div>
      </div>
      <div class="pill" id="statusPill">
        <span class="dot" id="statusDot"></span>
        <span id="statusText">Waiting…</span>
      </div>
    </div>

    <div class="grid">
      <div class="panel">
        <h2>QR Code</h2>
        <div class="qrWrap" id="qrWrap">
          <img id="qrImg" class="qrImg" alt="WhatsApp QR" style="display:none" />
          <div class="hint" id="qrHint">Loading…</div>
        </div>
      </div>

      <div class="panel">
        <h2>Controls</h2>
        <div class="btnRow">
          <button id="reconnectBtn" type="button">Reconnect WhatsApp</button>
        </div>
        <div class="muted" style="margin-top:10px">
          If WhatsApp disconnects, click reconnect to restart the connection.
        </div>

        <div style="height:14px"></div>
        <h2>Logs (last 10)</h2>
        <ul class="logs" id="logs"></ul>
        <div class="muted" id="logsEmpty" style="display:none">No events yet.</div>
      </div>
    </div>
  </div>

  <script>
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');
    const qrImg = document.getElementById('qrImg');
    const qrHint = document.getElementById('qrHint');
    const reconnectBtn = document.getElementById('reconnectBtn');
    const logsEl = document.getElementById('logs');
    const logsEmpty = document.getElementById('logsEmpty');

    function setStatus(status) {
      statusDot.classList.remove('connected', 'disconnected');
      if (status === 'connected') {
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected';
        qrImg.style.display = 'none';
        qrHint.textContent = 'Connected. You can send OTP now.';
        reconnectBtn.disabled = false;
      } else if (status === 'disconnected') {
        statusDot.classList.add('disconnected');
        statusText.textContent = 'Disconnected';
        qrImg.style.display = 'none';
        qrHint.textContent = 'Disconnected. Click “Reconnect WhatsApp”.';
        reconnectBtn.disabled = false;
      } else {
        // status === 'qr'
        statusText.textContent = 'Waiting for scan';
        qrHint.textContent = 'Open WhatsApp → Settings → Linked devices → Link a device, then scan the QR.';
        reconnectBtn.disabled = false;
      }
    }

    async function refreshStatus() {
      try {
        const r = await fetch('/api/status', { cache: 'no-store' });
        const j = await r.json();
        setStatus(j.status);
        if (j.status === 'qr') {
          // QR refresh every 5s if not connected
          // (status itself refreshes every 3s)
        }
      } catch (_) {
        setStatus('disconnected');
        qrHint.textContent = 'Could not reach server.';
      }
    }

    async function refreshQr() {
      try {
        const r = await fetch('/api/status', { cache: 'no-store' });
        const j = await r.json();
        if (j.status !== 'qr') return;

        const qr = await fetch('/api/qr', { cache: 'no-store' }).then(x => x.json());
        if (qr && qr.dataUrl) {
          qrImg.src = qr.dataUrl;
          qrImg.style.display = 'block';
        } else {
          qrImg.style.display = 'none';
        }
      } catch (_) {
        // ignore
      }
    }

    async function refreshLogs() {
      try {
        const r = await fetch('/api/logs', { cache: 'no-store' });
        const j = await r.json();
        const logs = Array.isArray(j.logs) ? j.logs : [];
        logsEl.innerHTML = '';
        if (!logs.length) {
          logsEmpty.style.display = 'block';
          return;
        }
        logsEmpty.style.display = 'none';
        for (const line of logs) {
          const li = document.createElement('li');
          li.className = 'logItem';
          li.textContent = line;
          logsEl.appendChild(li);
        }
      } catch (_) {
        // ignore
      }
    }

    reconnectBtn.addEventListener('click', async () => {
      reconnectBtn.disabled = true;
      reconnectBtn.textContent = 'Reconnecting…';
      try {
        await fetch('/api/reconnect', { method: 'POST' });
      } catch (_) {}
      setTimeout(() => {
        reconnectBtn.disabled = false;
        reconnectBtn.textContent = 'Reconnect WhatsApp';
      }, 1500);
    });

    // Requirements:
    // - Fetch /api/status every 3 seconds
    // - Fetch /api/qr every 5 seconds if not connected
    // - Fetch /api/logs every 5 seconds
    refreshStatus();
    refreshLogs();
    refreshQr();
    setInterval(refreshStatus, 3000);
    setInterval(refreshLogs, 5000);
    setInterval(refreshQr, 5000);
  </script>
</body>
</html>`;
}

// Dashboard (required): GET /
app.get('/', (_req, res) => {
  res.type('html').send(dashboardHtml());
});

// Existing optional QR browser page route is kept (DO NOT break current API)
// but the dashboard uses /api/* endpoints below.
app.get('/pairing', (_req, res) => {
  res.redirect('/');
});

app.get('/pairing-qr', (_req, res) => {
  const connected = isWhatsAppConnected();
  const dataUrl = connected ? null : getPairingQrDataUrl();
  res.json({ connected, dataUrl });
});

// New API endpoints for dashboard
app.get('/api/status', (_req, res) => {
  res.json({ status: getStatus() });
});

app.get('/api/qr', (_req, res) => {
  // Return base64 image as data URL for <img src="...">
  res.json({ dataUrl: getPairingQrDataUrl() });
});

app.get('/api/logs', (_req, res) => {
  res.json({ logs: getLogs() });
});

app.post('/api/reconnect', async (_req, res) => {
  try {
    await reconnectWhatsApp();
    res.json({ success: true });
  } catch (e) {
    console.error('[api/reconnect]', e);
    res.status(500).json({ success: false });
  }
});

app.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (phone === undefined || phone === null || String(phone).trim() === '') {
      return res.status(400).json({ success: false, error: 'phone is required' });
    }

    if (!isWhatsAppConnected()) {
      return res.status(503).json({ error: 'WhatsApp not connected' });
    }

    const digits = normalizePhone(phone);
    if (digits.length < 8) {
      return res.status(400).json({ success: false, error: 'Invalid phone number' });
    }

    const otp = generateOtp();
    saveOtp(digits, otp);

    const ms = delaySendMs();
    await new Promise((r) => setTimeout(r, ms));

    const text = `Your verification code is: ${otp}`;
    try {
      await sendWhatsAppText(digits, text);
      // Logs requirement: "OTP sent to +222xxxxxxx"
      logOtpSent(`+${digits}`);
    } catch (sendErr) {
      console.error('[send-otp] sendMessage failed:', sendErr?.message || sendErr);
      return res.status(500).json({
        success: false,
        error: sendErr?.message || 'Failed to send WhatsApp message',
      });
    }

    return res.json({ success: true });
  } catch (e) {
    console.error('[send-otp]', e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/verify-otp', (req, res) => {
  try {
    const { phone, otp } = req.body || {};
    if (phone === undefined || otp === undefined) {
      return res.status(400).json({ success: false, error: 'phone and otp are required' });
    }

    const ok = verifyOtp(phone, otp);
    return res.json({ success: ok });
  } catch (e) {
    console.error('[verify-otp]', e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  const base = `http://localhost:${PORT}`;
  console.log(`OTP API listening on ${base}`);
  console.log(`Dashboard: ${base}`);
  process.env.PORT = String(PORT); // allow whatsapp.js to print accurate hints if needed
  startWhatsApp();
});
