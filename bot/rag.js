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
const MODEL_ID = "gemini-2.5-flash";

// ================== SUMBER DATA ==================
// pakai web kamu sendiri
const SCHOOL_SOURCES = [
  "https://smkglobin.sch.id/",       // beranda
  "https://smkglobin.sch.id/profil", // contoh, sesuaikan dengan route Next.js kamu
  "https://smkglobin.sch.id/ppdb",
  // tambah sendiri kalau ada halaman lain: /fasilitas, /ekstrakurikuler, dll
];

let knowledgeBase = "";

// helper: bersihin HTML → text
function htmlToText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ================== LOAD KNOWLEDGE BASE ==================
export async function loadKnowledgeBase() {
  let combined = "";

  for (const url of SCHOOL_SOURCES) {
    try {
      console.log("🌐 Fetching:", url);
      const { data } = await axios.get(url, {
        timeout: 15000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36",
        },
      });

      const text = htmlToText(data);
      console.log(`✅ OK ${url} (panjang ~${text.length} karakter)`);

      combined += `\n\n[SUMBER: ${url}]\n${text}`;
    } catch (err) {
      console.error("❌ Gagal fetch", url, "-", err.message);
    }
  }

  knowledgeBase = combined;
  console.log("📚 Knowledge base length:", knowledgeBase.length);
  console.log("🔍 Preview KB:", knowledgeBase.slice(0, 400)); // buat cek di console
}

// ================== BUILD CONTEXT RELEVAN ==================
function buildRelevantContext(question) {
  if (!knowledgeBase) return "";

  const kb = knowledgeBase;
  const lowerKB = kb.toLowerCase();
  const q = question.toLowerCase();

  // kata kunci penting (boleh kamu tambah sendiri)
  const keywords = [
    "smk globin",
    "jurusan",
    "program keahlian",
    "kompetensi keahlian",
    "ppdb",
    "pendaftaran",
    "alamat",
    "akreditasi",
    "kurikulum",
    "visi",
    "misi",
  ];

  const sentences = kb.split(/(?<=[.!?])\s+/);
  const scored = sentences.map((s) => {
    const ls = s.toLowerCase();
    let score = 0;

    for (const kw of keywords) {
      if (ls.includes(kw)) score++;
    }

    // kalau kalimat mengandung kata dari pertanyaan, tambah skor
    const words = q.split(/\s+/);
    for (const w of words) {
      if (w.length > 3 && ls.includes(w)) score++;
    }

    return { s, score };
  });

  const relevant = scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 80) // maksimal 80 kalimat
    .map((x) => x.s);

  if (relevant.length === 0) {
    // fallback: kirim potongan awal KB
    return kb.slice(0, 15000);
  }

  return relevant.join(" ");
}

// ================== TANYA GEMINI ==================
export async function answerDenganGemini(question) {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_ID });

    const context = buildRelevantContext(question);

    const prompt = `
Kamu adalah chatbot resmi *SMK Globin*.

Gunakan informasi dari KNOWLEDGE BASE berikut sebagai sumber UTAMA.
Jika di KNOWLEDGE BASE ada informasi spesifik (jurusan, alamat, profil, PPDB, dsb), WAJIB gunakan itu.
JANGAN memberikan contoh generik "jurusan SMK di Indonesia" kalau di KNOWLEDGE BASE sudah ada jurusan SMK Globin sendiri.

======== KNOWLEDGE BASE (dari smkglobin.sch.id) ========
${context}
================================================================

Pertanyaan pengguna:
"${question}"

Jawab dalam bahasa Indonesia yang sopan, jelas, dan ringkas.
Gunakan bullet point bila cocok.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("❌ Error Gemini (objek full):", err);
    console.error("❌ Error Gemini (message):", err.message);
    return "Maaf, saya sedang tidak bisa mengakses sistem AI.";
  }
}
