// bot/index.js
import "dotenv/config";
import { DisconnectReason } from '@whiskeysockets/baileys';
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import axios from "axios";
import { getIntent } from "../lib/nlp.js";
import { loadKnowledgeBase, answerDenganGemini } from "./rag.js";
import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Konfigurasi WebSocket server
const WS_PORT = process.env.WS_PORT || 3001;
const server = http.createServer();
const wss = new WebSocketServer({ noServer: true });

// Simpan koneksi client yang aktif
const clients = new Set();

// Flag untuk menandai apakah server sudah berjalan
let isServerStarting = false;
let serverStarted = false;

// Fungsi untuk memulai server dengan port yang tersedia
function startWebSocketServer(port = WS_PORT, attempt = 0) {
  // Jika server sedang berjalan atau sedang dalam proses memulai, keluar
  if (serverStarted || isServerStarting) {
    return;
  }

  isServerStarting = true;
  const MAX_ATTEMPTS = 10;
  
  server.listen(port, '0.0.0.0')
    .on('listening', () => {
      serverStarted = true;
      isServerStarting = false;
      console.log(`WebSocket server running on ws://localhost:${port}`);
      process.env.WS_PORT = port.toString(); // Simpan port yang digunakan
    })
    .on('error', (err) => {
      isServerStarting = false;
      
      if (err.code === 'EADDRINUSE') {
        const nextPort = port + 1;
        if (attempt < MAX_ATTEMPTS) {
          console.log(`Port ${port} is in use, trying port ${nextPort}...`);
          // Gunakan setTimeout untuk memberikan jeda sebelum mencoba port berikutnya
          setTimeout(() => startWebSocketServer(nextPort, attempt + 1), 100);
        } else {
          console.error(`Could not find an available port after ${MAX_ATTEMPTS} attempts`);
          process.exit(1);
        }
      } else {
        console.error('Failed to start WebSocket server:', err);
        process.exit(1);
      }
    });
}

// Mulai WebSocket server hanya jika belum berjalan
if (!serverStarted && !isServerStarting) {
  startWebSocketServer();
}

// Variabel status bot
let isConnected = false;
let lastConnection = null;
let currentQR = null;

// Simpan status terakhir
let currentStatus = {
  isConnected: false,
  qrCode: null,
  lastConnection: null,
  deviceInfo: null
};

