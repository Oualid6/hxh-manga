const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

// ── WeebCentral CDN Config ──
// Images follow the pattern: https://{CDN_HOST}/manga/Hunter-X-Hunter/{CHNUM_4PAD}-{PAGE_3PAD}.png
// Multiple CDN hosts are used; we try them in order until one works for a chapter.
const CDN_HOSTS = [
  'hot.planeptune.us',
  'scans-hot.planeptune.us',
];

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://weebcentral.com/'
};

// ── Known WeebCentral Chapter ID Map ──
// We know chapter IDs for some chapters; for others we use CDN fallback.
// Chapter IDs extracted from the series page on WeebCentral.
const KNOWN_CHAPTER_IDS = {
  1:   '01J76XZ2288GQS9GJ0535YQETH',
  2:   '01J76XZ228SQS9ZNPN9HVSW4B8',
  3:   '01J76XZ228VVB96BEK9BH0KTM9',
  407: '01JCTXZJKSEB328MJE7HFJ35MP',
  408: '01JDFC945BF9YEZE25HTPB0ESP',
  409: '01JE1D97QV5497XP0RP9ZBEJD0',
  410: '01JEGSZ9PXVYHCSFVRDYSA8TW5',
  411: '01KW7CH2GAQKQNEAVVCP69S75P',
  412: '01KWSEC6XXZ7A2AJED2BYCWW4N',
};

// ── In-memory caches ──
// chapterImagesCache: { chapterNum -> [imageUrl, ...] }
const chapterImagesCache = {};

// chapterIdMap: the full map fetched from WeebCentral (lazy loaded)
let fullChapterIdMap = null;
let fullChapterIdMapFetching = false;
let fullChapterIdMapCallbacks = [];

// ── Pad a number to N digits ──
function pad(n, width) {
  return String(n).padStart(width, '0');
}

// ── Build CDN image URL ──
function buildCdnUrl(host, chNum, pageNum) {
  return `https://${host}/manga/Hunter-X-Hunter/${pad(chNum, 4)}-${pad(pageNum, 3)}.png`;
}

// ── Probe the CDN to find the right host and count for a chapter ──
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
      // Try next host
    }
  }
  return null;
}

