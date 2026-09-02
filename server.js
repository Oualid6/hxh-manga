const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8000;

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
  413: '01KXBDRKSJZYPHMQTJXM0ZKWJT',
  414: '01KXXEHNVXQPERS32FGKBJS85A',
  415: '01KYFFANNT0M176C26WA90CBNP',
  416: '01KZ1G3PPKR0DZHFVCTFR6C4JF',
  417: '01KZKGWQBZC07FJNQTZ5SDDN2C',
  418: '01M0QJESKPWF6SJ3F0K2QXV88C',
  419: '01M19K7T1W4KRCW0PJMGWCBH4S',
};

// ── In-memory caches ──
const chapterImagesCache = {};
let fullChapterIdMap = null;
let fullChapterIdMapFetching = false;
let fullChapterIdMapCallbacks = [];

// ── Story Arc Data (for chapter-level SEO) ──
const ARCS = [
  { id: 1, name: "Hunter Exam Arc",          start: 1,   end: 38  },
  { id: 2, name: "Zoldyck Family Arc",        start: 39,  end: 43  },
  { id: 3, name: "Heavens Arena Arc",         start: 44,  end: 63  },
  { id: 4, name: "Yorknew City Arc",          start: 64,  end: 119 },
  { id: 5, name: "Greed Island Arc",          start: 120, end: 185 },
  { id: 6, name: "Chimera Ant Arc",           start: 186, end: 318 },
  { id: 7, name: "13th Chairman Election Arc",start: 319, end: 339 },
  { id: 8, name: "Dark Continent Expedition", start: 340, end: 348 },
  { id: 9, name: "Succession Contest Arc",    start: 349, end: 9999 },
];

// ── FAQ data (shared between schema and HTML) ──
const FAQ_ITEMS = [
  {
    q: "Where can I read Hunter x Hunter manga online?",
    a: "You can read Hunter x Hunter manga online for free at HXH Reader. All 412+ chapters are available in English, including the latest chapter, with high-quality scans and a clean reading interface."
  },
  {
    q: "Is Hunter x Hunter manga still ongoing?",
    a: "Yes, Hunter x Hunter is still ongoing. Written by Yoshihiro Togashi, the series resumed in 2022 after a long hiatus. As of 2026, the latest chapter is Chapter 412, continuing the Succession Contest Arc aboard the Black Whale ship."
  },
  {
    q: "What is the latest Hunter x Hunter chapter?",
    a: "The latest Hunter x Hunter chapter is Chapter 412. You can read it for free on HXH Reader. New chapters are added as soon as they are released by Yoshihiro Togashi in Weekly Shōnen Jump."
  },
  {
    q: "Can I read Hunter x Hunter in English for free?",
    a: "Yes! HXH Reader provides all Hunter x Hunter chapters in English for free. You can read from Chapter 1 all the way to the latest chapter without any registration or subscription."
  }
];

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

  while (pageNum <= MAX_PAGES) {
    const imgUrl = buildCdnUrl(host, chNum, pageNum);
    try {
      const res = await fetch(imgUrl, {
        method: 'HEAD',
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) break;
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
async function tryFetchFullChapterList() {
  const SERIES_ID = '01J76XY7EXQV9RE9KQ3JYE0WZ9';
  const map = { ...KNOWN_CHAPTER_IDS };
  let totalFetched = 0;

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
        keepFetching = false;
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

  const knownId = KNOWN_CHAPTER_IDS[chNum];
  if (knownId) {
    try {
      images = await fetchFromWeebCentral(knownId);
      console.log(`[WeebCentral] Got ${images.length} pages for ch${chNum} from WeebCentral`);
    } catch (e) {
      console.error(`[WeebCentral] Failed for ch${chNum}:`, e.message);
    }
  }

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
reloadChaptersFromDisk();

let lastChaptersJsMtime = 0;

/**
 * Reload CHAPTERS_LIST from disk and update KNOWN_CHAPTER_IDS in-memory.
 * Called by the sync scheduler after a new chapter is persisted.
 */
function reloadChaptersFromDisk() {
  try {
    const chaptersPath = path.join(__dirname, 'chapters.js');
    const fileContent  = fs.readFileSync(chaptersPath, 'utf8');
    const jsonMatch    = fileContent.match(/const\s+CHAPTERS\s*=\s*([\s\S]+?);?\s*$/);
    if (jsonMatch) {
      CHAPTERS_LIST = JSON.parse(jsonMatch[1]);
      console.log(`[SEO] Reloaded ${CHAPTERS_LIST.length} chapters from disk.`);
    }
    // Sync state ID map into KNOWN_CHAPTER_IDS
    try {
      const statePath = path.join(__dirname, 'sync', 'sync-state.json');
      if (fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        if (state.chapterIdMap) {
          Object.assign(KNOWN_CHAPTER_IDS, state.chapterIdMap);
        }
      }
    } catch (_) {}
  } catch (err) {
    console.error('[SEO] Failed to reload chapters.js:', err.message);
  }
}

function checkAndReloadChapters() {
  try {
    const chaptersPath = path.join(__dirname, 'chapters.js');
    const stat = fs.statSync(chaptersPath);
    if (stat.mtimeMs !== lastChaptersJsMtime) {
      lastChaptersJsMtime = stat.mtimeMs;
      reloadChaptersFromDisk();
    }
  } catch (_) {}
}

/**
 * Cache-refresh callback passed to the sync scheduler.
 * Invoked after each new chapter is saved to disk.
 *
 * @param {number}   chapterNumber
 * @param {string}   chapterId     — WeebCentral chapter ID
 * @param {string[]} images        — array of image URLs for the chapter
 */
function onNewChapterSaved(chapterNumber, chapterId, images) {
  // Update KNOWN_CHAPTER_IDS so subsequent /chapter-images requests hit the cache path
  KNOWN_CHAPTER_IDS[chapterNumber] = chapterId;

  // Pre-warm the image cache so the first reader request is instant
  if (images && images.length > 0) {
    chapterImagesCache[chapterNumber] = images;
    console.log(`[Sync] Cache pre-warmed for Ch.${chapterNumber} (${images.length} pages).`);
  }

  // Refresh the CHAPTERS_LIST used by the SEO renderer
  reloadChaptersFromDisk();
}

// ── Security & Cache Headers Helper ──
function addSecurityHeaders(res, extra = {}) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  for (const [k, v] of Object.entries(extra)) {
    res.setHeader(k, v);
  }
}

// ── Today's date for sitemap lastmod ──
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// ── Build BreadcrumbList schema ──
function buildBreadcrumb(siteUrl, items) {
  return {
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "item": `${siteUrl}${item.path}`
    }))
  };
}

// ── Build FAQPage schema ──
function buildFaqSchema() {
  return {
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a
      }
    }))
  };
}