async function startBot() {
  // auth disimpan di folder "auth", jadi sekali pair, berikutnya auto login
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  // ambil versi WA Web terbaru yang kompatibel
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log("Using WA Web version:", version, "isLatest:", isLatest);

  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false, // kita handle sendiri pakai qrcode-terminal
    browser: ["Chrome (Bot)", "Chrome", "10.0"],
    syncFullHistory: false,
  });

  // Event koneksi
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr, isNewLogin } = update;

    // Handle QR code
    if (qr) {
      console.log("🔵 QR code diterima, menyimpan untuk ditampilkan di dashboard...");
      currentQR = qr;
      isConnected = false;
      
      // Tampilkan QR code di terminal
      console.log('🔵 Scan QR code berikut dengan WhatsApp Anda:');
      qrcode.generate(qr, { small: true });
      
      // Simpan QR code ke file
      try {
        const qrCodePath = path.join(process.cwd(), 'public', 'whatsapp-qr.txt');
        fs.writeFileSync(qrCodePath, qr);
        console.log("✅ QR code disimpan di", qrCodePath);
      } catch (error) {
        console.error("Gagal menyimpan QR code ke file:", error);
      }
      
      // Perbarui status melalui WebSocket server
      try {
        const { updateStatus } = await import('../ws-server.js');
        updateStatus({
          isConnected: false,
          qrCode: qr,
          lastConnection: null,
          deviceInfo: null
        });
      } catch (error) {
        console.error("Gagal memperbarui status melalui WebSocket:", error);
      }
    }

    if (connection === "open") {
      console.log("✅ Bot terhubung dengan WhatsApp!");
      isConnected = true;
      lastConnection = new Date();
      currentQR = null; // Hapus QR code yang sudah tidak digunakan
      
      // Perbarui status melalui WebSocket server
      const { updateStatus } = await import('../ws-server.js');
      updateStatus({
        isConnected: true,
        qrCode: null,
        lastConnection: lastConnection.toISOString(),
        deviceInfo: {
          platform: 'WhatsApp Web',
          browser: 'Chrome',
          os: 'Windows'
        }
      });
      
      // Hapus file QR code jika ada
      try {
        const qrCodePath = path.join(process.cwd(), 'public', 'whatsapp-qr.png');
        if (fs.existsSync(qrCodePath)) {
          fs.unlinkSync(qrCodePath);
          console.log("🗑️ File QR code lama dihapus");
        }
      } catch (error) {
        console.error("Gagal menghapus file QR code:", error);
      }
    } else if (connection === 'close') {
      isConnected = false;
      console.log("❌ Koneksi WhatsApp terputus");
    }

    if (connection === "close") {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode ||
        lastDisconnect?.error?.output?.payload?.statusCode;

      console.log("❌ Koneksi terputus. Status code:", statusCode);

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      // Perbarui status koneksi
      try {
        const { updateStatus } = await import('../ws-server.js');
        updateStatus({
          isConnected: false,
          qrCode: null,
          lastConnection: new Date().toISOString(),
          deviceInfo: null
        });
      } catch (error) {
        console.error("Gagal memperbarui status koneksi:", error);
      }

      if (shouldReconnect) {
        console.log("🔄 Mencoba konek ulang dalam 5 detik...");
        setTimeout(() => {
          console.log("🔄 Mencoba menghubungkan ulang...");
          startBot();
        }, 5000);
      } else {
        console.log(
          "🚫 Logged out dari WhatsApp. Kalau mau login lagi, hapus folder 'auth' lalu jalankan ulang."
        );
      }
    }
  });

  // Simpan perubahan kredensial (supaya nggak pair ulang tiap jalanin)
  sock.ev.on("creds.update", saveCreds);

  // Handler pesan masuk
  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg?.message) return;

      // abaikan pesan dari diri sendiri
      if (msg.key.fromMe) return;

      const sender = msg.key.remoteJid;

      // Ambil teks dari beberapa kemungkinan tipe pesan
      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        "";

      const rawText = text.trim();
      const lowerText = rawText.toLowerCase();
      if (!rawText) return;

      console.log(`📩 Pesan dari ${sender}:`, rawText);

      // ========== FLOW PENDAFTARAN ==========
      
      // Fungsi untuk memvalidasi email
      const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      // Fungsi untuk memvalidasi nomor HP
      const isValidPhone = (phone) => {
        const phoneRegex = /^[0-9]{10,15}$/;
        return phoneRegex.test(phone);
      };

      // Fungsi untuk memvalidasi tanggal (format: YYYY-MM-DD)
      const isValidDate = (dateString) => {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateString)) return false;
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
      };

      // Fungsi untuk menampilkan menu bantuan
      const showHelpMenu = async (sender) => {
        await sock.sendMessage(sender, {
          text: `📋 *Menu Bantuan Pendaftaran*\n\n` +
            `Berikut perintah yang tersedia:\n` +
            `• *Daftar* - Memulai proses pendaftaran\n` +
            `• *Batal* - Membatalkan pendaftaran\n` +
            `• *Status* - Melihat status pendaftaran\n` +
            `• *Bantuan* - Menampilkan menu bantuan`
        });
      };

      // Handle perintah bantuan
      if (lowerText === 'bantuan' || lowerText === 'help') {
        return showHelpMenu(sender);
      }

      // Handle pembatalan
      if (lowerText === 'batal' && userState[sender]?.step) {
        delete userState[sender];
        return sock.sendMessage(sender, {
          text: '❌ Pendaftaran dibatalkan. Ketik *Daftar* untuk memulai kembali.'
        });
      }

      // STEP 1: Mulai Pendaftaran
      if ((lowerText === 'daftar' || lowerText === 'mendaftar') && !userState[sender]?.step) {
        userState[sender] = { 
          step: 1,
          // Inisialisasi field default
          status_pendaftaran: 'pending',
          tanggal_daftar: new Date().toISOString()
        };
        return sock.sendMessage(sender, {
          text: '📝 *PENDAFTARAN SISWA BARU*\n\n' +
            'Silakan masukkan *nama lengkap* Anda:'
        });
      }

      // STEP 2: Nama Lengkap
      if (userState[sender]?.step === 1) {
        userState[sender].nama = rawText;
        userState[sender].step = 2;
        return sock.sendMessage(sender, {
          text: '📧 Masukkan *alamat email* Anda:'
        });
      }

      // STEP 3: Email
      if (userState[sender]?.step === 2) {
        if (!isValidEmail(rawText)) {
          return sock.sendMessage(sender, {
            text: '❌ Format email tidak valid. Mohon masukkan email yang benar:'
          });
        }
        userState[sender].email = rawText;
        userState[sender].step = 3;
        return sock.sendMessage(sender, {
          text: '📱 Masukkan *nomor HP* (contoh: 081234567890):'
        });
      }

      // STEP 4: Nomor HP
      if (userState[sender]?.step === 3) {
        if (!isValidPhone(rawText)) {
          return sock.sendMessage(sender, {
            text: '❌ Format nomor HP tidak valid. Mohon masukkan nomor yang benar (10-15 digit angka):'
          });
        }
        userState[sender].nomor = rawText;
        userState[sender].no_hp_ortu = rawText; // Set default nomor ortu sama dengan nomor siswa
        userState[sender].step = 4;
        return sock.sendMessage(sender, {
          text: '🏠 Masukkan *tempat lahir*:'
        });
      }

      // STEP 5: Tempat Lahir
      if (userState[sender]?.step === 4) {
        userState[sender].tempat_lahir = rawText;
        userState[sender].step = 5;
        return sock.sendMessage(sender, {
          text: '📅 Masukkan *tanggal lahir* (format: YYYY-MM-DD, contoh: 2005-05-15):'
        });
      }

      // STEP 6: Tanggal Lahir
      if (userState[sender]?.step === 5) {
        if (!isValidDate(rawText)) {
          return sock.sendMessage(sender, {
            text: '❌ Format tanggal tidak valid. Gunakan format YYYY-MM-DD (contoh: 2005-05-15):'
          });
        }
        userState[sender].tanggal_lahir = rawText;
        userState[sender].step = 6;
        return sock.sendMessage(sender, {
          text: '🚻 Masukkan *jenis kelamin* (L/P):'
        });
      }

      // STEP 7: Jenis Kelamin
      if (userState[sender]?.step === 6) {
        const jk = rawText.toUpperCase();
        if (jk !== 'L' && jk !== 'P') {
          return sock.sendMessage(sender, {
            text: '❌ Pilihan tidak valid. Masukkan L untuk Laki-laki atau P untuk Perempuan:'
          });
        }
        userState[sender].jenis_kelamin = jk;
        userState[sender].step = 7;
        return sock.sendMessage(sender, {
          text: '🕌 Masukkan *agama*:'
        });
      }

      // STEP 8: Agama
      if (userState[sender]?.step === 7) {
        userState[sender].agama = rawText;
        userState[sender].step = 8;
        return sock.sendMessage(sender, {
          text: '🏠 Masukkan *alamat lengkap*:'
        });
      }

      // STEP 9: Alamat
      if (userState[sender]?.step === 8) {
        userState[sender].alamat = rawText;
        userState[sender].step = 9;
        return sock.sendMessage(sender, {
          text: '👨‍👩‍👧‍👦 Masukkan *nama orang tua*:'
        });
      }

      // STEP 10: Nama Orang Tua
      if (userState[sender]?.step === 9) {
        userState[sender].nama_ortu = rawText;
        userState[sender].step = 10;
        return sock.sendMessage(sender, {
          text: '💼 Masukkan *pekerjaan orang tua*:'
        });
      }

      // STEP 11: Pekerjaan Orang Tua
      if (userState[sender]?.step === 10) {
        userState[sender].pekerjaan_ortu = rawText;
        userState[sender].step = 11;
        return sock.sendMessage(sender, {
          text: '📱 Masukkan *nomor HP orang tua* (contoh: 081234567890):'
        });
      }

      // STEP 12: Nomor HP Orang Tua
      if (userState[sender]?.step === 11) {
        if (!isValidPhone(rawText)) {
          return sock.sendMessage(sender, {
            text: '❌ Format nomor HP tidak valid. Mohon masukkan nomor yang benar (10-15 digit angka):'
          });
        }
        userState[sender].no_hp_ortu = rawText;
        userState[sender].step = 12;
        return sock.sendMessage(sender, {
          text: '🏫 Masukkan *asal sekolah*:'
        });
      }

      // STEP 13: Asal Sekolah
      if (userState[sender]?.step === 12) {
        userState[sender].asal_sekolah = rawText;
        userState[sender].step = 13;
        return sock.sendMessage(sender, {
          text: '🏫 Masukkan *alamat sekolah asal*:'
        });
      }

      // STEP 14: Alamat Sekolah Asal
      if (userState[sender]?.step === 13) {
        userState[sender].alamat_sekolah_asal = rawText;
        userState[sender].step = 14;
        return sock.sendMessage(sender, {
          text: '📅 Masukkan *tahun lulus* (contoh: 2024):'
        });
      }

      // STEP 15: Tahun Lulus
      if (userState[sender]?.step === 14) {
        const tahun = parseInt(rawText);
        const tahunSekarang = new Date().getFullYear();
        
        if (isNaN(tahun) || tahun < 2000 || tahun > tahunSekarang) {
          return sock.sendMessage(sender, {
            text: `❌ Tahun tidak valid. Mohon masukkan tahun antara 2000-${tahunSekarang}:`
          });
        }
        
        userState[sender].tahun_lulus = tahun;
        userState[sender].step = 15;
        return sock.sendMessage(sender, {
          text: '📊 Masukkan *nilai raport* (contoh: 85.50):'
        });
      }

      // STEP 16: Nilai Raport
      if (userState[sender]?.step === 15) {
        const nilai = parseFloat(rawText.replace(',', '.'));
        
        if (isNaN(nilai) || nilai < 0 || nilai > 100) {
          return sock.sendMessage(sender, {
            text: '❌ Nilai tidak valid. Mohon masukkan nilai antara 0-100 (contoh: 85.50):'
          });
        }
        
        userState[sender].nilai_raport = nilai;
        userState[sender].step = 16;
        return sock.sendMessage(sender, {
          text: '📚 Masukkan *pilihan jurusan 1* (contoh: Teknik Komputer Jaringan):'
        });
      }

      // STEP 17: Pilihan Jurusan 1
      if (userState[sender]?.step === 16) {
        userState[sender].pilihan_jurusan1 = rawText;
        userState[sender].step = 17;
        return sock.sendMessage(sender, {
          text: '📚 Masukkan *pilihan jurusan 2* (opsional, ketik "-" untuk melewatkan):',
          footer: 'Ketik "-" untuk melewatkan'
        });
      }


      // STEP 18: Pilihan Jurusan 2 (opsional)
      if (userState[sender]?.step === 17) {
        if (rawText !== '-') {
          userState[sender].pilihan_jurusan2 = rawText;
        }
        
        // Konfirmasi data
        const data = userState[sender];
        let confirmMessage = '📋 *Konfirmasi Data Pendaftaran*\n\n' +
          '👤 *Data Pribadi*\n' +
          `├ Nama: ${data.nama || 'Tidak diisi'}\n` +
          `├ Email: ${data.email || 'Tidak diisi'}\n` +
          `├ No. HP: ${data.nomor || 'Tidak diisi'}\n` +
          `├ Tempat/Tgl Lahir: ${data.tempat_lahir || '-'}, ${data.tanggal_lahir || '-'}\n` +
          `├ Jenis Kelamin: ${data.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}\n` +
          `├ Agama: ${data.agama || '-'}\n` +
          `└ Alamat: ${data.alamat || '-'}\n\n` +
          '👨‍👩‍👧‍👦 *Data Orang Tua*\n' +
          `├ Nama: ${data.nama_ortu || '-'}\n` +
          `├ Pekerjaan: ${data.pekerjaan_ortu || '-'}\n` +
          `└ No. HP: ${data.no_hp_ortu || '-'}\n\n` +
          '🏫 *Data Pendidikan*\n' +
          `├ Asal Sekolah: ${data.asal_sekolah || '-'}\n` +
          `├ Alamat Sekolah: ${data.alamat_sekolah_asal || '-'}\n` +
          `├ Tahun Lulus: ${data.tahun_lulus || '-'}\n` +
          `└ Nilai Raport: ${data.nilai_raport || '-'}\n\n` +
          '📚 *Pilihan Jurusan*\n' +
          `1. ${data.pilihan_jurusan1 || 'Tidak diisi'}\n`;
        
        if (data.pilihan_jurusan2) {
          confirmMessage += `2. ${data.pilihan_jurusan2}\n`;
        } else {
          confirmMessage += '2. -\n';
        }
        
        confirmMessage += '\nApakah data di atas sudah benar? (Ya/Tidak)';
        
        userState[sender].step = 18; // Langkah konfirmasi
        return sock.sendMessage(sender, { text: confirmMessage });
      }
      
      // STEP 19: Konfirmasi
      if (userState[sender]?.step === 18) {
        console.log('Memproses langkah konfirmasi...'); // Log untuk debugging
        // Dapatkan teks pesan dari msg
        const pesanDiterima = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        // Normalisasi input konfirmasi
        const konfirmasi = pesanDiterima.trim().toLowerCase();
        console.log('Pesan yang diterima:', pesanDiterima); // Log pesan asli
        console.log('Konfirmasi yang dinormalisasi:', konfirmasi); // Log untuk debugging
        
        if (konfirmasi === 'ya' || konfirmasi === 'y') {
          console.log('Konfirmasi YA diterima, memproses...'); // Log untuk debugging
          try {
            // Siapkan data untuk dikirim ke API
            const dataPendaftaran = {
              nama: userState[sender]?.nama || '',
              email: userState[sender]?.email || '',
              nomor: userState[sender]?.nomor || '',
              tempat_lahir: userState[sender]?.tempat_lahir || '',
              tanggal_lahir: userState[sender]?.tanggal_lahir || '',
              jenis_kelamin: userState[sender]?.jenis_kelamin || '',
              agama: userState[sender]?.agama || '',
              alamat: userState[sender]?.alamat || '',
              nama_ortu: userState[sender]?.nama_ortu || '',
              pekerjaan_ortu: userState[sender]?.pekerjaan_ortu || '',
              no_hp_ortu: userState[sender]?.no_hp_ortu || userState[sender]?.nomor || '',
              asal_sekolah: userState[sender]?.asal_sekolah || '',
              alamat_sekolah_asal: userState[sender]?.alamat_sekolah_asal || userState[sender]?.asal_sekolah || '',
              tahun_lulus: userState[sender]?.tahun_lulus || new Date().getFullYear(),
              nilai_raport: userState[sender]?.nilai_raport || 0,
              pilihan_jurusan1: userState[sender]?.pilihan_jurusan1 || '',
              pilihan_jurusan2: userState[sender]?.pilihan_jurusan2 || '',
              status_pendaftaran: 'pending',
              catatan: 'Pendaftaran melalui WhatsApp Bot'
            };
            
            console.log('Mengirim data ke API:', dataPendaftaran);
            
            // Kirim data ke API
            const response = await axios.post(
              'http://localhost:3000/api/pendaftaran',
              dataPendaftaran,
              {
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
            
            let successMessage = 'Halo, terima kasih telah mendaftar di SMK Globin! 🎉\n\n' +
              '✅ *PENDAFTARAN ANDA BERHASIL*\n\n' +
              'Berikut detail pendaftaran Anda:\n' +
              '┌───────────────────────────┐\n' +
              `│ 👤 *Nama*: ${userState[sender]?.nama || '-'}\n` +
              `│ 📱 *No. HP*: ${userState[sender]?.nomor || '-'}\n` +
              `│ 📧 *Email*: ${userState[sender]?.email || '-'}\n` +
              `│ 🏫 *Asal Sekolah*: ${userState[sender]?.asal_sekolah || '-'}\n` +
              `│ 📚 *Jurusan Pilihan*: ${userState[sender]?.pilihan_jurusan1 || '-'}\n`;

            if (userState[sender]?.pilihan_jurusan2) {
              successMessage += `│ 📚 *Jurusan Alternatif*: ${userState[sender]?.pilihan_jurusan2 || '-'}\n`;
            }

            successMessage += '└───────────────────────────┘\n\n' +
              '📌 *INFORMASI SELANJUTNYA*\n' +
              '1. Admin kami akan menghubungi Anda maksimal 1x24 jam\n' +
              '2. Siapkan dokumen yang diperlukan:\n' +
              '   - Fotokopi KK dan Akta Kelahiran\n' +
              '   - Pas foto 3x4 (2 lembar)\n' +
              '   - Raport terakhir (jika ada)\n\n' +
              '3. Tes seleksi akan diinformasikan lebih lanjut\n\n' +
              '❓ *Pertanyaan lebih lanjut*\n' +
              '📞 021-12345678 (Admin)\n' +
              '🕒 Senin - Jumat, 08:00 - 16:00 WIB\n\n' +
              'Terima kasih atas kepercayaan Anda kepada SMK Globin. Kami tunggu kehadiran Anda! 🙏';

            // Hapus state sebelum mengirim pesan sukses
            const userData = { ...userState[sender] };
            delete userState[sender];
            
            // Kirim pesan sukses
            console.log('Mengirim pesan sukses...'); // Log untuk debugging
            await sock.sendMessage(sender, { text: successMessage });
            console.log('Pesan sukses terkirim, menghapus state...'); // Log untuk debugging
            return; // Pastikan keluar dari fungsi setelah mengirim pesan
          } catch (err) {
            console.error("❌ Gagal kirim ke API:", err?.response?.data || err?.message || err);
            
            let errorMessage = '❌ *Gagal menyimpan data*\n\n' +
              'Terjadi kesalahan saat menyimpan data pendaftaran.\n';
            
            // Tampilkan pesan error spesifik dari API jika ada
            if (err.response?.data?.message) {
              errorMessage += `\n*Pesan error*: ${err.response.data.message}`;
            }
            
            errorMessage += '\nSilakan coba lagi dengan mengetik *Daftar*';
            
            // Hapus state untuk memungkinkan pendaftaran ulang
            delete userState[sender];
            
            return sock.sendMessage(sender, { text: errorMessage });
          }
        } else if (konfirmasi === 'tidak' || konfirmasi === 't') {
          // Reset state dan beri pesan untuk memulai ulang
          delete userState[sender];
          return sock.sendMessage(sender, {
            text: 'Baik, data pendaftaran Anda tidak jadi disimpan.\n\n' +
                  'Jika ingin mendaftar kembali, silakan ketik *Daftar*.'
          });
        } else {
          console.log('Jawaban tidak valid diterima:', konfirmasi); // Log untuk debugging
          return sock.sendMessage(sender, {
            text: 'Mohon jawab dengan *Ya* (atau *y*) atau *Tidak* (atau *t*) saja.'
          });
        }
      }

      // ========== INTENT KHUSUS: MULAI DAFTAR ==========
      // Skip intent processing if we're in the middle of registration
      if (userState[sender]?.step && userState[sender]?.step !== 9) {
        return;
      }

      const intent = getIntent(lowerText);

      if (intent === "mulai_daftar") {
        userState[sender] = { step: 1 };

        await sock.sendMessage(sender, {
          text:
            "Baik, kita mulai proses pendaftaran.\n\n" +
            "Silakan masukkan *nama lengkap* Anda:",
        });
        return;
      }

      // ========== SEMUA PERTANYAAN LAIN → GEMINI ==========

      try {
        const jawaban = await answerDenganGemini(rawText);
        await sock.sendMessage(sender, { text: jawaban });
      } catch (e) {
        console.error("❌ Error memanggil Gemini:", e);
        await sock.sendMessage(sender, {
          text: "Maaf, saya sedang tidak bisa mengakses sistem AI.",
        });
      }
    } catch (err) {
      console.error("❌ Error di handler messages.upsert:", err);
    }
  });
}

// Jalankan bot setelah knowledge base berhasil dimuat
// Fungsi untuk mendapatkan status koneksi bot
export function getBotStatus() {
  return {
    isConnected,
    lastConnection: lastConnection ? lastConnection.toISOString() : null,
    qrCode: currentQR,
    deviceInfo: isConnected ? {
      platform: 'WhatsApp Web',
      browser: 'Chrome',
      os: process.platform === 'win32' ? 'Windows' : 
          process.platform === 'darwin' ? 'macOS' : 'Linux',
      lastActive: lastConnection ? lastConnection.toISOString() : null
    } : null
  };
}

loadKnowledgeBase()
  .then(() => {
    console.log("📚 Knowledge Base loaded, starting bot...");
    return startBot();
  })
  .catch((err) => {
    console.error("❌ Gagal memulai bot:", err);
  });
