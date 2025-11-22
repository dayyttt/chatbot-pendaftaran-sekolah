import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

export async function scrapeSekolah() {
  try {
    const url = "https://smkglobin.vercel.app/";
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const result = {
      profil: $("meta[name='description']").attr("content") || "",
      title: $("title").text(),
      sections: [],
    };

    $("section").each((i, el) => {
      result.sections.push($(el).text().trim());
    });

    fs.writeFileSync("lib/knowledge.json", JSON.stringify(result, null, 2));

    console.log("✅ Scrape selesai & tersimpan di knowledge.json");
    return result;
  } catch (err) {
    console.error("❌ Error scrape:", err);
    return null;
  }
}
