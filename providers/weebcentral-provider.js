/**
 * WeebCentral Manga Provider Module
 * Encapsulates all network interactions and HTML parsing for WeebCentral.
 */

const SERIES_ID = '01J76XY7EXQV9RE9KQ3JYE0WZ9';
const BASE_URL = 'https://weebcentral.com';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Referer': `${BASE_URL}/`
};

/**
 * Perform fetch with timeout and retry support for temporary network errors.
 */
async function fetchWithRetry(url, options = {}, retries = 3, delay = 2000) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(options.timeout || 12000)
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  throw lastError;
}

/**
 * Perform a single lightweight request to get the full chapter list.
 * The full-chapter-list endpoint returns all chapters in one HTML page, sorted DESC.
 * We parse the very first match to obtain the latest chapter without extra requests.
 *
 * Returns { id, number, title } for the newest chapter, or null on failure.
 */
async function getLatestChapter() {
  const url = `${BASE_URL}/series/${SERIES_ID}/full-chapter-list`;
  const res = await fetchWithRetry(url, { headers: FETCH_HEADERS });
  const html = await res.text();

  // Grab the first chapter link — the list is DESC so it's the newest
  const regex = /\/chapters\/([A-Z0-9]+)"[^>]*>[\s\S]*?Chapter\s+([\d.]+)(?:\s*:\s*([^<]+))?/i;
  const m = regex.exec(html);
  if (!m) return null;

  const id     = m[1];
  const number = parseFloat(m[2]);
  const raw    = m[3] ? m[3].trim() : `Chapter ${number}`;
  const title  = raw.startsWith('Chapter') ? raw : `Chapter ${number}: ${raw}`;

  return { id, number, title };
}

/**
 * Fetch the complete chapter list in one request and parse every entry.
 * Returns [{ id, number, title }, ...] sorted DESC (newest first).
 * Used when multiple new chapters need to be synced at once.
 */
async function getLatestChaptersList() {
  const url = `${BASE_URL}/series/${SERIES_ID}/full-chapter-list`;
  const res = await fetchWithRetry(url, { headers: FETCH_HEADERS });
  const html = await res.text();

  const regex = /\/chapters\/([A-Z0-9]+)"[^>]*>[\s\S]*?Chapter\s+([\d.]+)(?:\s*:\s*([^<]+))?/gi;
  let m;
  const chapters = [];
  const seenNumbers = new Set();

  while ((m = regex.exec(html)) !== null) {
    const id     = m[1];
    const chNum  = parseFloat(m[2]);
    const raw    = m[3] ? m[3].trim() : `Chapter ${chNum}`;
    const title  = raw.startsWith('Chapter') ? raw : `Chapter ${chNum}: ${raw}`;

    if (!isNaN(chNum) && !seenNumbers.has(chNum)) {
      seenNumbers.add(chNum);
      chapters.push({ id, number: chNum, title });
    }
  }

  // Already DESC from WeebCentral; return as-is (newest first)
  return chapters;
}

/**
 * Fetch image URLs for a given WeebCentral chapter ID.
 * Returns an array of absolute image URL strings.
 */
async function getChapterImages(chapterId) {
  const url = `${BASE_URL}/chapters/${chapterId}/images?is_prev=False&current_page=1&reading_style=long_strip`;
  const res = await fetchWithRetry(url, {
    headers: {
      ...FETCH_HEADERS,
      'HX-Request': 'true'
    }
  });
  const html = await res.text();

  const imgRegex = /src="(https?:\/\/[^"]+\.(?:png|jpg|jpeg|webp))"/g;
  const images = [];
  let m;
  while ((m = imgRegex.exec(html)) !== null) {
    if (!m[1].includes('/static/')) {
      images.push(m[1]);
    }
  }
  return images;
}

module.exports = {
  getLatestChapter,
  getLatestChaptersList,
  getChapterImages
};
