const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://weebcentral.com/'
};

const CDN_HOSTS = [
  'hot.planeptune.us',
  'scans-hot.planeptune.us',
];

function pad(n, width) {
  return String(n).padStart(width, '0');
}

function buildCdnUrl(host, chNum, pageNum) {
  return `https://${host}/manga/Hunter-X-Hunter/${pad(chNum, 4)}-${pad(pageNum, 3)}.png`;
}

async function probeChapterCdn(chNum) {
  for (const host of CDN_HOSTS) {
    const firstPageUrl = buildCdnUrl(host, chNum, 1);
    try {
      const res = await fetch(firstPageUrl, {
        method: 'HEAD',
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        console.log(`[CDN] Chapter ${chNum} found on ${host}`);
        return host;
      }
    } catch (e) {
      console.log(`Failed host ${host}:`, e.message);
    }
  }
  return null;
}

async function buildCdnImageList(chNum, host) {
  const images = [];
  let pageNum = 1;
  const MAX_PAGES = 80;

  while (pageNum <= MAX_PAGES) {
    const imgUrl = buildCdnUrl(host, chNum, pageNum);
    try {
      const res = await fetch(imgUrl, {
        method: 'HEAD',
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) {
        console.log(`Page ${pageNum} not OK (status ${res.status}). Ending search.`);
        break; // End of chapter
      }
      images.push(imgUrl);
      pageNum++;
    } catch (e) {
      console.log(`Error at page ${pageNum}:`, e.message);
      break;
    }
  }

  return images;
}

async function test() {
  const chNum = 50;
  const host = await probeChapterCdn(chNum);
  if (host) {
    const images = await buildCdnImageList(chNum, host);
    console.log(`Ch ${chNum} - Found ${images.length} images:`, images.slice(0, 3));
  } else {
    console.log(`Ch ${chNum} - Host not found!`);
  }
}

test();
