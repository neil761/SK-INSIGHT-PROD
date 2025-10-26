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
    /\b\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}\b/, // 31/03/2004
    /\b\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2}\b/, // 2004-03-31
    /\b[A-Z]{3,9} \d{1,2}, \d{4}\b/i,      // MARCH 31, 2004
    /\b\d{2}-[A-Za-z]{3}-\d{4}\b/,         // 10-Sep-2003
  ];
  let birthday = null;

  // Try to find a line with "Birth" and extract date from it
  const lines = ocrText.split('\n');
  for (const line of lines) {
    if (/birth/i.test(line)) {
      for (const regex of birthdayRegexes) {
        const match = line.match(regex);
        if (match) {
          birthday = normalizeDate(match[0]);
          break;
        }
      }
      if (birthday) break;
    }
  }

  // If not found by context, fall back to first date match in whole text
  if (!birthday) {
    for (const regex of birthdayRegexes) {
      const match = ocrText.match(regex);
      if (match) {
        birthday = normalizeDate(match[0]);
        break;
      }
    }
  }

  // Address extraction (accept "CALACA" or "CALACA CITY", any case)
  const addressKeywords = ["puting bato west", "batangas"];
  // Accept either "calaca" or "calaca city"
  const calacaRegex = /calaca(\s+city)?/i;

  let address = null;
  const lowerText = ocrText.toLowerCase().replace(/\s+/g, " ");

  // Try to find any line with "batangas"
  const addressLine = ocrText
    .split("\n")
    .find(line => line.toLowerCase().includes("batangas"));

  if (addressLine) {
    // Remove leading non-letter characters and trim
    address = addressLine.replace(/^[^a-zA-Z]+/, "").trim();
  }

  // If not found by context, fall back to first address match in whole text
  if (!address) {
    for (const regex of addressKeywords) {
      const match = ocrText.match(regex);
      if (match) {
        address = match[0];
        break;
      }
    }
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
