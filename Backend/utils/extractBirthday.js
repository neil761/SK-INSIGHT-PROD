const fs = require('fs');
const moment = require('moment');
const Tesseract = require('tesseract.js');

async function extractBirthdayFromImage(imagePath, typedBirthday) {
  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
    console.log('🔍 OCR Output:', text);

    const regex = /\b(\d{4}[-\/.]\d{2}[-\/.]\d{2}|\d{2}[-\/.]\d{2}[-\/.]\d{4}|[A-Za-z]+[\s-]?\d{1,2}[\s,.-]?\d{4}|\d{2}-[A-Za-z]{3}-\d{4})\b/g;

    const matches = text.match(regex);
    console.log('📅 Found Date Matches:', matches);

    const typed = moment(typedBirthday).format('YYYY-MM-DD');
    console.log('🎯 Typed birthday (normalized):', typed);

    if (matches) {
      for (let raw of matches) {
            const parsed = moment(raw, [
            'YYYY-MM-DD',
            'MM-DD-YYYY',
            'DD-MM-YYYY',
            'MMMM D, YYYY',
            'D MMMM YYYY',
            'MMMM-DD-YYYY',
            'MMM DD YYYY',
            'DD MMMM YYYY',
            'MM/DD/YYYY',
            'DD/MM/YYYY',
            'MMMM D YYYY',
            'MMM D YYYY',
            'D MMM YYYY',
            'D-MMMM-YYYY',
            'DD-MMM-YYYY' 
          ]);

        
        const parsedFormatted = parsed.format('YYYY-MM-DD');
        console.log(`🔎 Trying: "${raw}" → ${parsedFormatted}`);

        if (parsed.isValid() && parsedFormatted === typed) {
          console.log('✅ Birthday match found!');
          return parsedFormatted;
        }
      }
    }

    console.log('❌ No matching birthday found.');
    return null;
  } catch (err) {
    console.error('🚫 OCR error:', err);
    return null;
  } finally {
    fs.unlink(imagePath, () => {});
  }
}

module.exports = extractBirthdayFromImage;