// ── Build full image list from CDN using HEAD requests ──
async function buildCdnImageList(chNum, host) {
  const images = [];
  let pageNum = 1;
  const MAX_PAGES = 80;

  // Load pages until we get a 404 (or reach max)
  while (pageNum <= MAX_PAGES) {
    const imgUrl = buildCdnUrl(host, chNum, pageNum);
    try {
      const res = await fetch(imgUrl, {
        method: 'HEAD',
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) break; // End of chapter
      images.push(imgUrl);
      pageNum++;
    } catch (e) {
      break;
    }
  }

  return images;
}

// ── Fetch chapter images via WeebCentral HTMX endpoint ──
async function fetchFromWeebCentral(chapterId) {
  const imagesUrl = `https://weebcentral.com/chapters/${chapterId}/images?is_prev=False&current_page=1&reading_style=long_strip`;
  console.log(`[WeebCentral] Fetching images for chapter ID ${chapterId}...`);

  const res = await fetch(imagesUrl, {
    headers: {
      ...FETCH_HEADERS,
      'HX-Request': 'true',
    },
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error(`WeebCentral returned ${res.status}`);
  const html = await res.text();

  // Parse image src URLs from the HTML
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

// ── Attempt to fetch the full chapter list from WeebCentral (lazy) ──
// WeebCentral renders chapters via JS, but we can try fetching multiple offsets
async function tryFetchFullChapterList() {
  const SERIES_ID = '01J76XY7EXQV9RE9KQ3JYE0WZ9';
  const map = { ...KNOWN_CHAPTER_IDS };
  let totalFetched = 0;

  // WeebCentral uses an hx-get endpoint for chapter list pagination
  // Try fetching chapters in chunks via the /chapters endpoint with offset
  const LIMIT = 100;
  let offset = 0;
  let keepFetching = true;

  while (keepFetching && offset < 500) {
    const fetchUrl = `https://weebcentral.com/series/${SERIES_ID}/chapters?limit=${LIMIT}&offset=${offset}&sort=ASC`;
    try {
      const res = await fetch(fetchUrl, {
        headers: {
          ...FETCH_HEADERS,
          'HX-Request': 'true',
          'HX-Target': 'chapter-list',
        },
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) break;
      const html = await res.text();

      // Parse chapter entries: look for "Chapter N" followed by chapter ID
      const regex = /Chapter\s+([\d.]+)[\s\S]{0,500}?https:\/\/weebcentral\.com\/chapters\/([A-Z0-9]+)/g;
      let m;
      let found = 0;
      while ((m = regex.exec(html)) !== null) {
        const chNum = Math.round(parseFloat(m[1]));
        const chId = m[2];
        if (!isNaN(chNum) && chNum > 0) {
          map[chNum] = chId;
          found++;
        }
      }

      totalFetched += found;
      if (found < LIMIT) {
        keepFetching = false; // No more chapters
      } else {
        offset += LIMIT;
      }
    } catch (e) {
      console.error(`[WeebCentral] Error fetching chapter list at offset ${offset}:`, e.message);
      break;
    }
  }

  console.log(`[WeebCentral] Full chapter map: ${Object.keys(map).length} chapters found`);
  return map;
}

// ── Get chapter images (main entry point) ──
async function getChapterImages(chNum) {
  if (chapterImagesCache[chNum]) return chapterImagesCache[chNum];

  let images = [];

  // 1. Try WeebCentral if we have a chapter ID
  const knownId = KNOWN_CHAPTER_IDS[chNum];
  if (knownId) {
    try {
      images = await fetchFromWeebCentral(knownId);
      console.log(`[WeebCentral] Got ${images.length} pages for ch${chNum} from WeebCentral`);
    } catch (e) {
      console.error(`[WeebCentral] Failed for ch${chNum}:`, e.message);
    }
  }

  // 2. If WeebCentral didn't work, try CDN directly
  if (images.length === 0) {
    const host = await probeChapterCdn(chNum);
    if (host) {
      images = await buildCdnImageList(chNum, host);
      console.log(`[CDN] Got ${images.length} pages for ch${chNum} from ${host}`);
    }
  }

  if (images.length > 0) {
    chapterImagesCache[chNum] = images;
  }
  return images;
}

// ── Load chapter details for dynamic SEO metadata ──
let CHAPTERS_LIST = [];
try {
  const chaptersPath = path.join(__dirname, 'chapters.js');
  const fileContent = fs.readFileSync(chaptersPath, 'utf8');
  const jsonMatch = fileContent.match(/const\s+CHAPTERS\s*=\s*([\s\S]+?);?\s*$/);
  if (jsonMatch) {
    CHAPTERS_LIST = JSON.parse(jsonMatch[1]);
    console.log(`[SEO] Loaded ${CHAPTERS_LIST.length} chapters from chapters.js for dynamic page generation`);
  }
} catch (err) {
  console.error('[SEO] Failed to load or parse chapters.js on startup:', err.message);
}

function serveIndexWithSeo(req, res, pageType, param = null) {
  const indexPath = path.join(__dirname, 'index.html');
  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error: index.html not found');
      return;
    }

    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost:8000';
    const siteUrl = `${proto}://${host}`;
    const pageUrl = `${siteUrl}${req.url}`;
    const coverUrl = `${siteUrl}/cover-image`;

    let title = "HXH Reader — Hunter × Hunter Manga";
    let desc = "Read Hunter × Hunter manga online for free. All 412+ chapters available. Written by Yoshihiro Togashi. Action, Adventure, Fantasy, Shounen.";
    let schema = {};

    if (pageType === 'home') {
      title = "HXH Reader | Hunter × Hunter Manga Online";
      desc = "Read all 412 chapters of Hunter x Hunter manga online for free. Follow Gon and Killua's adventures in Yoshihiro Togashi's legendary series.";
      schema = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": `${siteUrl}/#website`,
            "url": siteUrl,
            "name": "Hunter × Hunter Manga Online",
            "description": desc
          },
          {
            "@type": "BookSeries",
            "@id": `${siteUrl}/#series`,
            "name": "Hunter × Hunter",
            "author": {
              "@type": "Person",
              "name": "Yoshihiro Togashi"
            },
            "url": siteUrl,
            "genre": ["Action", "Adventure", "Fantasy", "Shounen"]
          }
        ]
      };
    } else if (pageType === 'chapters') {
      title = "All Chapters | HXH Reader";
      desc = "Browse the complete directory of Hunter × Hunter manga. Read any of the 412 chapters online, sorted by story arcs.";
      schema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Hunter × Hunter Chapter Directory",
        "description": desc,
        "url": pageUrl,
        "mainEntity": {
          "@type": "ItemList",
          "numberOfItems": CHAPTERS_LIST.length,
          "itemListElement": CHAPTERS_LIST.map((c, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "url": `${siteUrl}/chapter/${c.number}`,
            "name": `Chapter ${c.number}: ${c.title}`
          }))
        }
      };
    } else if (pageType === 'chapter') {
      const chNum = parseInt(param);
      const chData = CHAPTERS_LIST.find(c => c.number === chNum);
      const chTitle = chData ? chData.title : `Chapter ${chNum}`;
      
      title = `Ch. ${chNum} — ${chTitle} | HXH Reader`;
      desc = `Read Hunter x Hunter Chapter ${chNum}: "${chTitle}" online for free. High-quality chapter pages with proxy CDN loading.`;
      
      schema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": title,
        "description": desc,
        "url": pageUrl,
        "isPartOf": {
          "@type": "BookSeries",
          "name": "Hunter × Hunter",
          "url": siteUrl
        }
      };
    }

    // Replace tags in index.html
    let parsedHtml = html
      .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
      .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${desc}" />`)
      .replace(/href="\/placeholder-canonical"/, `href="${pageUrl}"`)
      .replace(/content="\/placeholder-url"/, `content="${pageUrl}"`)
      .replace(/content="\/cover-image"/g, `content="${coverUrl}"`)
      .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${title}" />`)
      .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${desc}" />`)
      .replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${title}" />`)
      .replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${desc}" />`);

    // Replace Schema JSON-LD Script content
    const schemaString = JSON.stringify(schema, null, 2);
    parsedHtml = parsedHtml.replace(/<script type="application\/ld\+json" id="structured-data">[\s\S]*?<\/script>/, 
      `<script type="application/ld+json" id="structured-data">\n${schemaString}\n</script>`);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(parsedHtml);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // ── 0. Cover Image Route ──
  if (pathname === '/cover-image') {
    const COVER_URL = 'https://uploads.mangadex.org/covers/db692d58-4b13-4174-ae8c-30c515c0689c/aa112927-f1e5-4fe4-a4db-7fd4a1536e3c.jpg';
    try {
      const imageRes = await fetch(COVER_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/jpeg,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://mangadex.org/',
          'sec-fetch-site': 'cross-site',
          'sec-fetch-mode': 'no-cors',
          'sec-fetch-dest': 'image',
        },
        signal: AbortSignal.timeout(10000)
      });
      if (!imageRes.ok) {
        res.writeHead(imageRes.status);
        res.end();
        return;
      }
      const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' });
      const buf = await imageRes.arrayBuffer();
      res.end(Buffer.from(buf));
    } catch (err) {
      console.error('Cover image error:', err.message);
      res.writeHead(500);
      res.end();
    }
    return;
  }

  // ── 1. Proxy Route for Manga Images ──
  if (pathname === '/proxy-image') {
    const imageUrl = parsedUrl.query.url;
    if (!imageUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing url parameter');
      return;
    }

    try {
      const imageRes = await fetch(imageUrl, {
        headers: {
          'Referer': 'https://weebcentral.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!imageRes.ok) {
        res.writeHead(imageRes.status, { 'Content-Type': 'text/plain' });
        res.end(`Failed to fetch image: ${imageRes.statusText}`);
        return;
      }

      const contentType = imageRes.headers.get('content-type') || 'image/png';
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' });
      
      const arrayBuffer = await imageRes.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error('Proxy error:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
    return;
  }

  // ── 2. Chapter Images API Route ──
  if (pathname === '/chapter-images') {
    const chNum = parseInt(parsedUrl.query.ch);
    if (isNaN(chNum) || chNum < 1 || chNum > 500) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing or invalid ch parameter' }));
      return;
    }

    try {
      const images = await getChapterImages(chNum);

      if (images.length === 0) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Could not load chapter images from any source' }));
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      });
      res.end(JSON.stringify({ chapter: chNum, images }));
    } catch (err) {
      console.error('Chapter images error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
    return;
  }

  // ── 3. Sitemap Route ──
  if (pathname === '/sitemap.xml') {
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost:8000';
    const siteUrl = `${proto}://${host}`;
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    // Home
    xml += `  <url>\n    <loc>${siteUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    // Chapters directory
    xml += `  <url>\n    <loc>${siteUrl}/chapters</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    
    // Chapters
    CHAPTERS_LIST.forEach(c => {
      xml += `  <url>\n    <loc>${siteUrl}/chapter/${c.number}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    });
    
    xml += `</urlset>`;
    
    res.writeHead(200, { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=86400' });
    res.end(xml);
    return;
  }

  // ── 4. Robots.txt Route ──
  if (pathname === '/robots.txt') {
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost:8000';
    const siteUrl = `${proto}://${host}`;
    
    let robots = `User-agent: *\n`;
    robots += `Allow: /\n`;
    robots += `Sitemap: ${siteUrl}/sitemap.xml\n`;
    
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=86400' });
    res.end(robots);
    return;
  }

  // ── 5. Clean URLs & SPA View Interceptors ──
  if (pathname === '/' || pathname === '/home') {
    serveIndexWithSeo(req, res, 'home');
    return;
  }
  
  if (pathname === '/chapters') {
    serveIndexWithSeo(req, res, 'chapters');
    return;
  }

  const chapterMatch = pathname.match(/^\/chapter\/(\d+)$/);
  if (chapterMatch) {
    const chNum = parseInt(chapterMatch[1]);
    if (!isNaN(chNum) && chNum >= 1 && chNum <= 412) {
      serveIndexWithSeo(req, res, 'chapter', chNum);
      return;
    }
  }

  if (pathname === '/privacy') {
    res.writeHead(301, { 'Location': '/privacy.html' });
    res.end();
    return;
  }
  if (pathname === '/terms') {
    res.writeHead(301, { 'Location': '/terms.html' });
    res.end();
    return;
  }
  if (pathname === '/dmca') {
    res.writeHead(301, { 'Location': '/dmca.html' });
    res.end();
    return;
  }
  if (pathname === '/disclaimer') {
    res.writeHead(301, { 'Location': '/disclaimer.html' });
    res.end();
    return;
  }

  // ── 6. Static File Server Route with SPA Fallback ──
  const relativePath = pathname.slice(1);
  const filePath = path.join(__dirname, relativePath);

  // Security: Check that resolved path is inside the directory
  const relative = path.relative(__dirname, filePath);
  const isSafe = relative && !relative.startsWith('..') && !path.isAbsolute(relative);

  if (!isSafe) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If asset is not found and doesn't look like a static asset with a file extension, fallback to SPA index.html
      const ext = path.extname(pathname);
      if (!ext) {
        serveIndexWithSeo(req, res, 'home');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
      return;
    }

    fs.readFile(filePath, (errRead, data) => {
      if (errRead) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`HxH Server running at http://localhost:${PORT}`);
  console.log(`[WeebCentral] Source configured: CDN + WeebCentral HTMX fallback`);
});
