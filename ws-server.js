// ws-server.js
import http from 'http';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const PORT = process.env.WS_PORT || 30021; // kalau mau balik ke 3001 juga boleh

// ------ STATUS & CLIENTS ------

const clients = new Set();

let currentStatus = {
  isConnected: false,
  isConnecting: false,
  qrCode: null,
  lastConnection: null,
  deviceInfo: null,
  statusMessage: 'Menyiapkan koneksi...',
};

function broadcastStatus() {
  const msg = JSON.stringify({
    type: 'status',
    data: currentStatus,
  });

  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(msg);
    }
  });
}

function ensurePublicDir() {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
}

function internalUpdateStatus(newStatus) {
  if (currentStatus.isConnecting && newStatus.isConnected) {
    currentStatus.isConnecting = false;
  }

  currentStatus = {
    ...currentStatus,
    ...newStatus,
    lastConnection: newStatus.isConnected
      ? new Date().toISOString()
      : currentStatus.lastConnection,
  };

  console.log('🔄 [WS] Status diperbarui:', {
    isConnected: currentStatus.isConnected,
    isConnecting: currentStatus.isConnecting,
    statusMessage: currentStatus.statusMessage,
    hasQr: !!currentStatus.qrCode,
  });

  broadcastStatus();

  if (newStatus.qrCode) {
    ensurePublicDir();
    const qrCodePath = path.join(process.cwd(), 'public', 'whatsapp-qr.txt');
    fs.writeFileSync(qrCodePath, newStatus.qrCode);
    console.log('✅ [WS] QR code disimpan di', qrCodePath);
  }
}

// ------ HTTP SERVER (BRIDGE) ------

const server = http.createServer((req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, data: currentStatus }));
    return;
  }

  if (req.method === 'POST' && req.url === '/update-status') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {};
        console.log('📩 [WS] HTTP /update-status diterima:', {
          hasQr: !!data.qrCode,
          isConnected: data.isConnected,
        });

        internalUpdateStatus(data);

        res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        console.error('❌ [WS] Gagal parse /update-status:', err);
        res.writeHead(400, { ...headers, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
      }
    });
    return;
  }

  res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      status: 'WebSocket server is running',
      wsPath: '/ws',
    }),
  );
});

// ------ WEBSOCKET SERVER ------

const wss = new WebSocketServer({
  server,
  path: '/ws',
  clientTracking: true,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3,
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024,
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024,
  },
});

wss.on('connection', (ws) => {
  console.log('🔌 [WS] Client WebSocket terhubung');
  clients.add(ws);

  ws.send(
    JSON.stringify({
      type: 'status',
      data: currentStatus,
    }),
  );

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch {
      // ignore
    }
  });

  ws.on('close', (code, reason) => {
    console.log(
      `❌ [WS] Client disconnect. Code: ${code}, Reason: ${reason.toString()}`,
    );
    clients.delete(ws);
  });
});

// ---------- START LISTEN ONLY IF MAIN MODULE ----------

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMainModule) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(
      `✅ [WS] WebSocket server running on ws://0.0.0.0:${PORT}/ws`,
    );
    console.log(
      `✅ [WS] HTTP bridge: POST http://localhost:${PORT}/update-status`,
    );
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `❌ [WS] Port ${PORT} sudah dipakai. Kemungkinan ws-server.js sudah jalan di proses lain.`,
      );
    } else {
      console.error('❌ [WS] WebSocket server error:', error);
    }
    process.exit(1);
  });
}

// OPTIONAL EXPORTS (dipakai kalau proses sama, bukan second process)
export function updateStatus(newStatus) {
  internalUpdateStatus(newStatus);
}

export function getStatus() {
  return currentStatus;
}

export function getCurrentStatus() {
  return currentStatus;
}
