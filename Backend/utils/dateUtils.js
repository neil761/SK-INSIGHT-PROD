const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04',
  may: '05', jun: '06', jul: '07', aug: '08',
  sep: '09', oct: '10', nov: '11', dec: '12'
};

const FULL_MONTHS = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12'
};

function normalizeDate(input) {
  if (!input) return null;

  const clean = input.toLowerCase().replace(/[,\s]+/g, ' ').trim();

  // Try built-in parser first
  const nativeParsed = new Date(clean);
  if (!isNaN(nativeParsed)) {
    return nativeParsed.toISOString().split('T')[0];
  }

  // Regex to extract numbers and months
  const match = clean.match(
    /\b(?:(\d{1,2})[-\/\s])?(?:(\w+)[-\s])(\d{1,2})[-\/\s](\d{4})\b/ // matches "31 March 2004", "Mar-31-2004", etc.
    || clean.match(/\b(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\b/) // ISO
  );

  if (match) {
    let day, month, year;

    if (match.length === 5) {
      // Example: "31 March 2004" or "Mar 31 2004"
      [ , part1, part2, part3, part4 ] = match;

      if (isNaN(part2)) {
        // Format: "31 March 2004" or "Mar 31 2004"
        day = part1;
        month = FULL_MONTHS[part2] || MONTHS[part2.slice(0, 3)];
        year = part4;
      } else {
        // Format: "March 31 2004"
        month = FULL_MONTHS[part1] || MONTHS[part1.slice(0, 3)];
        day = part3;
        year = part4;
      }
    } else if (match.length === 4) {
      // Format: 2004-03-31
      [ , year, month, day ] = match;
    }

    if (year && month && day) {
      const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const parsed = new Date(iso);
      if (!isNaN(parsed)) {
        return parsed.toISOString().split('T')[0];
      }
    }
  }

  // Last resort: find date pattern manually
  const fallback = input.match(/(\d{1,2})[ -\/]?([a-zA-Z]+)[ -\/]?(\d{4})/);
  if (fallback) {
    const [, day, monthStr, year] = fallback;
    const month =
      FULL_MONTHS[monthStr.toLowerCase()] ||
      MONTHS[monthStr.toLowerCase().slice(0, 3)];
    if (month && year) {
      const iso = `${year}-${month}-${day.padStart(2, '0')}`;
      const parsed = new Date(iso);
      if (!isNaN(parsed)) {
        return parsed.toISOString().split('T')[0];
      }
    }
  }

  return null;
}

module.exports = { normalizeDate };
