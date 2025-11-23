import { WebSocketServer } from 'ws';
import { getBotStatus } from '@/bot';

const wss = new WebSocketServer({ noServer: true });

// Simpan koneksi client yang aktif
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  
  // Kirim status saat pertama kali terhubung
  ws.send(JSON.stringify({
    type: 'status',
    data: getBotStatus()
  }));

  ws.on('close', () => {
    clients.delete(ws);
  });
});

// Fungsi untuk mengirim update ke semua client
export function broadcastStatus() {
  const status = getBotStatus();
  const message = JSON.stringify({
    type: 'status',
    data: status
  });
  
  for (const client of clients) {
    if (client.readyState === 1) { // 1 = OPEN
      client.send(message);
    }
  }
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  // Handle WebSocket upgrade
  if (req.headers.upgrade === 'websocket') {
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    res.status(400).json({ error: 'Expected WebSocket request' });
  }
}
