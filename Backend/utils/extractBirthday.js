const fs = require("fs");
const moment = require("moment");
const Tesseract = require("tesseract.js");
const { normalizeDate } = require("./dateUtils");

// Helper to extract birthday and address from OCR text
function extractBirthdayAndAddress(ocrText) {
  // Log raw OCR text for debugging
  console.log("Raw OCR text:", ocrText);

  // Birthday extraction (support text month formats)
  const birthdayRegexes = [
    /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/, // 31/03/2004
    /(\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})/, // 2004-03-31
    /([A-Z]{3,9} \d{1,2}, \d{4})/i, // MARCH 31, 2004
  ];
  let birthday = null;
  for (const regex of birthdayRegexes) {
    const match = ocrText.match(regex);
    if (match) {
      birthday = normalizeDate(match[0]);
      break;
    }
  }

  // Address extraction (accept "CALACA" or "CALACA CITY", any case)
  const addressKeywords = ["puting bato west", "batangas"];
  // Accept either "calaca" or "calaca city"
  const calacaRegex = /calaca(\s+city)?/i;

  let address = null;
  const lowerText = ocrText.toLowerCase().replace(/\s+/g, " ");
  if (
    addressKeywords.every((k) => lowerText.includes(k)) &&
    calacaRegex.test(lowerText)
  ) {
    address =
      ocrText
        .split("\n")
        .find(
          (line) =>
            addressKeywords.every((k) => line.toLowerCase().includes(k)) &&
            calacaRegex.test(line)
        ) || "Puting Bato West, Calaca, Batangas";
  }

  // Log extracted birthday and address for debugging
  console.log("Extracted birthday (helper):", birthday);
  console.log("Extracted address (helper):", address);

  return { birthday, address };
}

// Main OCR function
async function extractFromIDImage(imagePath) {
  const {
    data: { text },
  } = await Tesseract.recognize(imagePath, "eng");
  return extractBirthdayAndAddress(text);
}

module.exports = { extractFromIDImage, extractBirthdayAndAddress };