// ═══════════════════════════════════════════════════════════════
// ── Multilingual SEO Translations (Server-Side Rendering) ──
// ═══════════════════════════════════════════════════════════════
const TRANSLATIONS = {
  EN: {
    seo_h1: "Hunter x Hunter Manga Online",
    seo_title_home: "Hunter x Hunter Manga Online — Read Free | HXH Reader",
    seo_title_chapters: "Read Hunter x Hunter Chapters Online — Full List | HXH Reader",
    seo_title_chapter: "Read HxH Chapter {ch}: {title} Online Free | HXH Reader",
    seo_desc_home: "Read Hunter x Hunter manga online for free. All 412+ chapters of Togashi's legendary series featuring Gon, Killua & Nen. Updated regularly.",
    seo_desc_chapters: "Browse all 412 Hunter x Hunter chapters online. From Chapter 1 to the latest, read free manga in English. Updated with new chapters.",
    seo_desc_chapter: "Read Hunter x Hunter Chapter {ch}: \"{title}\" online for free in English. Part of the {arc} Arc. High-quality scans.",
    breadcrumb_home: "Home",
    breadcrumb_chapters: "All Chapters",
    breadcrumb_chapter_prefix: "Chapter",
    faq_q1: "Where can I read Hunter x Hunter manga online?",
    faq_a1: "You can read Hunter x Hunter manga online for free right here on HXH Reader. All 412+ chapters are available in English with high-quality scans. No registration required.",
    faq_q2: "Is Hunter x Hunter manga still ongoing?",
    faq_a2: "Yes, Hunter x Hunter is still ongoing. Written by Yoshihiro Togashi, the series resumed in 2022. The latest chapter is Chapter 412, continuing the Succession Contest Arc aboard the Black Whale ship.",
    faq_q3: "What is the latest Hunter x Hunter chapter?",
    faq_a3: "The latest Hunter x Hunter chapter is Chapter 412. New chapters are added to HXH Reader as soon as they are released in Weekly Shōnen Jump.",
    faq_q4: "Can I read Hunter x Hunter in English for free?",
    faq_a4: "Yes! HXH Reader provides all Hunter x Hunter chapters in English for free, from Chapter 1 all the way to the latest chapter. No subscription needed.",
    faq_q5: "What are the main Hunter x Hunter story arcs?",
    faq_a5: "Hunter x Hunter has 9 major arcs: Hunter Exam (Ch.1–38), Zoldyck Family (Ch.39–43), Heavens Arena (Ch.44–63), Yorknew City (Ch.64–119), Greed Island (Ch.120–185), Chimera Ant (Ch.186–318), 13th Chairman Election (Ch.319–339), Dark Continent Expedition (Ch.340–348), and Succession Contest (Ch.349–412).",
    series_name: "Hunter × Hunter",
    author_name: "Yoshihiro Togashi"
  },
  ES: {
    seo_h1: "Hunter x Hunter Manga Online en Español",
    seo_title_home: "Hunter x Hunter Manga Online — Leer Gratis | HXH Reader",
    seo_title_chapters: "Leer Capítulos de Hunter x Hunter Online — Lista | HXH Reader",
    seo_title_chapter: "Leer HxH Capítulo {ch}: {title} Gratis Online | HXH Reader",
    seo_desc_home: "Lee el manga Hunter x Hunter online gratis. Todos los 412+ capítulos de la serie legendaria de Togashi con Gon, Killua y Nen. Actualizado regularmente.",
    seo_desc_chapters: "Explora los 412 capítulos de Hunter x Hunter online. Lee manga gratis en español desde el capítulo 1 hasta el último.",
    seo_desc_chapter: "Lee Hunter x Hunter Capítulo {ch}: \"{title}\" online gratis en español. Parte del Arco {arc}. Escaneos de alta calidad.",
    breadcrumb_home: "Inicio",
    breadcrumb_chapters: "Todos los Capítulos",
    breadcrumb_chapter_prefix: "Capítulo",
    faq_q1: "¿Dónde puedo leer el manga Hunter x Hunter online gratis?",
    faq_a1: "Puedes leer el manga Hunter x Hunter en línea de forma gratuita aquí en HXH Reader. Todos los 412+ capítulos están disponibles con escaneos de alta calidad.",
    faq_q2: "¿El manga de Hunter x Hunter sigue en emisión?",
    faq_a2: "Sí, Hunter x Hunter sigue en curso. El manga reanudó su publicación en 2022 tras una larga pausa. El capítulo más reciente es el Capítulo 412.",
    faq_q3: "¿Cuál es el último capítulo de Hunter x Hunter?",
    faq_a3: "El último capítulo publicado es el Capítulo 412. Las nuevas actualizaciones se añaden a HXH Reader inmediatamente tras su publicación oficial en Weekly Shōnen Jump.",
    faq_q4: "¿Puedo leer Hunter x Hunter en español de forma gratuita?",
    faq_a4: "¡Sí! En HXH Reader ofrecemos todos los capítulos de Hunter x Hunter en español gratis, desde el Capítulo 1 hasta el más reciente.",
    faq_q5: "¿Cuáles son los arcos argumentales de Hunter x Hunter?",
    faq_a5: "Hunter x Hunter consta de 9 arcos: Examen de Cazador (Cap.1-38), Familia Zoldyck (Cap.39-43), Coliseo del Cielo (Cap.44-63), Ciudad de Yorknew (Cap.64-119), Greed Island (Cap.120-185), Hormigas Quimera (Cap.186-318), Elección del 13° Presidente (Cap.319-339), Expedición al Continente Oscuro (Cap.340-348) y el Concurso de Sucesión (Cap.349-412).",
    series_name: "Hunter × Hunter",
    author_name: "Yoshihiro Togashi"
  },
  FR: {
    seo_h1: "Hunter x Hunter Manga en Ligne",
    seo_title_home: "Hunter x Hunter Manga en Ligne — Lire Gratuit | HXH Reader",
    seo_title_chapters: "Lire Chapitres Hunter x Hunter en Ligne — Liste | HXH Reader",
    seo_title_chapter: "Lire HxH Chapitre {ch}: {title} Gratuit En Ligne | HXH Reader",
    seo_desc_home: "Lisez le manga Hunter x Hunter en ligne gratuitement. Tous les 412+ chapitres de la série légendaire de Togashi avec Gon, Killua et Nen.",
    seo_desc_chapters: "Parcourez les 412 chapitres de Hunter x Hunter en ligne. Lisez le manga gratuit en français du chapitre 1 au dernier.",
    seo_desc_chapter: "Lisez Hunter x Hunter Chapitre {ch}: \"{title}\" en ligne gratuitement. Fait partie de l'Arc {arc}. Scans de haute qualité.",
    breadcrumb_home: "Accueil",
    breadcrumb_chapters: "Tous les Chapitres",
    breadcrumb_chapter_prefix: "Chapitre",
    faq_q1: "Où puis-je lire le manga Hunter x Hunter en ligne gratuitement ?",
    faq_a1: "Vous pouvez lire le manga Hunter x Hunter en ligne gratuitement directement sur HXH Reader. L'ensemble des 412+ chapitres est disponible en français.",
    faq_q2: "Le manga Hunter x Hunter est-il toujours en cours de parution ?",
    faq_a2: "Oui, Hunter x Hunter est toujours en cours. Après une longue pause, Yoshihiro Togashi a repris l'écriture en 2022. Le chapitre le plus récent est le Chapitre 412.",
    faq_q3: "Quel est le dernier chapitre de Hunter x Hunter ?",
    faq_a3: "Le dernier chapitre publié est le Chapitre 412. Les nouveaux chapitres sont ajoutés à HXH Reader dès leur sortie hebdomadaire dans Weekly Shōnen Jump.",
    faq_q4: "Puis-je lire Hunter x Hunter en français gratuitement ?",
    faq_a4: "Oui, vous pouvez lire tous les chapitres de Hunter x Hunter en français gratuitement sur HXH Reader, du premier chapitre au tout dernier.",
    faq_q5: "Quels sont les arcs principaux de Hunter x Hunter ?",
    faq_a5: "Hunter x Hunter compte 9 arcs : Examen de Hunter (Ch.1–38), Famille Zoldik (Ch.39–43), Tour Céleste (Ch.44–63), Yorknew City (Ch.64–119), Greed Island (Ch.120–185), Fourmis Chimères (Ch.186–318), Élection du 13e Président (Ch.319–339), Expédition du Continent Obscur (Ch.340–348), et la Succession Royale (Ch.349–412).",
    series_name: "Hunter × Hunter",
    author_name: "Yoshihiro Togashi"
  },
  DE: {
    seo_h1: "Hunter x Hunter Manga online lesen",
    seo_title_home: "Hunter x Hunter Manga Online Lesen — Kostenlos | HXH Reader",
    seo_title_chapters: "Hunter x Hunter Kapitel Online Lesen — Liste | HXH Reader",
    seo_title_chapter: "HxH Kapitel {ch}: {title} Kostenlos Online Lesen | HXH Reader",
    seo_desc_home: "Lies Hunter x Hunter Manga online kostenlos. Alle 412+ Kapitel von Togashis legendärer Serie mit Gon, Killua und Nen. Regelmäßige Updates.",
    seo_desc_chapters: "Durchstöbere alle 412 Hunter x Hunter Kapitel online. Lies kostenlose Mangas auf Deutsch von Kapitel 1 bis zum neuesten.",
    seo_desc_chapter: "Lies Hunter x Hunter Kapitel {ch}: \"{title}\" online kostenlos auf Deutsch. Teil des {arc} Arcs. Hochwertige Scans.",
    breadcrumb_home: "Startseite",
    breadcrumb_chapters: "Alle Kapitel",
    breadcrumb_chapter_prefix: "Kapitel",
    faq_q1: "Wo kann ich den Hunter x Hunter Manga online kostenlos lesen?",
    faq_a1: "Du kannst den Hunter x Hunter Manga online kostenlos hier auf HXH Reader lesen. Alle 412+ Kapitel sind in hervorragender Scan-Qualität verfügbar.",
    faq_q2: "Wird der Hunter x Hunter Manga noch fortgesetzt?",
    faq_a2: "Ja, Hunter x Hunter läuft noch. Die Serie wurde nach einer langen Pause im Jahr 2022 fortgesetzt. Das aktuellste Kapitel ist Kapitel 412.",
    faq_q3: "Was ist das neueste Kapitel von Hunter x Hunter?",
    faq_a3: "Das neueste Kapitel ist Kapitel 412. Neue Kapitel werden auf HXH Reader hochgeladen, sobald sie im Weekly Shōnen Jump erscheinen.",
    faq_q4: "Kann ich Hunter x Hunter kostenlos auf Deutsch lesen?",
    faq_a4: "Ja, alle Kapitel von Hunter x Hunter stehen dir kostenlos zur Verfügung, von Kapitel 1 bis zum neuesten Band.",
    faq_q5: "Welches sind die Haupt-Arcs in Hunter x Hunter?",
    faq_a5: "Hunter x Hunter besteht aus 9 Hauptabschnitten: Hunter-Prüfung (Kap.1-38), Zoldyck-Familie (Kap.39-43), Himmelsarena (Kap.44-63), Yorknew City (Kap.64-119), Greed Island (Kap.120-185), Chimera Ants (Kap.186-318), Wahl des 13. Vorsitzenden (Kap.319-339), Expedition zum Dunklen Kontinent (Kap.340-348) und dem Nachfolge-Wettbewerb (Kap.349-412).",
    series_name: "Hunter × Hunter",
    author_name: "Yoshihiro Togashi"
  },
  TR: {
    seo_h1: "Hunter x Hunter manga oku",
    seo_title_home: "Hunter x Hunter Manga Oku — Türkçe Online | HXH Reader",
    seo_title_chapters: "Hunter x Hunter Bölümleri Oku — Bölüm Listesi | HXH Reader",
    seo_title_chapter: "Hunter x Hunter Bölüm {ch}: {title} Türkçe Oku | HXH Reader",
    seo_desc_home: "Hunter x Hunter mangasını çevrimiçi ücretsiz oku. Gon, Killua ve Nen içeren Togashi'nin efsanevi serisinin tüm 412+ bölümü burada.",
    seo_desc_chapters: "Tüm 412 Hunter x Hunter bölümlerine göz atın. Bölüm 1'den en son bölüme kadar Türkçe Hunter x Hunter mangasını ücretsiz okuyun.",
    seo_desc_chapter: "Hunter x Hunter Bölüm {ch}: \"{title}\" Türkçe oku. {arc} Arkının bir parçasıdır. Yüksek kaliteli taramalar.",
    breadcrumb_home: "Ana Sayfa",
    breadcrumb_chapters: "Tüm Bölümler",
    breadcrumb_chapter_prefix: "Bölüm",
    faq_q1: "Hunter x Hunter mangasını çevrimiçi nereden ücretsiz okuyabilirim?",
    faq_a1: "Hunter x Hunter mangasını çevrimiçi olarak doğrudan HXH Reader'da ücretsiz okuyabilirsiniz. 412'den fazla bölümün tamamı yüksek kaliteli görseller eşliğinde sunulmaktadır.",
    faq_q2: "Hunter x Hunter mangası hala devam ediyor mu?",
    faq_a2: "Evet, Hunter x Hunter hala devam etmektedir. Seri, uzun bir aranın ardından 2022'de yayınlanmaya devam etti. En güncel bölüm 412. bölümdür.",
    faq_q3: "En son yayınlanan Hunter x Hunter bölümü hangisidir?",
    faq_a3: "Yayınlanan en son bölüm 412. bölümdür. Yeni bölümler Japonya'da Weekly Shōnen Jump'ta çıkar çıkmaz HXH Reader'a eklenmektedir.",
    faq_q4: "Hunter x Hunter mangasını Türkçe ücretsiz okuyabilir miyim?",
    faq_a4: "Evet! HXH Reader üzerinden tüm Hunter x Hunter bölümlerine ücretsiz erişebilirsiniz. Bölüm 1'den en son bölüme kadar mobil uyumlu okuyucumuzla okuyun.",
    faq_q5: "Hunter x Hunter'ın ana hikaye arkları nelerdir?",
    faq_a5: "Hunter x Hunter 9 ana arktan oluşur: Avcı Sınavı (1-38), Zoldyck Ailesi (39-43), Gökyüzü Arenası (44-63), Yorknew Şehri (64-119), Greed Island (120-185), Karınca Arkı (186-318), 13. Başkanlık Seçimi (319-339), Karanlık Kıta Seferi (340-348) ve Veraset Savaşı (349-412).",
    series_name: "Hunter × Hunter",
    author_name: "Yoshihiro Togashi"
  },
  JP: {
    seo_h1: "ハンターハンター 漫画",
    seo_title_home: "ハンターハンター 漫画 — オンラインで読む無料 | HXH Reader",
    seo_title_chapters: "ハンターハンター 最新話 — 全話一覧 | HXH Reader",
    seo_title_chapter: "ハンターハンター 第 {ch} 話: {title} 無料漫画 | HXH Reader",
    seo_desc_home: "ハンターハンターの漫画をオンラインで無料で読みましょう。冨樫義博の伝説的シリーズ、ゴンやキルア、念能力の全412話以上を掲載。最新話も更新中。",
    seo_desc_chapters: "ハンターハンターの全412話をオンラインで閲覧可能。第1話から最新話まで、日本語の漫画を無料で読めます。",
    seo_desc_chapter: "ハンターハンター 第 {ch} 話: 「{title}」の漫画をオンラインで無料閲覧。{arc}編。高画質スキャン画像。",
    breadcrumb_home: "ホーム",
    breadcrumb_chapters: "全話一覧",
    breadcrumb_chapter_prefix: "第",
    faq_q1: "ハンターハンターの漫画はどこで無料で読めますか？",
    faq_a1: "ハンターハンターの全話は、HXH Readerでいつでもオンラインで無料で読むことができます。会員登録や課金は一切不要で、高画質なスキャン画像を楽しめます。",
    faq_q2: "ハンターハンターの漫画はまだ連載中ですか？",
    faq_a2: "はい、HUNTER×HUNTERは現在も連載中です。現在の最新話は第412話（ブラックホエール号編）となっています。",
    faq_q3: "ハンターハンターの最新話はどれですか？",
    faq_a3: "現在の最新話は「第412話」です。少年ジャンプで新しい話が公開され次第、当サイトでも迅速にアップデートが適用されます。",
    faq_q4: "全エピソードを最初から最後まで日本語で読めますか？",
    faq_a4: "はい、第1話から最新話まで、すべてのエピソードを無料で読むことができます。スマートフォンにも完全対応しています。",
    faq_q5: "ハンターハンターの主なストーリー編は何ですか？",
    faq_a5: "主なストーリー編は、ハンター試験編（1-38話）、ゾルディック家編（39-43話）、天空闘技場編（44-63話）、ヨークシンシティ編（64-119話）、グリードアイランド編（120-185話）、キメラアント編（186-318話）、会長選挙編（319-339話）、暗黒大陸遠征編（340-348話）、王位継承戦編（349話以降）です。",
    series_name: "ハンター×ハンター",
    author_name: "冨樫義博"
  },
  AR: {
    seo_h1: "مانجا هانتر × هانتر",
    seo_title_home: "مانجا هانتر × هانتر مترجمة اون لاين — اقرأ مجاناً | HXH Reader",
    seo_title_chapters: "فصول مانجا هانتر × هانتر كاملة — قائمة الفصول | HXH Reader",
    seo_title_chapter: "اقرأ مانجا هانتر الفصل {ch}: {title} مترجم | HXH Reader",
    seo_desc_home: "اقرأ مانجا هانتر × هانتر مترجمة اون لاين مجاناً. جميع فصول Hunter x Hunter (412+ فصل) من تأليف يوشيهيرو توغاشي مع غون وكيلوا والنين.",
    seo_desc_chapters: "تصفح جميع فصول مانجا هانتر × هانتر (412 فصل) مترجمة اون لاين. اقرأ مانجا هانتر من الفصل الأول إلى الأخير مجاناً.",
    seo_desc_chapter: "اقرأ مانجا هانتر × هانتر الفصل {ch} مترجم: \"{title}\" اون لاين مجاناً. جزء من أرك {arc}. فصول عالية الجودة.",
    breadcrumb_home: "الرئيسية",
    breadcrumb_chapters: "جميع الفصول",
    breadcrumb_chapter_prefix: "الفصل",
    faq_q1: "أين يمكنني قراءة مانجا هانتر × هانتر مترجمة اون لاين مجاناً؟",
    faq_a1: "يمكنك قراءة مانجا هانتر × هانتر مترجمة مجاناً هنا على موقع HXH Reader. تتوفر الفصول الـ 412+ بجودة عالية وتصفح سريع بدون الحاجة للتسجيل.",
    faq_q2: "هل مانغا هانتر × هانتر لا تزال مستمرة؟",
    faq_a2: "نعم، مانجا هانتر × هانتر مستمرة ولم تنتهِ بعد. الفصل الأحدث هو الفصل 412 في أرك حرب الخلافة على متن سفينة الحوت الأسود.",
    faq_q3: "ما هو الفصل الأخير والجديد في هانتر؟",
    faq_a3: "الفصل الأخير المتوفر حالياً هو الفصل 412. يتم إضافة الفصول الجديدة فور صدورها وترجمتها مباشرة بعد النشر الرسمي في مجلة شونين جمب.",
    faq_q4: "هل يمكنني قراءة جميع الفصول باللغة العربية مجاناً؟",
    faq_a4: "نعم! يوفر لك موقعنا إمكانية قراءة جميع فصول هانتر × هانتر مجاناً، بدءاً من الفصل الأول وحتى الفصل 412.",
    faq_q5: "ما هي أركات هانتر × هانتر بترتيب الفصول؟",
    faq_a5: "تتكون السلسلة من 9 أركات: اختبار الصيادين (1-38)، عائلة زولديك (39-43)، برج القوة (44-63)، مدينة يوركنيو (64-119)، جزيرة الطمع (120-185)، نمل الكيميرا (186-318)، انتخاب رئيس الصيادين (319-339)، القارة المظلمة (340-348) وحرب الخلافة (349-412).",
    series_name: "هنتر × هنتر",
    author_name: "يوشيهيرو توغاشي"
  }
};

