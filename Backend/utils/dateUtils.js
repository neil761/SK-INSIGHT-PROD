const MONTHS = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

const FULL_MONTHS = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

function normalizeDate(input) {
  if (!input) return null;

  const clean = input
    .toLowerCase()
    .replace(/[,\s]+/g, " ")
    .trim();

  // Try ISO first
  const isoMatch = clean.match(/\b(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\b/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Match formats like "March 31, 2004" or "31 March 2004"
  const match =
    clean.match(/(\d{1,2})[-\/\s]+([a-zA-Z]+)[-\s]+(\d{4})/) ||
    clean.match(/([a-zA-Z]+)[-\s]+(\d{1,2})[-\/\s]+(\d{4})/);

  if (match) {
    let day, monthStr, year;

    if (isNaN(match[1])) {
      // Format: March 31 2004
      monthStr = match[1];
      day = match[2];
      year = match[3];
    } else {
      // Format: 31 March 2004
      day = match[1];
      monthStr = match[2];
      year = match[3];
    }

    const month =
      FULL_MONTHS[monthStr.toLowerCase()] ||
      MONTHS[monthStr.toLowerCase().slice(0, 3)];

    if (month) {
      // Return manually constructed date string to avoid UTC shift
      return `${year}-${month}-${day.padStart(2, "0")}`;
    }
  }

  return null;
}

module.exports = { normalizeDate };
