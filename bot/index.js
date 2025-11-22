// bot/index.js
import "dotenv/config";
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import axios from "axios";
import { getIntent } from "../lib/nlp.js"; // fungsi NLP kamu
import { loadKnowledgeBase, answerDenganGemini } from "./rag.js";

// Menyimpan state pendaftaran per user
const userState = {};

// (Opsional) hanya buat dokumentasi aja
const BOT_PHONE_NUMBER = "6282248720361"; // 62 + 82248720361

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
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Kalau ada QR, tampilkan di terminal
    if (qr) {
      console.log(
        "🔵 Scan QR ini pakai WhatsApp dengan nomor 082248720361 (Perangkat Tertaut):"
      );
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("✅ Bot terhubung dengan WhatsApp!");
    }

    if (connection === "close") {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode ||
        lastDisconnect?.error?.output?.payload?.statusCode;

      console.log("❌ Koneksi terputus. Status code:", statusCode);

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log("🔄 Mencoba konek ulang...");
        startBot();
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

      // ========== FLOW PENDAFTARAN MANUAL (3 STEP) ==========

      // STEP 1: Nama
      if (userState[sender]?.step === 1) {
        userState[sender].nama = rawText;
        userState[sender].step = 2;

        await sock.sendMessage(sender, {
          text: "Masukkan *email* Anda:",
        });
        return;
      }

      // STEP 2: Email
      if (userState[sender]?.step === 2) {
        userState[sender].email = rawText;
        userState[sender].step = 3;

        await sock.sendMessage(sender, {
          text: "Masukkan *nomor HP* Anda:",
        });
        return;
      }

      // STEP 3: Nomor HP
      if (userState[sender]?.step === 3) {
        userState[sender].nomor = rawText;

        // Simpan ke API Next.js
        try {
          await axios.post("http://localhost:3000/api/pendaftaran", {
            nama: userState[sender].nama,
            email: userState[sender].email,
            nomor: userState[sender].nomor,
            wa: sender,
          });
        } catch (err) {
          console.error("❌ Gagal kirim ke API:", err?.message || err);
          await sock.sendMessage(sender, {
            text:
              "Maaf, terjadi kesalahan saat menyimpan data.\n" +
              "Silakan coba lagi beberapa saat lagi.",
          });
          // jangan hapus state, biar user bisa coba ulang manual kalau mau
          return;
        }

        // Hapus state user
        delete userState[sender];

        await sock.sendMessage(sender, {
          text: "✅ Pendaftaran berhasil! Terima kasih, data Anda sudah kami terima.",
        });
        return;
      }

      // ========== INTENT KHUSUS: MULAI DAFTAR ==========

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
loadKnowledgeBase()
  .then(() => {
    console.log("📚 Knowledge Base loaded, starting bot...");
    return startBot();
  })
  .catch((err) => {
    console.error("❌ Gagal memulai bot:", err);
  });