const ARC_TRANSLATIONS = {
  EN: { 1:"Hunter Exam Arc", 2:"Zoldyck Family Arc", 3:"Heavens Arena Arc", 4:"Yorknew City Arc", 5:"Greed Island Arc", 6:"Chimera Ant Arc", 7:"13th Chairman Election Arc", 8:"Dark Continent Expedition", 9:"Succession Contest Arc" },
  ES: { 1:"Arco del Examen del Cazador", 2:"Arco de la Familia Zoldyck", 3:"Arco del Coliseo del Cielo", 4:"Arco de Yorknew", 5:"Arco de Greed Island", 6:"Arco de las Hormigas Quimera", 7:"Arco de la Elección del 13° Presidente", 8:"Arco de la Expedición al Continente Oscuro", 9:"Arco del Concurso de Sucesión" },
  FR: { 1:"Arc de l'Examen de Hunter", 2:"Arc de la Famille Zoldik", 3:"Arc de la Tour Céleste", 4:"Arc de Yorknew City", 5:"Arc de Greed Island", 6:"Arc des Fourmis Chimères", 7:"Arc de l'Élection du 13e Président", 8:"Arc de l'Expédition du Continent Obscur", 9:"Arc de la Succession Royale" },
  DE: { 1:"Hunter-Prüfung Arc", 2:"Zoldyck-Familie Arc", 3:"Himmelsarena Arc", 4:"Yorknew City Arc", 5:"Greed Island Arc", 6:"Ameisen-Arc", 7:"13. Vorsitzendenwahl Arc", 8:"Dunkler Kontinent Expedition", 9:"Nachfolge-Wettbewerb Arc" },
  TR: { 1:"Avcı Sınavı Arkı", 2:"Zoldyck Ailesi Arkı", 3:"Gökyüzü Arenası Arkı", 4:"Yorknew Şehri Arkı", 5:"Greed Island Arkı", 6:"Karınca Arkı", 7:"13. Başkanlık Seçimi Arkı", 8:"Karanlık Kıta Seferi", 9:"Taht Veraseti Savaşı Arkı" },
  JP: { 1:"ハンター試験編", 2:"ゾルディック家編", 3:"天空闘技場編", 4:"ヨークシンシティ編", 5:"グリードアイランド編", 6:"キメラ＝アント編", 7:"会長選挙・アルカ編", 8:"暗黒大陸遠征編", 9:"王位継承戦編" },
  AR: { 1:"أرك اختبار الصيادين", 2:"أرك عائلة زولديك", 3:"أرك حلبة السماء", 4:"أرك مدينة يوركنيو", 5:"أرك جزيرة الطمع", 6:"أرك نمل الكيميرا", 7:"أرك انتخاب رئيس الصيادين", 8:"أرك القارة المظلمة", 9:"أرك حرب الخلافة" }
};

