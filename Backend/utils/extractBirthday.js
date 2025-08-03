const fs = require("fs");
const moment = require("moment");
const Tesseract = require("tesseract.js");
const { normalizeDate } = require("./dateUtils");

async function extractBirthdayFromImage(imagePath, typedBirthday) {
  try {
    const {
      data: { text },
    } = await Tesseract.recognize(imagePath, "eng");
    console.log("🔍 OCR Output:", text);

    const regex =
      /\b(?:\d{4}[-\/.]\d{2}[-\/.]\d{2}|\d{2}[-\/.]\d{2}[-\/.]\d{4}|[A-Z][A-Z]+[\s-]+\d{1,2}[,\s-]+\d{4}|\d{2}-[A-Za-z]{3}-\d{4})\b/g;

    const matches = text.match(regex);
    console.log("📅 Found Date Matches:", matches);

    const typed = moment(typedBirthday, "YYYY-MM-DD", true);
    if (!typed.isValid()) {
      console.log("❌ Invalid typed birthday format. Must be YYYY-MM-DD.");
      return null;
    }

    const normalizedTyped = typed.format("YYYY-MM-DD");
    console.log("🎯 Typed birthday (normalized):", normalizedTyped);

    if (matches) {
      for (let raw of matches) {
        const parsedFormatted = normalizeDate(raw);
        console.log(`🔎 Trying: "${raw}" → ${parsedFormatted}`);

        if (parsedFormatted === normalizedTyped) {
          console.log("✅ Birthday match found!");
          return parsedFormatted;
        }
      }
    }

    console.log("❌ No matching birthday found.");
    return null;
  } catch (err) {
    console.error("🚫 OCR error:", err);
    return null;
  } finally {
    fs.unlink(imagePath, () => {});
  }
}

module.exports = extractBirthdayFromImage;
