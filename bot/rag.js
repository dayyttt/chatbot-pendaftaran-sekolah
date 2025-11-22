// bot/rag.js
import "dotenv/config";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY tidak ditemukan. Pastikan ada di file .env");
  throw new Error("GEMINI_API_KEY missing");
}

console.log("🔐 GEMINI_API_KEY ter-load (prefix):", apiKey.slice(0, 8) + "*****");

const genAI = new GoogleGenerativeAI(apiKey);

// pakai model generasi terbaru
const MODEL_ID = "gemini-2.5-flash";

// ====== SUMBER-SUMBER INFORMASI SMK GLOBIN ======
// Jangan hardcode teks jurusan di sini, tapi biarkan kita ambil dari web.
// Kalau nanti mau nambah sumber lain, tinggal tambah URL.
const SCHOOL_SOURCES = [
  "https://smkglobin.sch.id/",
  "https://cotidienews.com/2025/02/13/ppdb-smk-globin-terima-siswa-baru-tahun-ajaran-2025-2026-hingga-juli-2025/",
];

let knowledgeBase = "";

// ========== FETCH & BUILD KNOWLEDGE BASE ==========
export async function loadKnowledgeBase() {
  let combined = "";

  for (const url of SCHOOL_SOURCES) {
    try {
      console.log("🌐 Fetching:", url);
      const { data } = await axios.get(url, { timeout: 15000 });

      // bersihkan HTML: buang <script>, <style>, lalu semua tag
      const text = data
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      combined += `\n\n[SUMBER: ${url}]\n${text}`;
    } catch (err) {
      console.error("❌ Gagal fetch", url, "-", err.message);
    }
  }

  knowledgeBase = combined;
  console.log("📚 Knowledge base length:", knowledgeBase.length);
}

// Helper kecil untuk pilih konteks yang relevan (biar nggak semua teks dilempar)
function buildRelevantContext(question) {
  if (!knowledgeBase) return "";

  const q = question.toLowerCase();
  const base = knowledgeBase;

  // kalau user nanya jurusan / kompetensi keahlian,
  // coba ambil sekitar kata "jurusan", "kompetensi keahlian", "program keahlian"
  if (q.includes("jurusan") || q.includes("kompetensi") || q.includes("program keahlian")) {
    const keywords = ["jurusan", "kompetensi keahlian", "program keahlian", "mplb", "pemasaran"];
    let snippets = "";

    for (const kw of keywords) {
      const idx = base.toLowerCase().indexOf(kw);
      if (idx !== -1) {
        const start = Math.max(0, idx - 400);
        const end = Math.min(base.length, idx + 400);
        snippets += base.slice(start, end);
      }
    }

    if (snippets) return snippets;
  }

  // fallback: kirim potongan awal (jangan terlalu panjang)
  return knowledgeBase.slice(0, 30000);
}

// ========== KIRIM KE GEMINI ==========
export async function answerDenganGemini(question) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
      const context = buildRelevantContext(question);
  
      const prompt = `
  Kamu adalah chatbot resmi untuk SMK Globin.
  
  KONTEKS PENTING:
  - Gunakan INFORMASI dari KNOWLEDGE BASE di bawah ini sebagai sumber UTAMA.
  - Jika di KNOWLEDGE BASE sudah ada informasi spesifik (misalnya jurusan, alamat, akreditasi, dsb),
    WAJIB gunakan itu. Jangan diganti dengan pengetahuan umum atau contoh generik.
  - Hanya jika informasi tertentu TIDAK ADA sama sekali di KNOWLEDGE BASE,
    barulah kamu boleh menjawab secara umum berdasarkan pengetahuanmu tentang SMK,
    dan beri disclaimer bahwa data detail tidak ada di knowledge base.
  
  DILARANG:
  - Mengarang daftar jurusan yang tidak muncul di KNOWLEDGE BASE.
  - Memberikan contoh jurusan “umum SMK di Indonesia” kalau di KNOWLEDGE BASE sudah jelas tertulis jurusannya.
  
  Jawab dalam bahasa Indonesia yang sopan dan jelas.
  Gunakan bullet point jika menyebut daftar.
  
  ======== KNOWLEDGE BASE (gabungan beberapa sumber tentang SMK GLOBIN) ========
  ${context}
  ===============================================================================
  
  Pertanyaan user: "${question}"
      `;
  
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      console.error("❌ Error Gemini (objek full):", err);
      console.error("❌ Error Gemini (message):", err.message);
      return "Maaf, saya sedang tidak bisa mengakses sistem AI.";
    }
  }
  