const SUPPORTED_LANGS = ['en', 'es', 'fr', 'de', 'tr', 'ja', 'ar'];
const LANG_MAP = { en: 'EN', es: 'ES', fr: 'FR', de: 'DE', tr: 'TR', ja: 'JP', ar: 'AR' };
const LOCALE_MAP = { en: 'en_US', es: 'es_ES', fr: 'fr_FR', de: 'de_DE', tr: 'tr_TR', ja: 'ja_JP', ar: 'ar_SA' };

function t(key, langCode) {
  const raw = (TRANSLATIONS[langCode] && TRANSLATIONS[langCode][key]) ||
              (TRANSLATIONS['EN'] && TRANSLATIONS['EN'][key]) || key;
  const latestNum = CHAPTERS_LIST.length > 0 ? CHAPTERS_LIST[CHAPTERS_LIST.length - 1].number : 419;
  const totalCount = CHAPTERS_LIST.length > 0 ? CHAPTERS_LIST.length : 419;
  return raw
    .replace(/\{ch\}/g, latestNum)
    .replace(/\{count\}/g, totalCount)
    .replace(/\b412\b/g, latestNum);
}

function getArcName(arcId, langCode) {
  return (ARC_TRANSLATIONS[langCode] && ARC_TRANSLATIONS[langCode][arcId]) ||
         (ARC_TRANSLATIONS['EN'] && ARC_TRANSLATIONS['EN'][arcId]) || '';
}

// ── Server-Side HTML Translation (translates data-i18n attributes) ──
function translateHtml(html, langCode) {
  if (langCode === 'EN') return html;

  // Update html lang and dir attributes
  html = html.replace(/<html([^>]*) lang="[^"]*"([^>]*)>/,
    `<html$1 lang="${langCode === 'JP' ? 'ja' : langCode.toLowerCase()}"$2>`);
  if (langCode === 'AR') {
    html = html.replace(/<html([^>]*)>/, '<html$1 dir="rtl">');
  }
  return html;
}

// ── Helper to detect absolute site URL (defaults to HTTPS in production) ──
function getSiteUrl(req) {
  let proto = req.headers['x-forwarded-proto'] || (req.socket && req.socket.encrypted ? 'https' : 'http');
  if (proto.includes(',')) proto = proto.split(',')[0].trim();
  const host = req.headers.host || 'localhost:8000';
  if (!host.includes('localhost') && !host.includes('127.0.0.1') && proto === 'http') {
    proto = 'https';
  }
  return `${proto}://${host}`;
}

// ── Serve 404 Error Page ──
function serve404(req, res, langCode = 'EN', langPrefix = 'en') {
  const siteUrl = getSiteUrl(req);
  const html = `<!DOCTYPE html>
<html lang="${langPrefix}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>404 Page Not Found | HXH Reader</title>
  <meta name="robots" content="noindex, follow" />
  <link rel="stylesheet" href="/style.css" />
</head>
<body style="background:#09090b;color:#f4f4f5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:1rem;">
  <div>
    <h1 style="font-size:5rem;font-weight:900;margin:0;color:#ef4444;">404</h1>
    <h2 style="font-size:1.5rem;margin:1rem 0;color:#ffffff;">Page Not Found</h2>
    <p style="color:#a1a1aa;margin-bottom:2rem;">The requested chapter or page does not exist.</p>
    <a href="/${langPrefix}/" style="display:inline-block;padding:0.75rem 1.5rem;background:#ef4444;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Return to Homepage</a>
  </div>
</body>
</html>`;
  addSecurityHeaders(res, { 'Cache-Control': 'no-store' });
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

// ── Serve Static HTML files with Absolute Canonical Tags ──
function serveStaticHtmlWithSeo(req, res, filePath, pathname) {
  fs.readFile(filePath, 'utf8', (err, html) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
    const siteUrl = getSiteUrl(req);
    const fullUrl = `${siteUrl}${pathname}`;
    let parsedHtml = html
      .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${fullUrl}" />`)
      .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${fullUrl}" />`);
    
    addSecurityHeaders(res, { 'Cache-Control': 'no-cache, must-revalidate' });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(parsedHtml);
  });
}

// ── Serve index.html with injected SEO metadata & SSR HTML content ──
function serveIndexWithSeo(req, res, pageType, param = null, langCode = 'EN', langPrefix = 'en') {
  checkAndReloadChapters();
  const indexPath = path.join(__dirname, 'index.html');
  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error: index.html not found');
      return;
    }

    const siteUrl = getSiteUrl(req);
    const coverUrl = `${siteUrl}/cover-image`;

    // Determine page-specific path and SEO content
    let pagePath = `/${langPrefix}/`;
    let title = t('seo_title_home', langCode);
    let desc  = t('seo_desc_home', langCode);
    let schema = {};

    if (pageType === 'chapters') {
      pagePath = `/${langPrefix}/chapters`;
      title = t('seo_title_chapters', langCode);
      desc  = t('seo_desc_chapters', langCode);
    } else if (pageType === 'chapter') {
      const chNum  = parseInt(param);
      const chData = CHAPTERS_LIST.find(c => c.number === chNum);
      const chTitle = chData ? chData.title : `Chapter ${chNum}`;
      const arc = ARCS.find(a => chNum >= a.start && chNum <= a.end);
      const arcName = arc ? getArcName(arc.id, langCode) : '';
      pagePath = `/${langPrefix}/chapter/${chNum}`;
      title = t('seo_title_chapter', langCode).replace('{ch}', chNum).replace('{title}', chTitle).replace('{arc}', arcName);
      desc  = t('seo_desc_chapter', langCode).replace('{ch}', chNum).replace('{title}', chTitle).replace('{arc}', arcName);
    }

    const pageUrl = `${siteUrl}${pagePath}`;

    // ── Build JSON-LD Schema ──
    const seriesName = t('series_name', langCode);
    const authorName = t('author_name', langCode);

    if (pageType === 'home') {
      schema = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": `${siteUrl}/#website`,
            "url": pageUrl,
            "name": `HXH Reader — ${t('seo_h1', langCode)}`,
            "description": desc,
            "inLanguage": langPrefix,
            "potentialAction": {
              "@type": "SearchAction",
              "target": { "@type": "EntryPoint", "urlTemplate": `${siteUrl}/${langPrefix}/chapters?search={search_term_string}` },
              "query-input": "required name=search_term_string"
            }
          },
          {
            "@type": "BookSeries",
            "name": seriesName,
            "author": { "@type": "Person", "name": authorName },
            "url": pageUrl,
            "genre": ["Action", "Adventure", "Fantasy", "Shounen"],
            "numberOfVolumes": "37",
            "inLanguage": langPrefix
          },
          {
            "@type": "BreadcrumbList",
            "itemListElement": [{ "@type": "ListItem", "position": 1, "name": t('breadcrumb_home', langCode), "item": pageUrl }]
          },
          {
            "@type": "FAQPage",
            "mainEntity": [1,2,3,4,5].map(i => ({
              "@type": "Question",
              "name": t(`faq_q${i}`, langCode),
              "acceptedAnswer": { "@type": "Answer", "text": t(`faq_a${i}`, langCode) }
            }))
          }
        ]
      };
    } else if (pageType === 'chapters') {
      schema = {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "CollectionPage", "name": title, "description": desc, "url": pageUrl, "inLanguage": langPrefix },
          {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": t('breadcrumb_home', langCode), "item": `${siteUrl}/${langPrefix}/` },
              { "@type": "ListItem", "position": 2, "name": t('breadcrumb_chapters', langCode), "item": pageUrl }
            ]
          }
        ]
      };
    } else if (pageType === 'chapter') {
      const chNum = parseInt(param);
      const chData = CHAPTERS_LIST.find(c => c.number === chNum);
      const chTitle = chData ? chData.title : `Chapter ${chNum}`;
      const prevNum = chNum > 1 ? chNum - 1 : null;
      const maxCh   = CHAPTERS_LIST.length > 0 ? CHAPTERS_LIST[CHAPTERS_LIST.length - 1].number : 419;
      const nextNum = chNum < maxCh ? chNum + 1 : null;
      const articleSchema = {
        "@type": "Article",
        "headline": title,
        "description": desc,
        "url": pageUrl,
        "image": coverUrl,
        "datePublished": "1998-03-03",
        "dateModified": todayISO(),
        "author": { "@type": "Person", "name": authorName },
        "publisher": { "@type": "Organization", "name": "HXH Reader", "url": siteUrl },
        "isPartOf": { "@type": "BookSeries", "name": seriesName, "url": siteUrl },
        "inLanguage": langPrefix
      };
      if (prevNum) articleSchema.previousWork = { "@type": "Article", "url": `${siteUrl}/${langPrefix}/chapter/${prevNum}` };
      if (nextNum) articleSchema.nextWork     = { "@type": "Article", "url": `${siteUrl}/${langPrefix}/chapter/${nextNum}` };

      schema = {
        "@context": "https://schema.org",
        "@graph": [
          articleSchema,
          {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": t('breadcrumb_home', langCode), "item": `${siteUrl}/${langPrefix}/` },
              { "@type": "ListItem", "position": 2, "name": t('breadcrumb_chapters', langCode), "item": `${siteUrl}/${langPrefix}/chapters` },
              { "@type": "ListItem", "position": 3, "name": `${t('breadcrumb_chapter_prefix', langCode)} ${chNum}: ${chTitle}`, "item": pageUrl }
            ]
          }
        ]
      };
    }

    // ── Build hreflang alternate links ──
    let subPath = '/';
    if (pageType === 'chapters') subPath = '/chapters';
    else if (pageType === 'chapter') subPath = `/chapter/${param}`;

    let alternatesHtml = '';
    SUPPORTED_LANGS.forEach(lc => {
      alternatesHtml += `  <link rel="alternate" hreflang="${lc}" href="${siteUrl}/${lc}${subPath === '/' ? '/' : subPath}" />\n`;
    });
    alternatesHtml += `  <link rel="alternate" hreflang="x-default" href="${siteUrl}/en${subPath === '/' ? '/' : subPath}" />\n`;

    // ── Inject __initialLang so client knows which language to load ──
    const langInitScript = `  <script>window.__initialLang='${langCode}';localStorage.setItem('hxh_lang','${langCode}');</script>\n`;

    const schemaString = JSON.stringify(schema, null, 2);
    const htmlLang = langCode === 'JP' ? 'ja' : langCode.toLowerCase();
    const htmlDir  = langCode === 'AR' ? ' dir="rtl"' : '';

    const latestNum = CHAPTERS_LIST.length > 0 ? CHAPTERS_LIST[CHAPTERS_LIST.length - 1].number : 419;
    const totalCount = CHAPTERS_LIST.length > 0 ? CHAPTERS_LIST.length : 419;

    let parsedHtml = html
      .replace(/<html([^>]*) lang="[^"]*"([^>]*)>/, `<html$1 lang="${htmlLang}"${htmlDir}$2>`)
      .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
      .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${desc.replace(/"/g, '&quot;')}" />`)
      .replace(/Ongoing · Chapter \d+/gi, `Ongoing · Chapter ${latestNum}`)
      .replace(/id="stat-chapters-count">\d+</gi, `id="stat-chapters-count">${totalCount}<`)
      .replace(/href="\/placeholder-canonical"/, `href="${siteUrl}${pagePath}"`)
      .replace(/content="\/placeholder-url"/, `content="${pageUrl}"`)
      .replace(/content="\/cover-image"/g, `content="${coverUrl}"`)
      .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />`)
      .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${desc.replace(/"/g, '&quot;')}" />`)
      .replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${pageUrl}" />`)
      .replace(/<meta property="og:locale" content=".*?" \/>/, `<meta property="og:locale" content="${LOCALE_MAP[langPrefix] || 'en_US'}" />`)
      .replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />`)
      .replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}" />`)
      .replace(/<script type="application\/ld\+json" id="structured-data">[\s\S]*?<\/script>/,
        `<script type="application/ld+json" id="structured-data">\n${schemaString}\n</script>`)
      .replace('</head>', `${alternatesHtml}${langInitScript}</head>`);

    // ── Inject SSR HTML body content for chapter & chapters views ──
    if (pageType === 'chapter') {
      const chNum = parseInt(param);
      const chData = CHAPTERS_LIST.find(c => c.number === chNum);
      const chTitle = chData ? chData.title : `Chapter ${chNum}`;
      const arc = ARCS.find(a => chNum >= a.start && chNum <= a.end);
      const arcName = arc ? getArcName(arc.id, langCode) : '';
      const prevNum = chNum > 1 ? chNum - 1 : null;
      const maxCh = CHAPTERS_LIST.length > 0 ? CHAPTERS_LIST[CHAPTERS_LIST.length - 1].number : 419;
      const nextNum = chNum < maxCh ? chNum + 1 : null;

      const ssrChapterHtml = `
      <article class="ssr-chapter-container" style="max-width:900px;margin:2rem auto;padding:1.5rem;background:rgba(24,24,27,0.9);border-radius:12px;color:#f4f4f5;border:1px solid #27272a;">
        <header style="margin-bottom:1.5rem;">
          <h1 style="font-size:2rem;font-weight:800;color:#ffffff;margin-bottom:0.5rem;">Hunter x Hunter Chapter ${chNum}: ${chTitle}</h1>
          ${arcName ? `<span style="display:inline-block;padding:0.25rem 0.75rem;background:#3f3f46;border-radius:9999px;font-size:0.85rem;color:#e4e4e7;font-weight:500;">${arcName}</span>` : ''}
        </header>
        <p style="font-size:1.05rem;line-height:1.6;color:#d4d4d8;margin-bottom:1.5rem;">
          Read Hunter x Hunter Chapter ${chNum} online free. Official manga release translated into ${langCode}. Follow Gon Freecss and Killua Zoldyck on their Hunter adventures.
        </p>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:center;margin-top:1rem;">
          ${prevNum ? `<a href="/${langPrefix}/chapter/${prevNum}" style="padding:0.6rem 1.2rem;background:#27272a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">‹ ${t('breadcrumb_chapter_prefix', langCode)} ${prevNum}</a>` : ''}
          <a href="/${langPrefix}/chapters" style="padding:0.6rem 1.2rem;background:#ef4444;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">${t('breadcrumb_chapters', langCode)}</a>
          ${nextNum ? `<a href="/${langPrefix}/chapter/${nextNum}" style="padding:0.6rem 1.2rem;background:#27272a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">${t('breadcrumb_chapter_prefix', langCode)} ${nextNum} ›</a>` : ''}
        </div>
      </article>`;

      parsedHtml = parsedHtml
        .replace('<main id="home-view">', '<main id="home-view" class="hidden">')
        .replace('<div id="reader-view" class="hidden">', `<div id="reader-view">\n${ssrChapterHtml}`);
    } else if (pageType === 'chapters') {
      const chaptersGridHtml = `
      <section class="ssr-chapters-container" style="max-width:1100px;margin:2rem auto;padding:1rem;">
        <h1 style="font-size:2rem;font-weight:800;color:#ffffff;margin-bottom:1rem;">Hunter x Hunter — All Manga Chapters</h1>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem;">
          ${CHAPTERS_LIST.map(c => `
            <a href="/${langPrefix}/chapter/${c.number}" style="display:block;padding:1rem;background:#18181b;border-radius:8px;text-decoration:none;color:#fff;border:1px solid #27272a;transition:border-color 0.2s;">
              <div style="font-weight:700;font-size:1.05rem;">Chapter ${c.number}: ${c.title}</div>
              <div style="font-size:0.85rem;color:#a1a1aa;margin-top:0.3rem;">Read Chapter ${c.number} Online</div>
            </a>
          `).join('')}
        </div>
      </section>`;

      parsedHtml = parsedHtml
        .replace('<main id="home-view">', '<main id="home-view" class="hidden">')
        .replace('<div id="chapter-list-view" class="hidden">', `<div id="chapter-list-view">\n${chaptersGridHtml}`);
    }

    addSecurityHeaders(res, { 'Cache-Control': 'no-store' });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(parsedHtml);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const rawPathname = parsedUrl.pathname;

  // 301 Redirect trailing slashes (e.g. /en/chapter/1/ -> /en/chapter/1) except root /
  if (rawPathname.length > 1 && rawPathname.endsWith('/')) {
    const cleanPath = rawPathname.slice(0, -1);
    res.writeHead(301, { 'Location': cleanPath });
    res.end();
    return;
  }

  let pathname = rawPathname;

  // ── Parse language prefix from URL ──
  let langCode   = 'EN';
  let langPrefix = 'en';
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && SUPPORTED_LANGS.includes(parts[0].toLowerCase())) {
    langPrefix = parts[0].toLowerCase();
    langCode   = LANG_MAP[langPrefix];
    parts.shift();
    pathname = '/' + parts.join('/');
    if (pathname === '') pathname = '/';
  }

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
      if (!imageRes.ok) { res.writeHead(imageRes.status); res.end(); return; }
      const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
      addSecurityHeaders(res, { 'Cache-Control': 'public, max-age=86400' });
      res.writeHead(200, { 'Content-Type': contentType });
      const buf = await imageRes.arrayBuffer();
      res.end(Buffer.from(buf));
    } catch (err) {
      console.error('Cover image error:', err.message);
      res.writeHead(500); res.end();
    }
    return;
  }

  // ── 1. Proxy Route ──
  if (pathname === '/proxy-image') {
    const imageUrl = parsedUrl.query.url;
    if (!imageUrl) { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('Missing url parameter'); return; }
    try {
      const imageRes = await fetch(imageUrl, {
        headers: { 'Referer': 'https://weebcentral.com/', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(15000)
      });
      if (!imageRes.ok) { res.writeHead(imageRes.status, { 'Content-Type': 'text/plain' }); res.end(`Failed: ${imageRes.statusText}`); return; }
      const contentType = imageRes.headers.get('content-type') || 'image/png';
      addSecurityHeaders(res, { 'Cache-Control': 'public, max-age=86400' });
      res.writeHead(200, { 'Content-Type': contentType });
      const arrayBuffer = await imageRes.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error('Proxy error:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
    return;
  }

  // ── 2. Chapter Images API ──
  if (pathname === '/chapter-images') {
    const chNum = parseInt(parsedUrl.query.ch);
    if (isNaN(chNum) || chNum < 1 || chNum > 500) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing or invalid ch parameter' }));
      return;
    }
    try {
      const images = await getChapterImages(chNum);
      if (images.length === 0) { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Could not load chapter images' })); return; }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' });
      res.end(JSON.stringify({ chapter: chNum, images }));
    } catch (err) {
      console.error('Chapter images error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
    return;
  }

  // ── 3. Sitemap ──
  if (pathname === '/sitemap.xml') {
    const siteUrl = getSiteUrl(req);
    const today   = todayISO();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

    SUPPORTED_LANGS.forEach(lp => {
      xml += `  <url>\n    <loc>${siteUrl}/${lp}/</loc>\n`;
      SUPPORTED_LANGS.forEach(altLp => {
        xml += `    <xhtml:link rel="alternate" hreflang="${altLp}" href="${siteUrl}/${altLp}/" />\n`;
      });
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}/en/" />\n`;
      xml += `    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    });

    SUPPORTED_LANGS.forEach(lp => {
      xml += `  <url>\n    <loc>${siteUrl}/${lp}/chapters</loc>\n`;
      SUPPORTED_LANGS.forEach(altLp => {
        xml += `    <xhtml:link rel="alternate" hreflang="${altLp}" href="${siteUrl}/${altLp}/chapters" />\n`;
      });
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}/en/chapters" />\n`;
      xml += `    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
    });

    CHAPTERS_LIST.forEach(c => {
      SUPPORTED_LANGS.forEach(lp => {
        xml += `  <url>\n    <loc>${siteUrl}/${lp}/chapter/${c.number}</loc>\n`;
        SUPPORTED_LANGS.forEach(altLp => {
          xml += `    <xhtml:link rel="alternate" hreflang="${altLp}" href="${siteUrl}/${altLp}/chapter/${c.number}" />\n`;
        });
        xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}/en/chapter/${c.number}" />\n`;
        xml += `    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
      });
    });

    const staticPages = [
      { path: '/privacy.html', priority: '0.3', freq: 'yearly' },
      { path: '/terms.html',   priority: '0.3', freq: 'yearly' },
      { path: '/dmca.html',    priority: '0.3', freq: 'yearly' },
      { path: '/disclaimer.html', priority: '0.3', freq: 'yearly' },
      { path: '/contact.html', priority: '0.4', freq: 'monthly' },
    ];
    staticPages.forEach(p => {
      xml += `  <url>\n    <loc>${siteUrl}${p.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.freq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
    });

    xml += '</urlset>';
    addSecurityHeaders(res, { 'Cache-Control': 'public, max-age=43200' });
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    res.end(xml);
    return;
  }

  // ── 4. Robots.txt ──
  if (pathname === '/robots.txt') {
    const siteUrl = getSiteUrl(req);
    const robots = [
      'User-agent: *', 'Allow: /',
      'Disallow: /proxy-image', 'Disallow: /chapter-images',
      '', `Sitemap: ${siteUrl}/sitemap.xml`
    ].join('\n');
    addSecurityHeaders(res, { 'Cache-Control': 'public, max-age=86400' });
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(robots);
    return;
  }

  // ── 5. Clean URLs, Trailing Slashes & Redirects ──
  if (pathname === '/index.html' || pathname === '/index' || pathname === '/home') {
    res.writeHead(301, { 'Location': `/${langPrefix}/` });
    res.end();
    return;
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    const cleanPath = pathname.slice(0, -1);
    const redirectUrl = `/${langPrefix}${cleanPath === '/' ? '/' : cleanPath}`;
    res.writeHead(301, { 'Location': redirectUrl });
    res.end();
    return;
  }

  if (pathname === '/' || pathname === '') {
    serveIndexWithSeo(req, res, 'home', null, langCode, langPrefix);
    return;
  }

  if (pathname === '/chapters') {
    serveIndexWithSeo(req, res, 'chapters', null, langCode, langPrefix);
    return;
  }

  if (pathname === '/about') {
    serveIndexWithSeo(req, res, 'home', null, langCode, langPrefix);
    return;
  }

  const chapterMatch = pathname.match(/^\/chapter\/(\d+)$/);
  if (chapterMatch) {
    const chNum = parseInt(chapterMatch[1]);
    const maxCh = CHAPTERS_LIST.length > 0 ? CHAPTERS_LIST[CHAPTERS_LIST.length - 1].number : 1000;
    if (!isNaN(chNum) && chNum >= 1 && chNum <= maxCh) {
      serveIndexWithSeo(req, res, 'chapter', chNum, langCode, langPrefix);
      return;
    } else {
      serve404(req, res, langCode, langPrefix);
      return;
    }
  }

  // ── 6. Legal page redirects ──
  const redirects = { '/privacy': '/privacy.html', '/terms': '/terms.html', '/dmca': '/dmca.html', '/disclaimer': '/disclaimer.html', '/contact': '/contact.html' };
  if (redirects[pathname]) {
    res.writeHead(301, { 'Location': redirects[pathname] });
    res.end();
    return;
  }

  // ── 7. Static File Server ──
  const relativePath = pathname.slice(1);
  const filePath     = path.join(__dirname, relativePath);
  const relative     = path.relative(__dirname, filePath);
  const isSafe       = relative && !relative.startsWith('..') && !path.isAbsolute(relative);

  if (!isSafe) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const ext = path.extname(pathname);
      if (!ext) {
        serve404(req, res, langCode, langPrefix);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.html') {
      serveStaticHtmlWithSeo(req, res, filePath, pathname);
      return;
    }

    fs.readFile(filePath, (errRead, data) => {
      if (errRead) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const isChaptersJs = pathname === '/chapters.js';
      const isImmutable  = !isChaptersJs && ['.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff2'].includes(ext);
      addSecurityHeaders(res, { 'Cache-Control': isImmutable ? 'public, max-age=86400' : 'no-cache, must-revalidate' });
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});


server.listen(PORT, () => {
  console.log(`HxH Server running at http://localhost:${PORT}`);
  console.log(`[WeebCentral] Source configured: CDN + WeebCentral HTMX fallback`);

  // Start the automatic 24-hour chapter sync scheduler.
  // Runs in the background; never blocks the HTTP server.
  const { startSyncScheduler } = require('./sync/chapter-sync');
  startSyncScheduler(onNewChapterSaved);
});
