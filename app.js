/* ═══════════════════════════════════════════
   HUNTER × HUNTER — MANGA WEBSITE CORE LOGIC
   ═══════════════════════════════════════════ */

// ── Story Arcs Configuration ──
const ARCS = [
  {
    id: 1,
    name: "Hunter Exam Arc",
    range: "Chapters 1 – 38",
    start: 1,
    end: 38,
    desc: "Gon leaves his home island to take the grueling Hunter Exam, making lifelong friends Killua, Kurapika, and Leorio while facing deadly trials.",
    color: "#FDD835" // Yellow Gold
  },
  {
    id: 2,
    name: "Zoldyck Family Arc",
    range: "Chapters 39 – 43",
    start: 39,
    end: 43,
    desc: "Gon, Kurapika, and Leorio travel to Kukuroo Mountain to rescue Killua from his family of elite assassins.",
    color: "#42A5F5" // Sky Blue
  },
  {
    id: 3,
    name: "Heavens Arena Arc",
    range: "Chapters 44 – 63",
    start: 44,
    end: 63,
    desc: "Gon and Killua train at the tower of martial arts, where they learn the mysterious power of Nen from master Wing.",
    color: "#7ED321" // Lime Green
  },
  {
    id: 4,
    name: "Yorknew City Arc",
    range: "Chapters 64 – 119",
    start: 64,
    end: 119,
    desc: "The protagonists reunite in Yorknew City, where Kurapika seeks vengeance against the Phantom Troupe who slaughtered his clan.",
    color: "#E53935" // Crimson Red
  },
  {
    id: 5,
    name: "Greed Island Arc",
    range: "Chapters 120 – 185",
    start: 120,
    end: 185,
    desc: "Gon and Killua enter a legendary, dangerous Nen-based video game created by Gon's father, training under Biscuit Krueger.",
    color: "#7ED321" // Lime Green
  },
  {
    id: 6,
    name: "Chimera Ant Arc",
    range: "Chapters 186 – 318",
    start: 186,
    end: 318,
    desc: "A dark and legendary saga where humanity faces an existential threat from mutant insects, forcing the Hunters into a brutal war.",
    color: "#E53935" // Crimson Red
  },
  {
    id: 7,
    name: "13th Chairman Election Arc",
    range: "Chapters 319 – 339",
    start: 319,
    end: 339,
    desc: "As Netero's successor is chosen through complex political maneuverings, Killua seeks to heal a hospitalized Gon using Alluka's power.",
    color: "#FDD835" // Yellow Gold
  },
  {
    id: 8,
    name: "Dark Continent Expedition",
    range: "Chapters 340 – 348",
    start: 340,
    end: 348,
    desc: "Beyond the known world lies a hostile frontier of unimaginable horrors and riches, prompting the world's powers to assemble.",
    color: "#42A5F5" // Sky Blue
  },
  {
    id: 9,
    name: "Succession Contest Arc",
    range: "Chapters 349 – 419",
    start: 349,
    end: 9999,
    desc: "A deadly battle royale unfolds aboard the Black Whale ship as the Kakin princes fight to the death for the throne using Nen beasts.",
    color: "#E53935" // Crimson Red
  }
];

// ── Application State ──
let currentState = {
  currentView: 'home', // 'home', 'chapters', 'reader'
  currentChapter: 1,
  sortNewestFirst: true,
  searchQuery: '',
  currentLang: 'EN'
};

// ── DOM Elements ──
const homeView = document.getElementById('home-view');
const chapterListView = document.getElementById('chapter-list-view');
const readerView = document.getElementById('reader-view');

const navHome = document.getElementById('nav-home');
const navChapters = document.getElementById('nav-chapters');
const mobileMenu = document.getElementById('mobile-menu');

const arcsGrid = document.getElementById('arcs-grid');
const recentGrid = document.getElementById('recent-grid');
const clTbody = document.getElementById('cl-tbody');

const readerTitle = document.getElementById('reader-title');
const readerChIndicator = document.getElementById('reader-ch-indicator');
const readerChapterInfo = document.getElementById('reader-chapter-info');
const readerPages = document.getElementById('reader-pages');

const prevChBtn = document.getElementById('prev-ch-btn');
const nextChBtn = document.getElementById('next-ch-btn');
const prevChBtn2 = document.getElementById('prev-ch-btn2');
const nextChBtn2 = document.getElementById('next-ch-btn2');

const scrollTopBtn = document.getElementById('scroll-top-btn');

// ── Initial Setup ──
document.addEventListener('DOMContentLoaded', () => {
  renderArcs();
  renderRecentChapters();
  renderPopularChapters();
  renderChapterTable();
  setupParticles();
  setupScrollHandlers();
  initLang(); // Restore persisted language
  updateDynamicUi();
  
  // Close mobile menu when clicking any link inside it
  const mobMenu = document.getElementById('mobile-menu');
  if (mobMenu) {
    mobMenu.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        toggleMobileMenu();
      }
    });
  }

  // Close lang dropdown on outside click
  document.addEventListener('click', (e) => {
    const sw = document.getElementById('lang-switcher');
    if (sw && !sw.contains(e.target)) closeLangMenu();
  });
  
  // Handle legacy hash URLs (e.g. /#/chapter/100 → /chapter/100)
  if (window.location.hash && window.location.hash.startsWith('#/')) {
    const legacyPath = window.location.hash.slice(1); // '#/chapter/100' → '/chapter/100'
    history.replaceState(null, '', legacyPath);
  }

  // Parse initial route from pathname
  handleRoute();
  window.addEventListener('popstate', handleRoute);
});

// ── SPA Navigation Helper (History API) ──
/**
 * Navigate to a pathname-based SPA route without a full page reload.
 * Uses history.pushState so the URL is real and bookmarkable.
 */
function navigateTo(path, pushState = true) {
  if (pushState && window.location.pathname !== path) {
    history.pushState(null, '', path);
  }
  handleRoute();
}

// ── Intercept all in-page SPA link clicks ──
// Any <a href> that starts with / and is NOT a file extension or external
// link gets handled by the SPA router instead of causing a full reload.
document.addEventListener('click', (e) => {
  const anchor = e.target.closest('a[href]');
  if (!anchor) return;
  const href = anchor.getAttribute('href');
  if (!href) return;
  // Only intercept relative SPA paths (no protocol, no file extension like .html)
  const isSpaPath = href.startsWith('/') && !href.match(/\.[a-z]+$/i) && !href.startsWith('//');
  if (!isSpaPath) return;
  e.preventDefault();
  navigateTo(href);
});

// ── Pathname-Based Router ──
function handleRoute() {
  let pathname = window.location.pathname;

  // Strip language prefix (e.g. /es/chapter/100 → /chapter/100)
  const SUPPORTED_LANGS = ['en', 'es', 'fr', 'de', 'tr', 'ja', 'ar'];
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && SUPPORTED_LANGS.includes(parts[0].toLowerCase())) {
    parts.shift();
    pathname = '/' + parts.join('/') || '/';
  }

  if (pathname.startsWith('/chapter/')) {
    const chNum = parseInt(pathname.split('/').pop());
    const maxCh = CHAPTERS.length > 0 ? CHAPTERS[CHAPTERS.length - 1].number : 1000;
    if (!isNaN(chNum) && chNum >= 1 && chNum <= maxCh) {
      readChapter(chNum, false);
      return;
    }
  } else if (pathname === '/chapters') {
    showChapterList(false);
    return;
  } else if (pathname === '/about' || window.location.hash === '#about-section') {
    showHome(false);
    setTimeout(() => {
      const el = document.getElementById('about-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return;
  }

  showHome(false);
}

// ── Update the browser URL (no full reload) ──
function updateRoute() {
  let path;
  if (currentState.currentView === 'reader') {
    path = `/chapter/${currentState.currentChapter}`;
  } else if (currentState.currentView === 'chapters') {
    path = '/chapters';
  } else {
    path = '/';
  }
  if (window.location.pathname !== path) {
    history.pushState(null, '', path);
  }
}

// ── View Management ──
function showHome(updateHash = true) {
  currentState.currentView = 'home';
  homeView.classList.remove('hidden');
  chapterListView.classList.add('hidden');
  readerView.classList.add('hidden');

  navHome.classList.add('active');
  navChapters.classList.remove('active');

  // Don't scroll when just scrolling to the about section
  if (window.location.hash !== '#about-section') {
    window.scrollTo({ top: 0 });
  }
  if (updateHash) updateRoute();
  updateClientSeo();
  trackPageView('/', document.title);
}

function showChapterList(updateHash = true) {
  currentState.currentView = 'chapters';
  homeView.classList.add('hidden');
  chapterListView.classList.remove('hidden');
  readerView.classList.add('hidden');

  navHome.classList.remove('active');
  navChapters.classList.add('active');

  window.scrollTo({ top: 0 });
  if (updateHash) updateRoute();
  renderChapterTable();
  updateClientSeo();
  trackPageView('/chapters', document.title);
}

function goBackFromReader() {
  showChapterList();
}

// ── Particle Background Effect ──
function setupParticles() {
  const container = document.getElementById('hero-particles');
  if (!container) return;
  
  const particleCount = 20;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random styling
    const size = Math.random() * 6 + 2;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    
    // New palette glow colors
    const colors = ['rgba(253,216,53,0.5)', 'rgba(126,211,33,0.5)', 'rgba(66,165,245,0.5)'];
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.boxShadow = `0 0 10px ${particle.style.backgroundColor}`;
    
    // Animation details
    particle.style.animationDuration = `${Math.random() * 15 + 10}s`;
    particle.style.animationDelay = `${Math.random() * 10}s`;
    
    container.appendChild(particle);
  }
}

// ── Scroll Behaviors ──
function setupScrollHandlers() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    // Navbar styling on scroll
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Scroll to top button visibility
    if (window.scrollY > 500) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  }, { passive: true });
}

// ── Mobile Menu ──
function toggleMobileMenu() {
  mobileMenu.classList.toggle('open');
}

// ── Render Homepage Content ──
function renderArcs() {
  arcsGrid.innerHTML = '';
  const lang = currentState.currentLang || 'EN';
  ARCS.forEach(arc => {
    const card = document.createElement('div');
    card.className = 'arc-card animate-in';
    card.setAttribute('role', 'listitem');
    card.style.setProperty('--border-glow', arc.color);
    card.style.borderTop = `3px solid ${arc.color}`;
    
    card.onclick = () => {
      navigateTo('/chapters');
      setTimeout(() => {
        const searchInput = document.getElementById('cl-search');
        if (searchInput) {
          searchInput.value = `${t('arc_word')} ${arc.id}`;
          filterChapters(searchInput.value);
        }
      }, 50);
    };

    const arcTrans = (ARC_TRANSLATIONS[lang] && ARC_TRANSLATIONS[lang][arc.id]) || { name: arc.name, desc: arc.desc };
    const rangeText = arc.range.replace('Chapters', t('stats_chapters'));

    card.innerHTML = `
      <div class="arc-num" style="color: ${arc.color}">${t('arc_word')} ${arc.id}</div>
      <h3 class="arc-name">${arcTrans.name}</h3>
      <div class="arc-range">${rangeText}</div>
      <p class="arc-desc">${arcTrans.desc}</p>
      <div class="arc-read-btn" style="background: ${arc.color}15; color: ${arc.color}">
        ${t('read_arc')}
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </div>
    `;
    arcsGrid.appendChild(card);
  });
}

// ── Render Popular Chapters (internal linking / SEO) ──
function renderPopularChapters() {
  const grid = document.getElementById('popular-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const latestCh = CHAPTERS.length > 0 ? CHAPTERS[CHAPTERS.length - 1] : { number: 419, title: 'Chapter 419' };
  const popular = [
    { number: 1,   label: 'Chapter 1',   desc: 'The Day of Departure — where it all begins' },
    { number: 38,  label: 'Chapter 38',  desc: 'Hunter Exam finale — Gon passes' },
    { number: 64,  label: 'Chapter 64',  desc: 'Yorknew City Arc begins' },
    { number: 186, label: 'Chapter 186', desc: 'Chimera Ant Arc — the legendary saga starts' },
    { number: 319, label: 'Chapter 319', desc: '13th Chairman Election Arc begins' },
    { number: 349, label: 'Chapter 349', desc: 'Succession Contest Arc — aboard Black Whale' },
    { number: 400, label: 'Chapter 400', desc: 'Recent milestone chapter' },
    { number: latestCh.number, label: `Chapter ${latestCh.number}`, desc: 'Latest chapter — read now' },
  ];

  popular.forEach(item => {
    const ch = CHAPTERS.find(c => c.number === item.number);
    const card = document.createElement('div');
    card.className = 'popular-card animate-in';
    card.setAttribute('role', 'listitem');
    card.onclick = () => { navigateTo(`/chapter/${item.number}`); };
    card.innerHTML = `
      <div class="popular-ch-num">Ch. ${item.number}</div>
      <div class="popular-ch-title">${ch ? ch.title : item.label}</div>
      <div class="popular-ch-desc">${item.desc}</div>
    `;
    grid.appendChild(card);
  });
}

function renderRecentChapters() {
  recentGrid.innerHTML = '';
  // Show the last 6 chapters
  const recent = CHAPTERS.slice(-6).reverse();
  recent.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'recent-card animate-in';
    card.onclick = () => {
      navigateTo(`/chapter/${ch.number}`);
    };

    card.innerHTML = `
      <div class="recent-ch-num">${formatChapterNumber(ch.number)}</div>
      <div class="recent-ch-title">${ch.title}</div>
      <div class="recent-ch-date">${t('latest_release')}</div>
      <div class="recent-read-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </div>
    `;
    recentGrid.appendChild(card);
  });
}

// ── Render Chapter Table (List view) ──
function renderChapterTable() {
  clTbody.innerHTML = '';
  
  // Apply filtering
  let filtered = CHAPTERS;
  const q = currentState.searchQuery.trim().toLowerCase();
  
  if (q) {
    // Check if the query is an Arc filter (supports multilingual keywords like Arco, Bogen, Ark, 編)
    const arcMatch = q.match(/^(arc|arco|bogen|ark|編|أرك)\s+(\d+)$/i) || q.match(/^(\d+)\s*(編|arc)$/i);
    if (arcMatch) {
      const arcId = parseInt(arcMatch[1]) || parseInt(arcMatch[2]);
      const arc = ARCS.find(a => a.id === arcId);
      if (arc) {
        filtered = CHAPTERS.filter(ch => ch.number >= arc.start && ch.number <= arc.end);
      }
    } else {
      // Normal search
      filtered = CHAPTERS.filter(ch => 
        ch.number.toString() === q || 
        ch.title.toLowerCase().includes(q)
      );
    }
  }

  // Sort
  if (currentState.sortNewestFirst) {
    filtered = [...filtered].reverse();
  }

  if (filtered.length === 0) {
    const errorText = t('no_results').replace('{query}', currentState.searchQuery);
    clTbody.innerHTML = `<tr><td colspan="4" class="no-results">${errorText}</td></tr>`;
    return;
  }

  filtered.forEach(ch => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${ch.number}</td>
      <td class="ch-title-cell"><a href="/chapter/${ch.number}">${ch.title}</a></td>
      <td class="ch-date-cell hide-mobile">${t('released_label')}</td>
      <td>
        <a href="/chapter/${ch.number}" class="ch-read-btn" aria-label="${t('read_chapter')} ${ch.number}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </a>
      </td>
    `;
    clTbody.appendChild(tr);
  });
}

// ── Filtering and Search ──
function filterChapters(val) {
  currentState.searchQuery = val;
  // Keep both search inputs in sync
  const headerSearch = document.getElementById('chapter-search');
  const mainSearch = document.getElementById('cl-search');
  
  if (headerSearch && headerSearch.value !== val) headerSearch.value = val;
  if (mainSearch && mainSearch.value !== val) mainSearch.value = val;

  if (currentState.currentView !== 'chapters') {
    showChapterList();
  } else {
    renderChapterTable();
  }
}

// ── Sorting ──
function toggleSort() {
  currentState.sortNewestFirst = !currentState.sortNewestFirst;
  const label = document.getElementById('sort-label');
  if (label) {
    label.textContent = currentState.sortNewestFirst ? t('sort_newest') : t('sort_oldest');
  }
  renderChapterTable();
}

// ── Reader View & Dynamic Page Loader ──
function readChapter(chNum, updateHash = true) {
  currentState.currentView = 'reader';
  currentState.currentChapter = chNum;

  // Toggle visible containers
  homeView.classList.add('hidden');
  chapterListView.classList.add('hidden');
  readerView.classList.remove('hidden');

  window.scrollTo({ top: 0 });
  if (updateHash) updateRoute();

  // Find chapter details
  const chData = CHAPTERS.find(c => c.number === chNum);
  const titleText = chData ? `${formatChapterNumber(chNum)} — ${chData.title}` : `${t('chapter_word')} ${chNum}`;
  readerTitle.textContent = titleText;
  
  const newTitle = chData
    ? `Read HxH Chapter ${chNum}: ${chData.title} Online Free | HXH Reader`
    : `Hunter x Hunter Chapter ${chNum} | HXH Reader`;
  document.title = newTitle;
  trackPageView(`/chapter/${chNum}`, newTitle);
  


  // Update header/navigation UI details
  readerChIndicator.textContent = `${chNum} / ${CHAPTERS.length}`;
  
  // Set prev/next buttons disabled states
  prevChBtn.disabled = chNum <= 1;
  prevChBtn2.disabled = chNum <= 1;
  nextChBtn.disabled = chNum >= CHAPTERS.length;
  nextChBtn2.disabled = chNum >= CHAPTERS.length;

  // Load Arc association info
  const arc = ARCS.find(a => chNum >= a.start && chNum <= a.end);
  const lang = currentState.currentLang || 'EN';
  const translatedArc = ARC_TRANSLATIONS[lang] ? ARC_TRANSLATIONS[lang][arc.id] : null;
  const arcName = translatedArc ? translatedArc.name : (arc ? arc.name : '');
  
  // Chapter info block with SEO intro paragraph (uses i18n)
  readerChapterInfo.innerHTML = `
    <h2>${titleText}</h2>
    ${arc ? `<p class="reader-arc-label" style="color: ${arc.color}">${arcName}</p>` : ''}
    <p class="reader-intro-text">${t('read_chapter_prefix')} <strong>${titleText}</strong>.${arc ? ' ' + t('read_arc_prefix') + ' <strong>' + arcName + '</strong>.' : ''} ${t('read_nav_hint')}</p>
  `;

  // Update breadcrumb
  const bcCurrent = document.getElementById('reader-breadcrumb-current');
  if (bcCurrent) bcCurrent.textContent = `${t('breadcrumb_chapter_prefix')} ${chNum}${chData ? ': ' + chData.title : ''}`;

  // Update SEO meta tags for this chapter
  updateClientSeo();
  trackPageView(`/chapter/${chNum}`, document.title);

  // Start reading images — fetch all page URLs from the server first
  readerPages.innerHTML = '';
  const suggestedSection = document.getElementById('suggested-section');
  if (suggestedSection) suggestedSection.innerHTML = '';
  loadChapterPages(chNum);
}

async function loadChapterPages(chNum) {
  // Guard: user may have navigated away
  if (currentState.currentView !== 'reader' || currentState.currentChapter !== chNum) return;

  // Show a loading placeholder while we fetch the page list
  const loadingMsg = document.createElement('div');
  loadingMsg.className = 'no-results animate-in';
  loadingMsg.id = 'chapter-loading-msg';
  
  const loadingText = t('loading_pages').replace('{ch}', chNum);
  loadingMsg.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" style="margin-bottom:12px; animation: spin 1.2s linear infinite;">
      <circle cx="12" cy="12" r="10" stroke-dasharray="31.4" stroke-dashoffset="10"/>
    </svg>
    <p>${loadingText}</p>
  `;
  readerPages.appendChild(loadingMsg);

  let images = [];
  try {
    const res = await fetch(`/chapter-images?ch=${chNum}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    images = data.images || [];
  } catch (err) {
    console.error('Failed to load chapter images:', err);
  }

  // Guard again after async
  if (currentState.currentView !== 'reader' || currentState.currentChapter !== chNum) return;

  // Remove loading placeholder
  const msg = document.getElementById('chapter-loading-msg');
  if (msg) msg.remove();

  if (images.length === 0) {
    const errMsg = document.createElement('div');
    errMsg.className = 'no-results animate-in';
    errMsg.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5" style="margin-bottom: 12px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p>This chapter is currently unavailable from WeebCentral.</p>
      <p style="font-size: 0.85rem; margin-top: 8px;">Please try another chapter or try again later.</p>
    `;
    readerPages.appendChild(errMsg);
    return;
  }

  // Render all pages with lazy loading and descriptive alt text
  const chData = CHAPTERS.find(c => c.number === chNum);
  const chTitleText = chData ? chData.title : `Chapter ${chNum}`;

  images.forEach((rawUrl, idx) => {
    const pageContainer = document.createElement('div');
    pageContainer.className = 'reader-page-container';

    const skeleton = document.createElement('div');
    skeleton.className = 'page-skeleton';
    pageContainer.appendChild(skeleton);

    const img = document.createElement('img');
    img.className = 'reader-page-img';
    // Descriptive, keyword-rich alt text for image SEO
    img.alt = `Hunter x Hunter Chapter ${chNum}: "${chTitleText}" — Page ${idx + 1}`;
    img.decoding = 'async';

    const proxiedUrl = `/proxy-image?url=${encodeURIComponent(rawUrl)}`;

    const handleLoadSuccess = () => {
      if (skeleton.parentNode) {
        skeleton.remove();
      }
      img.classList.add('loaded');
    };

    img.onload = handleLoadSuccess;

    img.onerror = () => {
      if (skeleton.parentNode) {
        skeleton.remove();
      }
      img.style.display = 'none';

      const errorCard = document.createElement('div');
      errorCard.className = 'page-error-card';
      errorCard.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>Failed to load Page ${idx + 1}</p>
        <button class="btn-retry-page">Retry Page ${idx + 1}</button>
      `;
      const retryBtn = errorCard.querySelector('.btn-retry-page');
      retryBtn.onclick = () => {
        errorCard.remove();
        pageContainer.appendChild(skeleton);
        img.style.display = '';
        img.src = `${proxiedUrl}&t=${Date.now()}`;
      };
      pageContainer.appendChild(errorCard);
    };

    // Assign src after handlers registered
    img.src = proxiedUrl;

    // Handle cached images that load immediately before handler binding
    if (img.complete && img.naturalWidth > 0) {
      handleLoadSuccess();
    }

    pageContainer.appendChild(img);
    readerPages.appendChild(pageContainer);
  });

  // After images are rendered, show suggested chapters
  renderSuggestedChapters(chNum);
}

function navigateChapter(direction) {
  const targetCh = currentState.currentChapter + direction;
  if (targetCh >= 1 && targetCh <= CHAPTERS.length) {
    navigateTo(`/chapter/${targetCh}`);
  }
}

// ── Render Suggested Chapters in reader (internal linking) ──
function renderSuggestedChapters(chNum) {
  const section = document.getElementById('suggested-section');
  if (!section) return;

  const arc = ARCS.find(a => chNum >= a.start && chNum <= a.end);
  const lang = currentState.currentLang || 'EN';
  const arcTrans = arc && ARC_TRANSLATIONS[lang] ? ARC_TRANSLATIONS[lang][arc.id] : null;
  const arcName = arcTrans ? arcTrans.name : (arc ? arc.name : '');

  // Build suggestion list: prev, next + up to 3 chapters in same arc
  const suggestions = [];

  const prevNum = chNum > 1 ? chNum - 1 : null;
  const nextNum = chNum < CHAPTERS.length ? chNum + 1 : null;

  if (prevNum) {
    const prev = CHAPTERS.find(c => c.number === prevNum);
    suggestions.push({ number: prevNum, title: prev ? prev.title : `Chapter ${prevNum}`, label: 'Previous Chapter' });
  }
  if (nextNum) {
    const next = CHAPTERS.find(c => c.number === nextNum);
    suggestions.push({ number: nextNum, title: next ? next.title : `Chapter ${nextNum}`, label: 'Next Chapter' });
  }

  // Add arc-adjacent chapters (skip already added)
  if (arc) {
    const arcChapters = CHAPTERS.filter(c => c.number >= arc.start && c.number <= arc.end && c.number !== chNum && c.number !== prevNum && c.number !== nextNum);
    // Shuffle and take up to 3
    const shuffled = arcChapters.sort(() => Math.random() - 0.5).slice(0, 3);
    shuffled.forEach(c => suggestions.push({ number: c.number, title: c.title, label: `Ch. ${c.number}` }));
  }

  if (suggestions.length === 0) return;

  section.innerHTML = `
    <div class="suggested-header">
      <h3>More from ${arcName || 'Hunter x Hunter'}</h3>
      <p>Continue reading Hunter x Hunter — explore related chapters</p>
    </div>
    <div class="suggested-grid">
      ${suggestions.map(s => `
        <a href="/chapter/${s.number}" class="suggested-card" aria-label="Read Hunter x Hunter Chapter ${s.number}: ${s.title}">
          <span class="suggested-label">${s.label}</span>
          <span class="suggested-ch">Chapter ${s.number}</span>
          <span class="suggested-title">${s.title}</span>
        </a>
      `).join('')}
    </div>
  `;
}

// ── Google Analytics SPA Page View Tracker ──
function trackPageView(viewPath, viewTitle) {
  if (typeof gtag === 'function') {
    gtag('event', 'page_view', {
      page_path: viewPath,
      page_title: viewTitle,
      page_location: window.location.origin + viewPath
    });
  }
}


/* ═══════════════════════════════════════════
   LANGUAGE SWITCHER
   ═══════════════════════════════════════════ */
const LANGUAGES = [
  { code: 'EN', label: 'English',  flag: '🇬🇧' },
  { code: 'FR', label: 'Français', flag: '🇫🇷' },
  { code: 'ES', label: 'Español',  flag: '🇪🇸' },
  { code: 'DE', label: 'Deutsch',  flag: '🇩🇪' },
  { code: 'TR', label: 'Türkçe',   flag: '🇹🇷' },
  { code: 'JP', label: '日本語',   flag: '🇯🇵' },
  { code: 'AR', label: 'العربية',  flag: '🇸🇦' },
];

const LANG_STORAGE_KEY = 'hxh_lang';

/** Restore saved language on page load */
function initLang() {
  const saved = window.__initialLang || localStorage.getItem(LANG_STORAGE_KEY) || 'EN';
  applyLang(saved, false); // false = don't open menu, just set label
}

/** Toggle the dropdown open/closed */
function toggleLangMenu(e) {
  e.stopPropagation();
  const sw  = document.getElementById('lang-switcher');
  const btn = document.getElementById('lang-btn');
  const isOpen = sw.classList.toggle('open');
  btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  if (isOpen) {
    // Focus the currently active item for keyboard users
    const active = document.querySelector('#lang-menu .lang-active');
    if (active) active.focus();
    else {
      const first = document.querySelector('#lang-menu li');
      if (first) first.focus();
    }
  }
}

/** Close without any selection change */
function closeLangMenu() {
  const sw  = document.getElementById('lang-switcher');
  const btn = document.getElementById('lang-btn');
  if (sw) { sw.classList.remove('open'); }
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

/** Called when a language item is clicked */
function selectLang(code) {
  localStorage.setItem(LANG_STORAGE_KEY, code);
  applyLang(code, true);
}

/** Update the button label + active highlight in the list */
function applyLang(code, closeMenu) {
  currentState.currentLang = code;

  // Update trigger label
  const codeEl = document.getElementById('lang-code');
  if (codeEl) codeEl.textContent = code;

  // Mark active item in list
  document.querySelectorAll('#lang-menu li').forEach(li => {
    if (li.dataset.lang === code) {
      li.classList.add('lang-active');
      li.setAttribute('aria-selected', 'true');
    } else {
      li.classList.remove('lang-active');
      li.setAttribute('aria-selected', 'false');
    }
  });

  // Set html lang attribute for accessibility & SEO
  const langMap = { EN:'en', FR:'fr', ES:'es', DE:'de', TR:'tr', JP:'ja', AR:'ar' };
  document.documentElement.lang = langMap[code] || 'en';
  document.documentElement.dir = code === 'AR' ? 'rtl' : 'ltr';

  // Run the translation driver to update the DOM
  translateUI();

  if (closeMenu) closeLangMenu();
}

/** Keyboard navigation inside the dropdown */
function langKeyNav(e, item) {
  const items = Array.from(document.querySelectorAll('#lang-menu li'));
  const idx   = items.indexOf(item);

  switch (e.key) {
    case 'Enter':
    case ' ':
      e.preventDefault();
      selectLang(item.dataset.lang);
      document.getElementById('lang-btn').focus();
      break;
    case 'ArrowDown':
      e.preventDefault();
      if (idx < items.length - 1) items[idx + 1].focus();
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (idx > 0) items[idx - 1].focus();
      else document.getElementById('lang-btn').focus();
      break;
    case 'Escape':
      closeLangMenu();
      document.getElementById('lang-btn').focus();
      break;
    case 'Tab':
      closeLangMenu();
      break;
  }
}

// Also allow Escape on the trigger button itself
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const sw = document.getElementById('lang-switcher');
    if (sw && sw.classList.contains('open')) {
      closeLangMenu();
      document.getElementById('lang-btn').focus();
    }
  }
});

/* ═══════════════════════════════════════════
   I18N DICTIONARY & TRANSLATION ENGINE
   ═══════════════════════════════════════════ */

const TRANSLATIONS = {
  EN: {
    nav_home: "Home",
    nav_chapters: "Chapters",
    nav_about: "About",
    search_placeholder: "Search chapters…",
    hero_ongoing: "Ongoing · Chapter 412",
    hero_by: "by",
    hero_desc: "Hunters are a special breed, dedicated to tracking down treasures, magical beasts, and even other men. But such pursuits require a license, and less than one in a hundred thousand can pass the grueling qualification exam.",
    btn_start_reading: "Start Reading",
    btn_latest_chapter: "Latest Chapter",
    stats_chapters: "Chapters",
    stats_since: "Since",
    stats_rating: "Rating",
    tag_action: "Action",
    tag_adventure: "Adventure",
    tag_fantasy: "Fantasy",
    tag_shounen: "Shounen",
    tag_super_power: "Super Power",
    arcs_title: "Story Arcs",
    arcs_sub: "Journey through the world of Hunters",
    latest_chapters_title: "Latest Chapters",
    view_all_btn: "View All →",
    about_title: "About Hunter × Hunter",
    about_p1: "Hunter × Hunter is a manga series written and illustrated by Yoshihiro Togashi. It has been serialized in Shueisha's shōnen manga magazine Weekly Shōnen Jump since March 1998.",
    about_p2: "The story focuses on a young boy named Gon Freecss who discovers that his father, who left him at a young age, is actually a world-renowned Hunter — a licensed professional who specializes in fantastical pursuits such as locating rare or unidentified animal species, treasure hunting, surveying unexplored enclaves, or hunting down lawless individuals.",
    about_author: "Author",
    about_serialized: "Serialized",
    about_published: "Published",
    about_published_val: "1998 – Present",
    about_genre: "Genre",
    about_genre_val: "Action, Adventure, Fantasy",
    cl_title: "All Chapters",
    cl_subtitle: "412 chapters available · Ongoing",
    cl_search_placeholder: "Search chapter number or title…",
    sort_newest: "Newest First",
    sort_oldest: "Oldest First",
    th_title: "Chapter Title",
    th_date: "Date",
    th_read: "Read",
    reader_back: "Back",
    reader_prev: "‹ Prev",
    reader_next: "Next ›",
    reader_prev_ch: "Previous Chapter",
    reader_list: "Chapter List",
    reader_next_ch: "Next Chapter",
    footer_desc: "An unofficial fan site for Hunter × Hunter. All content belongs to Yoshihiro Togashi & Shueisha.",
    footer_navigate: "Navigate",
    footer_quick_read: "Quick Read",
    footer_legal: "Legal",
    footer_copyright: "© 2026 HxH Fan Site · All rights reserved.",
    chapter_word: "Chapter",
    latest_release: "Latest Release",
    read_arc: "Read Arc",
    arc_word: "Arc",
    loading_pages: "Loading chapter {ch}…",
    no_results: "No chapters found matching \"{query}\"",
    released_label: "Released",
    read_chapter: "Read Chapter",
    legal_privacy: "Privacy Policy",
    legal_terms: "Terms & Conditions",
    legal_dmca: "DMCA",
    legal_disclaimer: "Disclaimer",
    tab_title_home: "HXH Reader",
    tab_title_chapters: "All Chapters | HXH Reader",
    // ── SEO Multilingual Keys ──
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
    alt_cover_home: "Hunter x Hunter Volume 1 manga cover by Yoshihiro Togashi — read online free",
    alt_cover_about: "Hunter x Hunter manga cover art — Gon Freecss by Yoshihiro Togashi",
    seo_intro_title: "Read Hunter x Hunter Manga Online for Free",
    seo_intro_p1: "Welcome to HXH Reader — your ultimate destination to read Hunter x Hunter manga online in English, completely free. Yoshihiro Togashi's masterpiece has captivated manga fans worldwide since its debut in Weekly Shōnen Jump in 1998, and all 412+ Hunter x Hunter chapters are available here with high-quality scans and a clean, distraction-free reading experience.",
    seo_intro_h_what: "What Is Hunter x Hunter?",
    seo_intro_p2: "Hunter x Hunter (also written as HxH or Hunter × Hunter) is a Japanese manga series written and illustrated by Yoshihiro Togashi. The story follows Gon Freecss, a young boy who discovers his long-absent father is actually one of the world's greatest Hunters — an elite class of licensed professionals. Determined to find his father and become a Hunter himself, Gon embarks on a perilous journey that will test every limit of his strength and spirit.",
    seo_intro_p3: "Along the way, Gon befriends Killua Zoldyck, a prodigious assassin from a legendary clan; Kurapika, the last survivor of the Kurta clan seeking revenge against the Phantom Troupe; and Leorio, an ambitious young man working toward becoming a doctor. Together, they navigate a world filled with danger, politics, and the mysterious energy known as Nen — a power system that allows skilled individuals to channel their life force for extraordinary abilities.",
    seo_intro_h_arcs: "Major Hunter x Hunter Story Arcs",
    seo_intro_p4: "The series spans nine major story arcs, each expanding the world and raising the emotional and narrative stakes. The Hunter Exam Arc introduces our heroes through the grueling licensing examination. The fan-favorite Yorknew City Arc sees Kurapika confront the Phantom Troupe in a tense cat-and-mouse thriller. The acclaimed Chimera Ant Arc — covering Chapters 186 to 318 — is widely regarded as one of the greatest manga arcs ever written, depicting a harrowing war between humanity and a new species of Nen-wielding insects.",
    seo_intro_p5: "The series continues into the Dark Continent Expedition and the sprawling Succession Contest Arc, which unfolds across the Black Whale ship as the princes of the Kakin Empire battle for the throne. The legendary antagonist Hisoka weaves through every arc, adding an electrifying sense of unpredictability to an already complex narrative. Togashi's world — the Hunter Association, the concept of Nen, and the mystery of what lies beyond the known map — is one of the richest in all of manga.",
    seo_intro_h_read: "Read Hunter x Hunter Chapters Online — Free & In English",
    seo_intro_p6: "Every Hunter x Hunter chapter on HXH Reader loads with high-quality images, fast page transitions, and a seamless reading experience on both desktop and mobile. Whether you're catching up from Chapter 1: The Day of Departure, revisiting the legendary Chapter 186 where the Chimera Ant Arc begins, or reading the latest chapter, HXH Reader delivers a clean, ad-light reading environment.",
    seo_intro_p7: "Our Hunter x Hunter manga updates are added as soon as new chapters release. You can also browse the full Hunter x Hunter chapter list sorted by story arc or chapter number, and use the search feature to jump directly to any chapter. No registration, no paywall — just pure manga.",
    faq_title: "Frequently Asked Questions",
    faq_sub: "Everything you need to know about reading Hunter x Hunter manga online",
    faq_q1: "Where can I read Hunter x Hunter manga online?",
    faq_a1: "You can read Hunter x Hunter manga online for free right here on HXH Reader. All 412+ chapters are available in English with high-quality scans and a clean reading interface. No registration or subscription required.",
    faq_q2: "Is Hunter x Hunter manga still ongoing?",
    faq_a2: "Yes, Hunter x Hunter is still ongoing. Written by Yoshihiro Togashi, the series resumed in 2022 after a long hiatus. As of 2026, the latest chapter is Chapter 412, continuing the Succession Contest Arc aboard the Black Whale ship.",
    faq_q3: "What is the latest Hunter x Hunter chapter?",
    faq_a3: "The latest Hunter x Hunter chapter is Chapter 412. New Hunter x Hunter manga updates are added to HXH Reader as soon as they are released by Yoshihiro Togashi in Weekly Shōnen Jump.",
    faq_q4: "Can I read Hunter x Hunter in English for free?",
    faq_a4: "Yes! HXH Reader provides all Hunter x Hunter chapters in English for free. You can read from Chapter 1: The Day of Departure all the way to the latest chapter without any registration or subscription.",
    faq_q5: "What are the main Hunter x Hunter story arcs?",
    faq_a5: "Hunter x Hunter has 9 major story arcs: Hunter Exam Arc (Ch. 1–38), Zoldyck Family Arc (Ch. 39–43), Heavens Arena Arc (Ch. 44–63), Yorknew City Arc (Ch. 64–119), Greed Island Arc (Ch. 120–185), Chimera Ant Arc (Ch. 186–318), 13th Chairman Election Arc (Ch. 319–339), Dark Continent Expedition (Ch. 340–348), and the ongoing Succession Contest Arc (Ch. 349–412).",
    read_chapter_prefix: "You are reading",
    read_arc_prefix: "This chapter is part of the",
    read_nav_hint: "Use the navigation below or the arrow buttons to move between chapters."
  },
  FR: {
    nav_home: "Accueil",
    nav_chapters: "Chapitres",
    nav_about: "À propos",
    search_placeholder: "Rechercher des chapitres…",
    hero_ongoing: "En cours · Chapitre 412",
    hero_by: "par",
    hero_desc: "Les Hunters sont une caste à part, vouée à la traque de trésors, de créatures rares et d'individus recherchés. Mais cette voie nécessite une licence spéciale, et moins d'un candidat sur cent mille parvient à réussir l'examen de qualification.",
    btn_start_reading: "Commencer la lecture",
    btn_latest_chapter: "Dernier chapitre",
    stats_chapters: "Chapitres",
    stats_since: "Depuis",
    stats_rating: "Note",
    tag_action: "Action",
    tag_adventure: "Aventure",
    tag_fantasy: "Fantaisie",
    tag_shounen: "Shounen",
    tag_super_power: "Super-pouvoir",
    arcs_title: "Arcs Narratifs",
    arcs_sub: "Voyagez à travers le monde des Hunters",
    latest_chapters_title: "Derniers chapitres",
    view_all_btn: "Tout afficher →",
    about_title: "À propos de Hunter × Hunter",
    about_p1: "Hunter × Hunter est une série de mangas écrite et illustrée par Yoshihiro Togashi. Elle est prépubliée dans le magazine hebdomadaire Weekly Shōnen Jump de Shueisha depuis mars 1998.",
    about_p2: "L'histoire suit un jeune garçon nommé Gon Freecss qui découvre que son père, qui l'a abandonné jeune, est en réalité un Hunter mondialement connu — un professionnel agréé spécialisé dans la recherche d'animaux rares, de trésors et de criminels.",
    about_author: "Auteur",
    about_serialized: "Prépublication",
    about_published: "Publication",
    about_published_val: "1998 – Présent",
    about_genre: "Genre",
    about_genre_val: "Action, Aventure, Fantaisie",
    cl_title: "Tous les chapitres",
    cl_subtitle: "412 chapitres disponibles · En cours",
    cl_search_placeholder: "Rechercher un numéro ou titre…",
    sort_newest: "Plus récent d'abord",
    sort_oldest: "Plus ancien d'abord",
    th_title: "Titre du chapitre",
    th_date: "Date",
    th_read: "Lire",
    reader_back: "Retour",
    reader_prev: "‹ Préc",
    reader_next: "Suiv ›",
    reader_prev_ch: "Chapitre précédent",
    reader_list: "Liste des chapitres",
    reader_next_ch: "Chapitre suivant",
    footer_desc: "Un site de fans non officiel pour Hunter × Hunter. Tout le contenu appartient à Yoshihiro Togashi & Shueisha.",
    footer_navigate: "Navigation",
    footer_quick_read: "Lecture rapide",
    footer_legal: "Légal",
    footer_copyright: "© 2026 HxH Fan Site · Tous droits réservés.",
    chapter_word: "Chapitre",
    latest_release: "Dernière sortie",
    read_arc: "Lire l'arc",
    arc_word: "Arc",
    loading_pages: "Chargement du chapitre {ch}…",
    no_results: "Aucun chapitre trouvé pour \"{query}\"",
    released_label: "Publié",
    read_chapter: "Lire le chapitre",
    legal_privacy: "Politique de Confidentialité",
    legal_terms: "Conditions Générales",
    legal_dmca: "DMCA",
    legal_disclaimer: "Clause de Non-responsabilité",
    tab_title_home: "HXH Reader | Lecture en ligne de Hunter × Hunter",
    tab_title_chapters: "Tous les chapitres | HXH Reader",
    seo_h1: "Hunter x Hunter Manga en Ligne",
    seo_title_home: "Hunter x Hunter Manga en Ligne — Lire Gratuit | HXH Reader",
    seo_title_chapters: "Lire Chapitres Hunter x Hunter en Ligne — Liste | HXH Reader",
    seo_title_chapter: "Lire HxH Chapitre {ch}: {title} Gratuit En Ligne | HXH Reader",
    seo_desc_home: "Lisez le manga Hunter x Hunter en ligne gratuitement. Tous les 412+ chapitres de la série légendaire de Togashi avec Gon, Killua et Nen.",
    seo_desc_chapters: "Parcourez les 412 chapitres de Hunter x Hunter en ligne. Lisez le manga gratuit en français du chapitre 1 au dernier. Mises à jour régulières.",
    seo_desc_chapter: "Lisez Hunter x Hunter Chapitre {ch}: \"{title}\" en ligne gratuitement en français. Fait partie de l'Arc {arc}. Scans de haute qualité.",
    breadcrumb_home: "Accueil",
    breadcrumb_chapters: "Tous les Chapitres",
    breadcrumb_chapter_prefix: "Chapitre",
    alt_cover_home: "Couverture du manga Hunter x Hunter Volume 1 par Yoshihiro Togashi — lire en ligne gratuit",
    alt_cover_about: "Illustration de couverture Hunter x Hunter — Gon Freecss par Yoshihiro Togashi",
    seo_intro_title: "Lire Hunter x Hunter Manga en Ligne Gratuitement",
    seo_intro_p1: "Bienvenue sur HXH Reader, votre site de référence pour lire Hunter x Hunter manga en ligne gratuitement. L'œuvre légendaire de Yoshihiro Togashi a conquis des millions de lecteurs depuis sa première publication dans le Weekly Shōnen Jump en 1998, et l'intégralité des 412 chapitres Hunter x Hunter est accessible ici en haute définition.",
    seo_intro_h_what: "Qu'est-ce que Hunter x Hunter ?",
    seo_intro_p2: "Hunter x Hunter raconte les aventures de Gon Freecss, un jeune garçon qui découvre que son père est l'un des plus grands Hunters de la planète. Déterminé à le retrouver, Gon décide de passer le redoutable examen pour obtenir sa licence de Hunter.",
    seo_intro_p3: "Gon se lie d'amitié avec Killua Zoldyck, l'héritier d'une célèbre famille d'assassins, Kurapika, dernier survivant du clan Kurta, et Leorio, qui souhaite devenir médecin. Ensemble, ils vont s'initier au Nen, un système d'énergie spirituelle permettant de développer des pouvoirs extraordinaires.",
    seo_intro_h_arcs: "Les grands arcs narratifs de Hunter x Hunter",
    seo_intro_p4: "Les chapitres Hunter x Hunter couvrent des sagas inoubliables. L'Arc des Fourmis Chimères (chapitres 186 à 318) reste gravé dans les mémoires comme l'une des histoires les plus sombres et intenses de l'histoire du shōnen.",
    seo_intro_p5: "La série se poursuit avec l'Arc de la Succession Royale à bord du Black Whale. L'incontournable Hisoka continue de tirer les ficelles dans l'ombre, rendant chaque nouveau chapitre Hunter x Hunter totalement imprévisible.",
    seo_intro_h_read: "Lire les chapitres Hunter x Hunter en ligne",
    seo_intro_p6: "Notre plateforme vous permet de lire Hunter x Hunter en ligne avec un confort de lecture optimal sur smartphone comme sur PC. Que vous souhaitiez redécouvrir le premier chapitre ou lire le dernier chapitre Hunter x Hunter, vous profiterez de scans rapides.",
    seo_intro_p7: "Nous publions chaque mise à jour de Hunter x Hunter dès sa sortie officielle au Japon. Utilisez notre outil de recherche pour filtrer les chapitres par arc narratif.",
    faq_title: "Foire Aux Questions",
    faq_sub: "Tout ce que vous devez savoir pour lire le manga Hunter x Hunter en ligne",
    faq_q1: "Où puis-je lire le manga Hunter x Hunter en ligne gratuitement ?",
    faq_a1: "Vous pouvez lire le manga Hunter x Hunter en ligne gratuitement directement sur HXH Reader. L'ensemble des 412+ chapitres est disponible en français avec d'excellents scans et une interface fluide. Aucun abonnement ni inscription n'est requis.",
    faq_q2: "Le manga Hunter x Hunter est-il toujours en cours de parution ?",
    faq_a2: "Oui, Hunter x Hunter est toujours en cours. Après une longue pause, l'auteur Yoshihiro Togashi a repris l'écriture en 2022. En 2026, le chapitre le plus récent est le Chapitre 412, poursuivant l'Arc de la Succession Royale à bord du Black Whale.",
    faq_q3: "Quel est le dernier chapitre de Hunter x Hunter ?",
    faq_a3: "Le dernier chapitre publié est le Chapitre 412. Les nouveaux chapitres et les mises à jour du manga Hunter x Hunter sont ajoutés à notre catalogue dès leur sortie hebdomadaire dans le magazine Weekly Shōnen Jump.",
    faq_q4: "Puis-je lire Hunter x Hunter en français gratuitement ?",
    faq_a4: "Oui, vous pouvez lire tous les chapitres de Hunter x Hunter en français gratuitement sur HXH Reader. Du premier chapitre au tout dernier numéro, les pages sont adaptées aux mobiles et ordinateurs.",
    faq_q5: "Quels sont les arcs principaux de Hunter x Hunter ?",
    faq_a5: "Hunter x Hunter compte 9 arcs narratifs : Examen de Hunter (Ch. 1–38), Famille Zoldik (Ch. 39–43), Tour Céleste (Ch. 44–63), Yorknew City (Ch. 64–119), Greed Island (Ch. 120–185), Fourmis Chimères (Ch. 186–318), Élection du 13e Président (Ch. 319–339), Expédition du Continent Obscur (Ch. 340–348), et la Succession Royale (Ch. 349–412).",
    read_chapter_prefix: "Vous lisez",
    read_arc_prefix: "Ce chapitre fait partie de l'arc",
    read_nav_hint: "Utilisez les boutons de navigation ou les touches fléchées pour changer de chapitre."
  },
  ES: {
    nav_home: "Inicio",
    nav_chapters: "Capítulos",
    nav_about: "Acerca de",
    search_placeholder: "Buscar capítulos…",
    hero_ongoing: "En curso · Capítulo 412",
    hero_by: "por",
    hero_desc: "Los cazadores son una raza especial, dedicados a rastrear tesoros, bestias mágicas e incluso a otros hombres. Pero tales actividades requieren una licencia, y menos de uno en cien mil puede aprobar el agotador examen de calificación.",
    btn_start_reading: "Empezar a leer",
    btn_latest_chapter: "Último capítulo",
    stats_chapters: "Capítulos",
    stats_since: "Desde",
    stats_rating: "Calificación",
    tag_action: "Acción",
    tag_adventure: "Aventura",
    tag_fantasy: "Fantasía",
    tag_shounen: "Shounen",
    tag_super_power: "Súper Poder",
    arcs_title: "Arcos de la historia",
    arcs_sub: "Viaje por el mundo de los cazadores",
    latest_chapters_title: "Últimos capítulos",
    view_all_btn: "Ver todos →",
    about_title: "Acerca de Hunter × Hunter",
    about_p1: "Hunter × Hunter es una serie de manga escrita e ilustrada por Yoshihiro Togashi. Ha sido serializada en la revista Weekly Shōnen Jump de Shueisha desde marzo de 1998.",
    about_p2: "La historia se centra en un niño llamado Gon Freecss que descubre que su padre, quien lo dejó a una edad temprana, es en realidad un cazador de renombre mundial — un profesional con licencia que se especializa en búsquedas fantásticas.",
    about_author: "Autor",
    about_serialized: "Publicación",
    about_published: "Publicado",
    about_published_val: "1998 – Presente",
    about_genre: "Género",
    about_genre_val: "Acción, Aventura, Fantasía",
    cl_title: "Todos los capítulos",
    cl_subtitle: "412 capítulos disponibles · En curso",
    cl_search_placeholder: "Buscar número de capítulo o título…",
    sort_newest: "Más recientes primero",
    sort_oldest: "Más antiguos primero",
    th_title: "Título del capítulo",
    th_date: "Fecha",
    th_read: "Leer",
    reader_back: "Atrás",
    reader_prev: "‹ Ant",
    reader_next: "Sig ›",
    reader_prev_ch: "Capítulo anterior",
    reader_list: "Lista de capítulos",
    reader_next_ch: "Siguiente capítulo",
    footer_desc: "Un sitio de fans no oficial para Hunter × Hunter. Todo el contenido pertenece a Yoshihiro Togashi y Shueisha.",
    footer_navigate: "Navegar",
    footer_quick_read: "Lectura rápida",
    footer_legal: "Legal",
    footer_copyright: "© 2026 HxH Fan Site · Todos los derechos reservados.",
    chapter_word: "Capítulo",
    latest_release: "Último lanzamiento",
    read_arc: "Leer arco",
    arc_word: "Arco",
    loading_pages: "Cargando capítulo {ch}…",
    no_results: "No se encontraron capítulos para \"{query}\"",
    released_label: "Publicado",
    read_chapter: "Leer capítulo",
    legal_privacy: "Política de Privacidad",
    legal_terms: "Términos y Condiciones",
    legal_dmca: "DMCA",
    legal_disclaimer: "Descargo de Responsabilidad",
    tab_title_home: "HXH Reader | Leer Hunter × Hunter en español",
    tab_title_chapters: "Todos los capítulos | HXH Reader",
    seo_h1: "Hunter x Hunter Manga Online en Español",
    seo_title_home: "Hunter x Hunter Manga Online — Leer Gratis | HXH Reader",
    seo_title_chapters: "Leer Capítulos de Hunter x Hunter Online — Lista | HXH Reader",
    seo_title_chapter: "Leer HxH Capítulo {ch}: {title} Gratis Online | HXH Reader",
    seo_desc_home: "Lee el manga Hunter x Hunter online gratis. Todos los 412+ capítulos de la serie legendaria de Togashi con Gon, Killua y Nen. Actualizado regularmente.",
    seo_desc_chapters: "Explora los 412 capítulos de Hunter x Hunter online. Lee manga gratis en español desde el capítulo 1 hasta el último. Actualizaciones regulares.",
    seo_desc_chapter: "Lee Hunter x Hunter Capítulo {ch}: \"{title}\" online gratis en español. Parte del Arco {arc}. Escaneos de alta calidad.",
    breadcrumb_home: "Inicio",
    breadcrumb_chapters: "Todos los Capítulos",
    breadcrumb_chapter_prefix: "Capítulo",
    alt_cover_home: "Portada de Hunter x Hunter Volumen 1 por Yoshihiro Togashi — leer online gratis",
    alt_cover_about: "Ilustración de portada de Hunter x Hunter — Gon Freecss por Yoshihiro Togashi",
    seo_intro_title: "Leer Hunter x Hunter Manga Online Gratis",
    seo_intro_p1: "Bienvenido a HXH Reader, el lugar ideal para leer Hunter x Hunter manga online gratis. La gran obra maestra de Yoshihiro Togashi ha cautivado a los fans de todo el mundo desde su debut en la revista Weekly Shōnen Jump en 1998, y los más de 412 capítulos de Hunter x Hunter están disponibles con escaneos de alta calidad.",
    seo_intro_h_what: "¿Qué es Hunter x Hunter?",
    seo_intro_p2: "Hunter x Hunter es una serie escrita e ilustrada por Yoshihiro Togashi. La historia sigue a Gon Freecss, un niño que descubre que su padre es en realidad uno de los mejores Cazadores del mundo. Decidido a encontrar a su padre y convertirse en un Cazador profesional, Gon emprende una emocionante aventura.",
    seo_intro_p3: "En su viaje, Gon se hace amigo de Killua Zoldyck, un joven asesino de una familia legendaria; Kurapika, el último sobreviviente de su clan que busca vengarse de la Brigada Fantasma; y Leorio, un noble aspirante a médico. Juntos descubren el fascinante mundo del Nen.",
    seo_intro_h_arcs: "Arcos principales de Hunter x Hunter",
    seo_intro_p4: "Los capítulos de Hunter x Hunter se dividen en varios arcos principales. El aclamado Arco de las Hormigas Quimera (capítulos 186 al 318) muestra la cruda batalla de la Asociación de Cazadores contra una nueva especie mutante y peligrosa.",
    seo_intro_p5: "La historia continúa en el Arco del Concurso de Sucesión a bordo de la gigantesca nave Black Whale. La complejidad que Togashi dio al sistema de Nen convierte a esta obra en uno de los mejores mangas de la historia.",
    seo_intro_h_read: "Leer Capítulos de Hunter x Hunter Online Gratis",
    seo_intro_p6: "Puedes leer Hunter x Hunter online y disfrutar de imágenes limpias y transiciones rápidas tanto en móvil como en ordenador. Ya sea que empieces desde el Capítulo 1 o quieras leer el último capítulo de Hunter x Hunter, en HXH Reader te ofrecemos un entorno limpio y optimizado.",
    seo_intro_p7: "Añadimos las últimas actualizaciones del manga Hunter x Hunter en cuanto se publican. Puedes explorar la lista completa de capítulos y usar el buscador para encontrar tu momento favorito al instante.",
    faq_title: "Preguntas Frecuentes",
    faq_sub: "Todo lo que necesitas saber para leer el manga Hunter x Hunter en línea",
    faq_q1: "¿Dónde puedo leer el manga Hunter x Hunter online gratis?",
    faq_a1: "Puedes leer el manga Hunter x Hunter en línea de forma gratuita aquí mismo en HXH Reader. Todos los más de 412 capítulos están disponibles en español con escaneos de alta calidad. No necesitas registrarte ni pagar suscripción.",
    faq_q2: "¿El manga de Hunter x Hunter sigue en emisión?",
    faq_a2: "Sí, Hunter x Hunter sigue en curso. Creado por Yoshihiro Togashi, el manga reanudó su publicación en 2022 tras una larga pausa. En 2026, el capítulo más reciente es el Capítulo 412, que continúa el Arco del Concurso de Sucesión a bordo de la nave Black Whale.",
    faq_q3: "¿Cuál es el último capítulo de Hunter x Hunter?",
    faq_a3: "El último capítulo de Hunter x Hunter publicado es el Capítulo 412. Las nuevas actualizaciones y capítulos de Hunter x Hunter se añaden a HXH Reader de forma inmediata tras su publicación oficial en Weekly Shōnen Jump.",
    faq_q4: "¿Puedo leer Hunter x Hunter en español de forma gratuita?",
    faq_a4: "¡Sí! En HXH Reader ofrecemos todos los capítulos de Hunter x Hunter en español gratis. Puedes leer desde el Capítulo 1 hasta el capítulo más reciente de forma libre, optimizado para móviles y ordenadores.",
    faq_q5: "¿Cuáles son los arcos argumentales de Hunter x Hunter?",
    faq_a5: "Hunter x Hunter consta de 9 arcos: Examen de Cazador (Cap. 1-38), Familia Zoldyck (Cap. 39-43), Coliseo del Cielo (Cap. 44-63), Ciudad de Yorknew (Cap. 64-119), Greed Island (Cap. 120-185), Hormigas Quimera (Cap. 186-318), Elección del 13° Presidente (Cap. 319-339), Expedición al Continente Oscuro (Cap. 340-348) y el Concurso de Sucesión (Cap. 349-412).",
    read_chapter_prefix: "Estás leyendo",
    read_arc_prefix: "Este capítulo forma parte del",
    read_nav_hint: "Usa la barra de navegación inferior o las flechas para desplazarte entre capítulos."
  },
  DE: {
    nav_home: "Startseite",
    nav_chapters: "Kapitel",
    nav_about: "Über",
    search_placeholder: "Kapitel suchen…",
    hero_ongoing: "Laufend · Kapitel 412",
    hero_by: "von",
    hero_desc: "Hunter sind eine besondere Art von Menschen, die sich dem Aufspüren von Schätzen, magischen Bestien und sogar anderen Menschen verschrieben haben. Doch dafür ist eine Lizenz erforderlich, und weniger als einer von Hunderttausend besteht die schwere Prüfung.",
    btn_start_reading: "Jetzt lesen",
    btn_latest_chapter: "Neuestes Kapitel",
    stats_chapters: "Kapitel",
    stats_since: "Seit",
    stats_rating: "Bewertung",
    tag_action: "Action",
    tag_adventure: "Abenteuer",
    tag_fantasy: "Fantasy",
    tag_shounen: "Shounen",
    tag_super_power: "Superkräfte",
    arcs_title: "Story-Arcs",
    arcs_sub: "Reise durch die Welt der Hunter",
    latest_chapters_title: "Neueste Kapitel",
    view_all_btn: "Alle anzeigen →",
    about_title: "Über Hunter × Hunter",
    about_p1: "Hunter × Hunter ist eine Manga-Serie, die von Yoshihiro Togashi geschrieben und gezeichnet wurde. Sie erscheint seit März 1998 im Weekly Shōnen Jump Magazin des Shueisha-Verlags.",
    about_p2: "Die Geschichte dreht sich um Gon Freecss, einen Jungen, der erfährt, dass sein Vater, der ihn früh verließ, ein weltbekannter Hunter ist — ein lizenzierter Profi, der auf das Aufspüren seltener Tiere, Schätze und Krimineller spezialisiert ist.",
    about_author: "Autor",
    about_serialized: "Magazin",
    about_published: "Veröffentlichung",
    about_published_val: "1998 – Heute",
    about_genre: "Genre",
    about_genre_val: "Action, Abenteuer, Fantasy",
    cl_title: "Alle Kapitel",
    cl_subtitle: "412 Kapitel verfügbar · Laufend",
    cl_search_placeholder: "Suche nach Kapitelnummer oder Titel…",
    sort_newest: "Neueste zuerst",
    sort_oldest: "Älteste zuerst",
    th_title: "Kapiteltitel",
    th_date: "Datum",
    th_read: "Lesen",
    reader_back: "Zurück",
    reader_prev: "‹ Zurück",
    reader_next: "Weiter ›",
    reader_prev_ch: "Vorheriges Kapitel",
    reader_list: "Kapitelliste",
    reader_next_ch: "Nächstes Kapitel",
    footer_desc: "Eine inoffizielle Fanseite für Hunter × Hunter. Alle Inhalte gehören Yoshihiro Togashi & Shueisha.",
    footer_navigate: "Navigation",
    footer_quick_read: "Schnellsuche",
    footer_legal: "Rechtliches",
    footer_copyright: "© 2026 HxH Fanseite · Alle Rechte vorbehalten.",
    chapter_word: "Kapitel",
    latest_release: "Neuestes Release",
    read_arc: "Arc lesen",
    arc_word: "Arc",
    loading_pages: "Kapitel {ch} wird geladen…",
    no_results: "Keine Kapitel gefunden für \"{query}\"",
    released_label: "Veröffentlicht",
    read_chapter: "Kapitel lesen",
    legal_privacy: "Datenschutzerklärung",
    legal_terms: "Nutzungsbedingungen",
    legal_dmca: "DMCA",
    legal_disclaimer: "Haftungsausschluss",
    tab_title_home: "HXH Reader | Hunter × Hunter Manga online",
    tab_title_chapters: "Alle Kapitel | HXH Reader",
    seo_h1: "Hunter x Hunter Manga online lesen",
    seo_title_home: "Hunter x Hunter Manga Online Lesen — Kostenlos | HXH Reader",
    seo_title_chapters: "Hunter x Hunter Kapitel Online Lesen — Liste | HXH Reader",
    seo_title_chapter: "HxH Kapitel {ch}: {title} Kostenlos Online Lesen | HXH Reader",
    seo_desc_home: "Lies Hunter x Hunter Manga online kostenlos. Alle 412+ Kapitel von Togashis legendärer Serie mit Gon, Killua und Nen. Regelmäßige Updates.",
    seo_desc_chapters: "Durchstöbere alle 412 Hunter x Hunter Kapitel online. Lies kostenlose Mangas auf Deutsch von Kapitel 1 bis zum neuesten Kapitel.",
    seo_desc_chapter: "Lies Hunter x Hunter Kapitel {ch}: \"{title}\" online kostenlos auf Deutsch. Teil des {arc} Arcs. Hochwertige Scans.",
    breadcrumb_home: "Startseite",
    breadcrumb_chapters: "Alle Kapitel",
    breadcrumb_chapter_prefix: "Kapitel",
    alt_cover_home: "Hunter x Hunter Band 1 Manga Cover von Yoshihiro Togashi — kostenlos online lesen",
    alt_cover_about: "Hunter x Hunter Manga Cover Gon Freecss von Yoshihiro Togashi",
    seo_intro_title: "Hunter x Hunter Manga online lesen — Kostenlos",
    seo_intro_p1: "Willkommen bei HXH Reader, der besten Plattform, um Hunter x Hunter Manga online lesen zu können — komplett kostenlos. Das Meisterwerk von Yoshihiro Togashi begeistert Fans weltweit seit dem Debüt im Weekly Shōnen Jump im Jahr 1998. Alle 412+ Hunter x Hunter Kapitel stehen dir hier in hervorragender Qualität zur Verfügung.",
    seo_intro_h_what: "Was ist Hunter x Hunter?",
    seo_intro_p2: "Die Geschichte folgt Gon Freecss, einem Jungen, der herausfindet, dass sein Vater ein weltberühmter Hunter ist. Um ihn zu finden, entschließt sich Gon, ebenfalls die gefährliche Hunter-Prüfung abzulegen. Dabei freundet er sich mit Killua Zoldyck, Kurapika und Leorio an.",
    seo_intro_p3: "Zusammen erlernen sie die Nutzung von Nen, einer fortgeschrittenen Technik zur Manipulation der eigenen Lebensenergie. Die Hunter x Hunter Kapitel führen uns durch legendäre Abenteuer wie den Yorknew City Arc und den emotionalen Chimera Ant Arc (Kapitel 186 bis 318).",
    seo_intro_h_arcs: "Die wichtigsten Story-Arcs der Serie",
    seo_intro_p4: "Die Serie erstreckt sich über mehrere herausragende Abschnitte. Die düsteren Ereignisse rund um die Phantom-Truppe im Yorknew Arc und der legendäre Ameisen-Arc (über 130 Kapitel) bilden den dramatischen Höhepunkt.",
    seo_intro_p5: "Derzeit befindet sich die Story im Succession Contest Arc auf dem Weg zum Dunklen Kontinent. Jedes neue Hunter x Hunter neuestes Kapitel bringt frische Spannung rund um Kurapika, die Kakin-Prinzen und den unberechenbaren Hisoka.",
    seo_intro_h_read: "Lies alle Hunter x Hunter Kapitel online",
    seo_intro_p6: "Auf unserem Hunter x Hunter Online-Reader liest du alle Kapitel komfortabel auf jedem Gerät. Wir aktualisieren unsere Datenbank sofort, sobald ein neuer kostenloser Manga-Abschnitt erscheint.",
    seo_intro_p7: "Nutze die praktische Suchfunktion, um gezielt nach deinen Lieblingskapiteln zu suchen oder filtere die Kapitel nach Story-Arcs, um direkt in die Action einzusteigen.",
    faq_title: "Häufig Gestellte Fragen (FAQ)",
    faq_sub: "Alles, was du über das Online-Lesen des Hunter x Hunter Mangas wissen musst",
    faq_q1: "Wo kann ich den Hunter x Hunter Manga online kostenlos lesen?",
    faq_a1: "Du kannst den Hunter x Hunter Manga online kostenlos hier auf HXH Reader lesen. Alle 412+ Kapitel sind in hervorragender Scan-Qualität verfügbar. Keine Registrierung oder Abonnements erforderlich.",
    faq_q2: "Wird der Hunter x Hunter Manga noch fortgesetzt?",
    faq_a2: "Ja, Hunter x Hunter läuft noch. Die von Yoshihiro Togashi geschriebene Serie wurde nach einer langen Pause im Jahr 2022 fortgesetzt. Im Jahr 2026 ist das aktuellste Kapitel das Kapitel 412, das die Thronfolgeschlacht an Bord der Black Whale schildert.",
    faq_q3: "Was ist das neueste Kapitel von Hunter x Hunter?",
    faq_a3: "Das neueste Kapitel ist Kapitel 412. Neue Kapitel werden auf HXH Reader hochgeladen, sobald sie im Weekly Shōnen Jump in Japan erscheinen.",
    faq_q4: "Kann ich Hunter x Hunter kostenlos auf Deutsch lesen?",
    faq_a4: "Ja, alle Kapitel von Hunter x Hunter stehen dir kostenlos zur Verfügung. Du kannst alle Kapitel von Kapitel 1 bis zum neuesten Band bequem auf dem PC oder Smartphone lesen.",
    faq_q5: "Welches sind die Haupt-Arcs in Hunter x Hunter?",
    faq_a5: "Hunter x Hunter besteht aus 9 Hauptabschnitten: Hunter-Prüfung (Kap. 1-38), Zoldyck-Familie (Kap. 39-43), Himmelsarena (Kap. 44-63), Yorknew City (Kap. 64-119), Greed Island (Kap. 120-185), Chimera Ants (Kap. 186-318), Wahl des 13. Vorsitzenden (Kap. 319-339), Expedition zum Dunklen Kontinent (Kap. 340-348) und dem Nachfolge-Wettbewerb (Kap. 349-412).",
    read_chapter_prefix: "Du liest",
    read_arc_prefix: "Dieses Kapitel ist Teil des",
    read_nav_hint: "Nutze die Steuerung unten oder die Pfeiltasten, um zwischen den Kapiteln zu wechseln."
  },
  TR: {
    nav_home: "Ana Sayfa",
    nav_chapters: "Bölümler",
    nav_about: "Hakkında",
    search_placeholder: "Bölüm ara…",
    hero_ongoing: "Devam Ediyor · Bölüm 412",
    hero_by: "yazar",
    hero_desc: "Avcılar; hazinelerin, efsanevi canavarların ve hatta diğer insanların peşine düşen özel bir insan türüdür. Ancak bu tür uğraşlar için bir lisans gerekir ve yüz binde birden az kişi zorlu eleme sınavını geçebilir.",
    btn_start_reading: "Okumaya Başla",
    btn_latest_chapter: "Son Bölüm",
    stats_chapters: "Bölümler",
    stats_since: "Başlangıç",
    stats_rating: "Puan",
    tag_action: "Aksiyon",
    tag_adventure: "Macera",
    tag_fantasy: "Fantastik",
    tag_shounen: "Shounen",
    tag_super_power: "Süper Güç",
    arcs_title: "Hikaye Arkları",
    arcs_sub: "Avcıların dünyasında bir yolculuğa çıkın",
    latest_chapters_title: "Son Bölümler",
    view_all_btn: "Tümünü Gör →",
    about_title: "Hunter × Hunter Hakkında",
    about_p1: "Hunter × Hunter, Yoshihiro Togashi tarafından yazılan ve çizilen bir manga serisidir. Mart 1998'den beri Shueisha'nın haftalık shōnen manga dergisi Weekly Shōnen Jump'ta yayınlanmaktadır.",
    about_p2: "Hikaye, kendisini küçük yaşta terk eden babasının aslında dünya çapında tanınan bir Avcı olduğunu keşfeden Gon Freecss adındaki genç bir çocuğa odaklanır. Avcılar, nadir canlıları bulma, hazine avcılığı ve suçluları yakalama gibi konularda uzmandır.",
    about_author: "Yazar",
    about_serialized: "Dergi",
    about_published: "Yayın Tarihi",
    about_published_val: "1998 – Günümüz",
    about_genre: "Tür",
    about_genre_val: "Aksiyon, Macera, Fantastik",
    cl_title: "Tüm Bölümler",
    cl_subtitle: "412 bölüm mevcut · Devam ediyor",
    cl_search_placeholder: "Bölüm numarası veya başlık ara…",
    sort_newest: "Önce en yeni",
    sort_oldest: "Önce en eski",
    th_title: "Bölüm Başlığı",
    th_date: "Tarih",
    th_read: "Oku",
    reader_back: "Geri",
    reader_prev: "‹ Geri",
    reader_next: "İleri ›",
    reader_prev_ch: "Önceki Bölüm",
    reader_list: "Bölüm Listesi",
    reader_next_ch: "Sonraki Bölüm",
    footer_desc: "Hunter × Hunter için gayri resmi bir hayran sitesi. Tüm haklar Yoshihiro Togashi ve Shueisha'ya aittir.",
    footer_navigate: "Gezinti",
    footer_quick_read: "Hızlı Oku",
    footer_legal: "Yasal",
    footer_copyright: "© 2026 HxH Hayran Sitesi · Tüm hakları saklıdır.",
    chapter_word: "Bölüm",
    latest_release: "En son çıkan",
    read_arc: "Arkı Oku",
    arc_word: "Ark",
    loading_pages: "Bölüm {ch} yükleniyor…",
    no_results: "Aramanızla eşleşen bölüm bulunamadı: \"{query}\"",
    released_label: "Yayınlandı",
    read_chapter: "Bölümü Oku",
    legal_privacy: "Gizlilik Politikası",
    legal_terms: "Kullanım Koşulları",
    legal_dmca: "DMCA",
    legal_disclaimer: "Sorumluluk Reddi Beyanı",
    tab_title_home: "HXH Reader | Türkçe Hunter × Hunter Oku",
    tab_title_chapters: "Tüm Bölümler | HXH Reader",
    seo_h1: "Hunter x Hunter manga oku",
    seo_title_home: "Hunter x Hunter Manga Oku — Türkçe Online | HXH Reader",
    seo_title_chapters: "Hunter x Hunter Bölümleri Oku — Bölüm Listesi | HXH Reader",
    seo_title_chapter: "Hunter x Hunter Bölüm {ch}: {title} Türkçe Oku | HXH Reader",
    seo_desc_home: "Hunter x Hunter mangasını çevrimiçi ücretsiz oku. Gon, Killua ve Nen içeren Togashi'nin efsanevi serisinin tüm 412+ bölümü burada.",
    seo_desc_chapters: "Tüm 412 Hunter x Hunter bölümlerine göz atın. Bölüm 1'den en son bölüme kadar Türkçe Hunter x Hunter mangasını ücretsiz okuyun.",
    seo_desc_chapter: "Hunter x Hunter Bölüm {ch}: \"{title}\" Türkçe oku. {arc} Arkının bir parçasıdır. Yüksek kaliteli taramalar ile ücretsiz okuyun.",
    breadcrumb_home: "Ana Sayfa",
    breadcrumb_chapters: "Tüm Bölümler",
    breadcrumb_chapter_prefix: "Bölüm",
    alt_cover_home: "Yoshihiro Togashi tarafından çizilen Hunter x Hunter 1. Cilt manga kapağı — çevrimiçi oku",
    alt_cover_about: "Gon Freecss çizimi ile Hunter x Hunter manga kapak resmi",
    seo_intro_title: "Hunter x Hunter Manga Oku — Çevrimiçi Türkçe",
    seo_intro_p1: "HXH Reader'a hoş geldiniz! Hunter x Hunter manga oku arayışınız için en doğru adrestesiniz. Yoshihiro Togashi'nin 1998'den beri Weekly Shōnen Jump'ta yayınlanan bu efsanevi eseri, tüm dünyadaki hayranları peşinden sürüklüyor. Tüm Hunter x Hunter bölümleri yüksek kaliteli taramalarla ücretsiz olarak burada.",
    seo_intro_h_what: "Hunter x Hunter Nedir?",
    seo_intro_p2: "Hikaye, babasının ünlü bir Avcı olduğunu öğrenen Gon Freecss adındaki küçük bir çocuğun maceralarını anlatıyor. Gon, babasını bulabilmek için tehlikeli Avcı Sınavı'na katılır ve orada Killua Zoldyck, Kurapika ve Leorio ile tanışarak ömür boyu sürecek dostluklar kurar.",
    seo_intro_p3: "Nen adı verilen gizemli gücü öğrenen dostumuz, kendilerini durdurulamaz bir gelişim sürecinin içinde bulurlar. Efsanevi Karınca Arkı (186 - 318. bölümler) manga dünyasının en iyi serilerinden biri olarak kabul edilir.",
    seo_intro_h_arcs: "Hunter x Hunter'ın Önemli Hikaye Arkları",
    seo_intro_p4: "Seri 9 ana arkı kapsar. Avcı Sınavı ile başlayan macera, Yorknew City'de Phantom Troupe'a karşı verilen intikam mücadelesiyle devam eder. 186. bölümden 318'e kadar uzanan Karınca Arkı tüm shonen dünyasının en iyi kurgularından biri kabul edilir.",
    seo_intro_p5: "Karanlık Kıta Seferi ve Black Whale gemisinde geçen Taht Savaşı gibi en son Hunter x Hunter son bölüm gelişmelerini sitemizden takip edebilirsiniz. Bölüm listesini kullanarak istediğiniz bölüme hemen geçiş yapabilirsiniz.",
    seo_intro_h_read: "Türkçe Avcı Maceraları Başlasın",
    seo_intro_p6: "HXH Reader ile bölümleri takılmadan, yüksek hızda yüklenen görsellerle okuyebilirsiniz. İster Bölüm 1'den sıfırdan başlayın, ister en yeni sayıları güncel olarak okuyun.",
    seo_intro_p7: "Manga güncellemelerimiz Shueisha tarafından yayınlandığı andan itibaren sisteme yüklenmektedir. Arama çubuğunu kullanarak favori bölümlerinize anında erişebilirsiniz.",
    faq_title: "Sıkça Sorulan Sorular",
    faq_sub: "Hunter x Hunter mangasını çevrimiçi okuma hakkında bilmeniz gereken her şey",
    faq_q1: "Hunter x Hunter mangasını çevrimiçi nereden ücretsiz okuyabilirim?",
    faq_a1: "Hunter x Hunter mangasını çevrimiçi olarak doğrudan HXH Reader'da ücretsiz okuyabilirsiniz. 412'den fazla bölümün tamamı yüksek kaliteli görseller eşliğinde sunulmaktadır. Kayıt veya üyelik zorunluluğu yoktur.",
    faq_q2: "Hunter x Hunter mangası hala devam ediyor mu?",
    faq_a2: "Evet, Hunter x Hunter hala devam etmektedir. Yoshihiro Togashi tarafından çizilen seri, uzun bir aranın ardından 2022'de yayınlanmaya devam etti. 2026 itibariyle en güncel bölüm, Kara Balina gemisinde geçen Taht Savaşı arkını anlatan 412. bölümdür.",
    faq_q3: "En son yayınlanan Hunter x Hunter bölümü hangisidir?",
    faq_a3: "Yayınlanan en son bölüm 412. bölümdür. Yeni bölümler Japonya'da haftalık Weekly Shōnen Jump dergisinde çıkar çıkmaz HXH Reader'a eklenerek güncellenmektedir.",
    faq_q4: "Hunter x Hunter mangasını Türkçe ücretsiz okuyabilir miyim?",
    faq_a4: "Evet! HXH Reader üzerinden tüm Hunter x Hunter bölümlerine ücretsiz erişebilirsiniz. Bölüm 1'den en son bölüme kadar mobil uyumlu okuyucumuzla hemen okumaya başlayın.",
    faq_q5: "Hunter x Hunter'ın ana hikaye arkları nelerdir?",
    faq_a5: "Hunter x Hunter 9 ana hikaye arkından oluşur: Avcı Sınavı (Bölüm 1-38), Zoldyck Ailesi (Bölüm 39-43), Gökyüzü Arenası (Bölüm 44-63), Yorknew Şehri (Bölüm 64-119), Greed Island (Bölüm 120-185), Karınca Arkı (Bölüm 186-318), 13. Başkanlık Seçimi (Bölüm 319-339), Karanlık Kıta Seferi (Bölüm 340-348) ve Veraset Savaşı (Bölüm 349-412).",
    read_chapter_prefix: "Şu anda okuyorsunuz:",
    read_arc_prefix: "Bu bölüm şu arkın bir parçasıdır:",
    read_nav_hint: "Bölümler arasında geçiş yapmak için aşağıdaki menüyü veya yön tuşlarını kullanabilirsiniz."
  },
  JP: {
    nav_home: "ホーム",
    nav_chapters: "全話一覧",
    nav_about: "作品紹介",
    search_placeholder: "話を検索…",
    hero_ongoing: "連載中 · 第412話",
    hero_by: "著者：",
    hero_desc: "ハンターとは、秘宝、魔獣、そして人をも追う特別な存在。その資格を得るには、過酷極まりないハンター試験を突破しなければならない。合格率は数万分の一とも言われている。",
    btn_start_reading: "第1話から読む",
    btn_latest_chapter: "最新話を読む",
    stats_chapters: "話数",
    stats_since: "連載開始",
    stats_rating: "評価",
    tag_action: "アクション",
    tag_adventure: "冒険",
    tag_fantasy: "ファンタジー",
    tag_shounen: "少年マンガ",
    tag_super_power: "特殊能力",
    arcs_title: "ストーリー編一覧",
    arcs_sub: "ハンターたちの冒険 of 軌跡",
    latest_chapters_title: "最新話",
    view_all_btn: "全話を見る →",
    about_title: "Hunter × Hunter について",
    about_p1: "『HUNTER×HUNTER』（ハンターハンター）は、冨樫義博による日本の漫画作品。集集社の少年漫画雑誌『週刊少年ジャンプ』にて1998年3月より連載を開始。",
    about_p2: "幼い頃に別れた父・ジンが偉大なハンターであることを知った主人公・ゴンが、父と会うために過酷なハンター試験をクリアし、仲間たちと共に過酷な試練や強敵に立ち向かい成長していく物語。",
    about_author: "著者",
    about_serialized: "掲載誌",
    about_published: "連載期間",
    about_published_val: "1998年 ～ 現在",
    about_genre: "ジャンル",
    about_genre_val: "アクション、冒険、ファンタジー",
    cl_title: "全話一覧",
    cl_subtitle: "全412話掲載中 · 連載中",
    cl_search_placeholder: "話数やタイトルで検索…",
    sort_newest: "最新話から表示",
    sort_oldest: "第1話から表示",
    th_title: "サブタイトル",
    th_date: "公開日",
    th_read: "読む",
    reader_back: "戻る",
    reader_prev: "‹ 前の話",
    reader_next: "次の話 ›",
    reader_prev_ch: "前の話へ",
    reader_list: "話数一覧",
    reader_next_ch: "次の話へ",
    footer_desc: "当サイトは『HUNTER×HUNTER』の非公式ファンサイトです。掲載されている画像・作品の著作権は冨樫義博氏および集英社に帰属します。",
    footer_navigate: "メニュー",
    footer_quick_read: "クイック読み",
    footer_legal: "法的事項",
    footer_copyright: "© 2026 HxH Fan Site · All rights reserved.",
    chapter_word: "話",
    latest_release: "最新リリース",
    read_arc: "この編を読む",
    arc_word: "編",
    loading_pages: "第 {ch} 話を読み込み中…",
    no_results: "該当する話が見つかりませんでした: \"{query}\"",
    released_label: "公開済",
    read_chapter: "話を読む",
    legal_privacy: "プライバシーポリシー",
    legal_terms: "利用規約",
    legal_dmca: "DMCA免責",
    legal_disclaimer: "免責事項",
    tab_title_home: "HXH Reader | 無料で Hunter × Hunter を読む",
    tab_title_chapters: "全話一覧 | HXH Reader",
    seo_h1: "ハンターハンター 漫画",
    seo_title_home: "ハンターハンター 漫画 — オンラインで読む無料 | HXH Reader",
    seo_title_chapters: "ハンターハンター 最新話 — 全話一覧 | HXH Reader",
    seo_title_chapter: "ハンターハンター 第 {ch} 話: {title} 無料漫画 | HXH Reader",
    seo_desc_home: "ハンターハンターの漫画をオンラインで無料で読みましょう。冨樫義博の伝説的シリーズ、ゴンやキルア、念能力の全412話以上を掲載。最新話も更新中。",
    seo_desc_chapters: "ハンターハンターの全412話をオンラインで閲覧可能。第1話から最新話まで、日本語の漫画を無料で読めます。最新情報随時更新。",
    seo_desc_chapter: "ハンターハンター 第 {ch} 話: 「{title}」の日本語漫画をオンラインで無料閲覧。{arc}編。高画質スキャン画像。",
    breadcrumb_home: "ホーム",
    breadcrumb_chapters: "全話一覧",
    breadcrumb_chapter_prefix: "第",
    alt_cover_home: "冨樫義博作 ハンターハンター第1巻 コミックス表紙 — 無料オンライン読破",
    alt_cover_about: "ゴン＝フリークスが描かれたハンターハンターの単行本表紙イラスト",
    seo_intro_title: "ハンターハンターの漫画をオンラインで無料読破",
    seo_intro_p1: "HXH Readerへようこそ！大人気コミック「ハンターハンター 漫画」をオンラインでいつでも無料で読めるファンサイトです。1998年の週刊少年ジャンプ連載開始以来、冨樫義博先生が描く緻密なストーリーと魅力的なキャラクターは世界中を魅了し続けています。第1話から最新話まで、最高の画質と読みやすいレイアウトで快適にお楽しみいただけます。",
    seo_intro_h_what: "HUNTER×HUNTERとは？",
    seo_intro_p2: "主人公のゴン＝フリークスは、幼い頃に死んだと聞かされていた父親ジンが、実は偉大なハンターとして生きていることを知ります。父親に会うため、過酷なハンター試験に挑むゴン。そこでキルア、クラピカ、レオリオといったかけがえのない仲間たちと出会います。",
    seo_intro_p3: "念能力（ねんのうりょく）と呼ばれる奥深い能力システムを中心に、ハンター試験編、ヨークシンシティ編、そして傑作と名高いキメラ＝アント編（第186話〜第318話）など、数々の名エピソードを収録。仲間との絆、残酷な運命、頭脳を尽くした戦いが読者を惹きつけます。",
    seo_intro_h_arcs: "主要ストーリー編の一覧",
    seo_intro_p4: "物語は大きく分けて9つの編があります。特にキメラアント編は人間の業と王メルエムの成長を描き、世界的な評価を受けました。",
    seo_intro_p5: "現在は暗黒大陸を目指すブラックホエール号内での王位継承戦が描かれています。クラピカが護衛として活躍する中、幻影旅団やヒソカの動向など「ハンターハンター 最新話」の展開から目が離せません。",
    seo_intro_h_read: "今すぐPCやスマホでハンターハンターを読む",
    seo_intro_p6: "当サイトのオンラインリーダーなら、スマートフォンやPCからハンターハンターの全話を快適にサクサク読むことができます。ページめくりも高速で、無駄なポップアップ広告もありません。",
    seo_intro_p7: "検索機能を使えば、読みたい話数やサブタイトルを瞬時に見つけることができます。連載再開に備えて、ゴンとキルアの軌跡をもう一度最初から振り返ってみましょう！",
    faq_title: "よくあるご質問",
    faq_sub: "ハンターハンターの漫画をネットで読むためのヒント",
    faq_q1: "ハンターハンターの漫画はどこで無料で読めますか？",
    faq_a1: "ハンターハンターの全話は、こちらのHXH Readerでいつでもオンラインで無料で読むことができます。面倒な会員登録や課金は一切不要で、高画質なスキャン画像を快適なリーダーで楽しめます。",
    faq_q2: "ハンターハンターの漫画はまだ連載中ですか？",
    faq_a2: "はい、HUNTER×HUNTERは現在も連載中です。冨樫義博先生による本作は週刊少年ジャンプで掲載されており、現在の最新話は第412話（ブラックホエール号編）となっています。",
    faq_q3: "ハンターハンターの最新話はどれですか？",
    faq_a3: "現在の最新話は「第412話」です。少年ジャンプで新しい話が公開され次第、当サイトでも迅速にアップデートが適用されます。",
    faq_q4: "全エピソードを最初から最後まで日本語で読めますか？",
    faq_a4: "はい、第1話から最新話まで、すべてのエピソードを無料で読むことができます。スマートフォンにも完全対応しています。",
    faq_q5: "ハンターハンターの主なストーリー編は何ですか？",
    faq_a5: "主なストーリー編は、ハンター試験編（1-38話）、ゾルディック家編（39-43話）、天空闘技場編（44-63話）、ヨークシンシティ編（64-119話）、グリードアイランド編（120-185話）、キメラアント編（186-318話）、会長選挙編（319-339話）、暗黒大陸遠征編（340-348話）、王位継承戦編（349話以降）です。",
    read_chapter_prefix: "閲覧中のエピソード：",
    read_arc_prefix: "この話は次のストーリー編に属しています：",
    read_nav_hint: "ページ下部のナビゲーションボタンまたはキーボードの矢印キーで話を前後に切り替えられます。"
  },
  AR: {
    nav_home: "الرئيسية",
    nav_chapters: "الفصول",
    nav_about: "حول",
    search_placeholder: "ابحث عن فصول…",
    hero_ongoing: "مستمر · الفصل 412",
    hero_by: "بواسطة",
    hero_desc: "الصيادون هم فئة خاصة مكرسة لتعقب الكنوز والوحوش السحرية وحتى المجرمين. لكن مثل هذه المساعي تتطلب ترخيصًا، ولا يستطيع سوى واحد من كل مائة ألف اجتياز اختبار التأهيل الشاق.",
    btn_start_reading: "ابدأ القراءة",
    btn_latest_chapter: "الفصل الأخير",
    stats_chapters: "فصل",
    stats_since: "منذ",
    stats_rating: "التقييم",
    tag_action: "أكشن",
    tag_adventure: "مغامرة",
    tag_fantasy: "خيال",
    tag_shounen: "شونين",
    tag_super_power: "قوى خارقة",
    arcs_title: "أركات القصة",
    arcs_sub: "رحلة في عالم الصيادين",
    latest_chapters_title: "الفصول الأخيرة",
    view_all_btn: "عرض الكل →",
    about_title: "حول هنتر × هنتر",
    about_p1: "هنتر × هنتر هي سلسلة مانغا كتبها ورسمها يوشيهيرو توغاشي. تم نشرها في مجلة شونين جمب الأسبوعية التابعة لدار شوئيشا منذ مارس 1998.",
    about_p2: "تركز القصة على فتى صغير يدعى غون فريكس يكتشف أن والده، الذي تركه في سن مبكرة، هو في الواقع صياد مشهور عالميًا — وهو محترف مرخص يتخصص في المساعي الخيالية مثل العثور على مخلوقات نادرة وتتبع الكنوز.",
    about_author: "المؤلف",
    about_serialized: "المجلة",
    about_published: "تاريخ النشر",
    about_published_val: "1998 – الآن",
    about_genre: "التصنيف",
    about_genre_val: "أكشن، مغامرة، خيال",
    cl_title: "جميع الفصول",
    cl_subtitle: "412 فصلاً متاحاً · مستمر",
    cl_search_placeholder: "ابحث برقم الفصل أو العنوان…",
    sort_newest: "الأحدث أولاً",
    sort_oldest: "الأقدم أولاً",
    th_title: "عنوان الفصل",
    th_date: "التاريخ",
    th_read: "اقرأ",
    reader_back: "العودة",
    reader_prev: "‹ السابق",
    reader_next: "التالي ›",
    reader_prev_ch: "الفصل السابق",
    reader_list: "قائمة الفصول",
    reader_next_ch: "الفصل التالي",
    footer_desc: "موقع معجبين غير رسمي لمانغا هنتر × هنتر. جميع الحقوق تعود ليوشيهيرو توغاشي وشوئيشا.",
    footer_navigate: "تصفح",
    footer_quick_read: "قراءة سريعة",
    footer_legal: "قانوني",
    footer_copyright: "© 2026 موقع معجبين هنتر. جميع الحقوق محفوظة.",
    chapter_word: "الفصل",
    latest_release: "آخر إصدار",
    read_arc: "اقرأ الأرك",
    arc_word: "أرك",
    loading_pages: "جاري تحميل الفصل {ch}…",
    no_results: "لم يتم العثور على فصول تطابق: \"{query}\"",
    released_label: "تم النشر",
    read_chapter: "اقرأ الفصل",
    legal_privacy: "سياسة الخصوصية",
    legal_terms: "الشروط والأحكام",
    legal_dmca: "DMCA",
    legal_disclaimer: "إخلاء المسؤولية",
    tab_title_home: "HXH Reader | قراءة مانجا هنتر x هنتر مترجمة",
    tab_title_chapters: "جميع الفصول | HXH Reader",
    seo_h1: "مانجا هانتر × هانتر",
    seo_title_home: "مانجا هانتر × هانتر مترجمة اون لاين — اقرأ مجاناً | HXH Reader",
    seo_title_chapters: "فصول مانجا هانتر × هانتر كاملة — قائمة الفصول | HXH Reader",
    seo_title_chapter: "اقرأ مانجا هانتر الفصل {ch}: {title} مترجم | HXH Reader",
    seo_desc_home: "اقرأ مانجا هانتر × هانتر مترجمة اون لاين مجاناً. جميع فصول مانغا Hunter x Hunter (412+ فصل) من تأليف يوشيهيرو توغاشي مع غون وكيلوا والنين.",
    seo_desc_chapters: "تصفح جميع فصول مانجا هانتر × هانتر (412 فصل) كاملة مترجمة اون لاين. اقرأ مانجا هانتر من الفصل الأول إلى الأخير مجاناً.",
    seo_desc_chapter: "اقرأ مانجا هانتر × هانتر الفصل {ch} مترجم: \"{title}\" اون لاين مجاناً. جزء من أرك {arc}. فصول عالية الجودة.",
    breadcrumb_home: "الرئيسية",
    breadcrumb_chapters: "جميع الفصول",
    breadcrumb_chapter_prefix: "الفصل",
    alt_cover_home: "غلاف مانجا هانتر x هانتر المجلد الأول بواسطة يوشيهيرو توغاشي — اقرأ اون لاين مجاناً",
    alt_cover_about: "لوحة غلاف مانجا هانتر x هانتر غون فريكس من رسم يوشيهيرو توغاشي",
    seo_intro_title: "اقرأ مانجا هانتر × هانتر مترجمة اون لاين مجاناً",
    seo_intro_p1: "أهلاً بكم في HXH Reader، وجهتكم الأولى لقراءة مانجا هانتر × هانتر مترجمة باللغة العربية مجاناً بالكامل. لقد نالت هذه التحفة الفنية للكاتب يوشيهيرو توغاشي إعجاب الملايين منذ انطلاقها في مجلة شونين جمب عام 1998، والآن يمكنك الاستمتاع بجميع فصول هانتر × هانتر (أكثر من 412 فصل) بجودة عالية وبدون إعلانات مزعجة.",
    seo_intro_h_what: "ما هي قصة هانتر × هانتر؟",
    seo_intro_p2: "تدور القصة حول غون فريكس، الفتى الصغير الذي يكتشف أن والده الذي تركه منذ زمن طويل هو في الواقع أحد أعظم الصيادين في العالم. يقرر غون خوض اختبار الصيادين الشاق للعثور على والده، ويلتقي بكيلوا زولديك، كورابيكا، وليوريو ليخوضوا معاً مغامرات لا تُنسى.",
    seo_intro_p3: "يتعلم الأصدقاء الأربعة كيفية استخدام طاقة النين، وهو النظام القتالي الأكثر ابتكاراً وعمقاً في عالم المانجا. تترابط طاقة النين بالشخصية والعواطف، مما يجعل المعارك فريدة ومبنية على الذكاء والتخطيط.",
    seo_intro_h_arcs: "أركات مانجا هانتر × هانتر الرئيسية",
    seo_intro_p4: "تتوزع فصول هانتر × هانتر على عدة أركات مذهلة. ويعد أرك نمل الكيميرا (الفصول 186 إلى 318) من بين الأعظم في تاريخ قصص الشونين، حيث يجسد صراع البقاء بين البشر ونوع متطور من النمل السام.",
    seo_intro_p5: "تتابع الأحداث حالياً في أرك حرب الخلافة المشوق على متن سفينة الحوت الأسود المتجهة نحو القارة المظلمة. كل فصل جديد من المانجا يحمل الكثير من التشويق والمفاجآت غير المتوقعة للجمهور العربي.",
    seo_intro_h_read: "قارئ مانجا هانتر اون لاين — سريع ومتجاوب",
    seo_intro_p6: "يوفر قارئ هانتر × هانتر اون لاين أفضل تجربة قراءة للفصول على الهواتف والأجهزة اللوحية والكمبيوتر. سواء كنت تريد البدء من الفصل الأول أو قراءة الفصل الأخير من هانتر × هانتر فور نزوله، ستجد جميع الفصول مرتبة وسهلة التصفح.",
    seo_intro_p7: "استخدم ميزة البحث المباشر للوصول السريع إلى أرقام الفصول أو تصفح الأركات المختلفة لتجربة مغامرة غون فريكس وكيلوا الاستثنائية من البداية.",
    faq_title: "الأسئلة الشائعة",
    faq_sub: "كل ما تريد معرفته حول قراءة مانجا هانتر x هنتر اون لاين",
    faq_q1: "أين يمكنني قراءة مانجا هانتر × هانتر مترجمة اون لاين مجاناً؟",
    faq_a1: "يمكنك قراءة مانجا هانتر × هانتر مترجمة بالكامل مجاناً هنا على موقع HXH Reader. تتوفر الفصول الـ 412+ بجودة عالية جداً وتصفح سريع ومتوافق مع جميع الشاشات بدون الحاجة للتسجيل أو دفع أي رسوم.",
    faq_q2: "هل مانغا هانتر × هانتر لا تزال مستمرة؟",
    faq_a2: "نعم، مانجا هانتر × هانتر مستمرة ولم تنتهِ بعد. بعد فترة توقف طويلة، عاد المؤلف يوشيهيرو توغاشي للكتابة في عام 2026. والفصل الأحدث هو الفصل 412، ويستكمل الأحدث في أرك حرب الخلافة على متن سفينة الحوت الأسود.",
    faq_q3: "ما هو الفصل الأخير والجديد في هانتر؟",
    faq_a3: "الفصل الأخير المتوفر حالياً هو الفصل 412. يتم إضافة الفصول الجديدة فور صدورها وترجمتها مباشرة بعد النشر الرسمي في مجلة شونين جمب الأسبوعية في اليابان.",
    faq_q4: "هل يمكنني قراءة جميع الفصول باللغة العربية مجاناً؟",
    faq_a4: "نعم! يوفر لك موقعنا إمكانية قراءة جميع فصول هانتر × هانتر مترجمة للعربية مجاناً، بدءاً من الفصل الأول وحتى الفصل 412 مع سرعة تحميل ممتازة للصفحات.",
    faq_q5: "ما هي أركات هانتر × هانتر بترتيب الفصول؟",
    faq_a5: "تتكون السلسلة من 9 أركات رئيسية: اختبار الصيادين (1-38)، عائلة زولديك (39-43)، برج القوة (44-63)، مدينة يوركنيو (64-119)، جزيرة الطمع (120-185)، نمل الكيميرا (186-318)، انتخاب رئيس الصيادين (319-339)، القارة المظلمة (340-348) وحرب الخلافة (349-412).",
    read_chapter_prefix: "أنت تقرأ حالياً:",
    read_arc_prefix: "هذا الفصل هو جزء من أرك",
    read_nav_hint: "استخدم أزرار التنقل بالأسفل أو أسهم لوحة المفاتيح للتبديل بين فصول المانجا بسهولة."
  }
};

const ARC_TRANSLATIONS = {
  EN: {
    1: { name: "Hunter Exam Arc", desc: "Gon leaves his home island to take the grueling Hunter Exam, making lifelong friends Killua, Kurapika, and Leorio while facing deadly trials." },
    2: { name: "Zoldyck Family Arc", desc: "Gon, Kurapika, and Leorio travel to Kukuroo Mountain to rescue Killua from his family of elite assassins." },
    3: { name: "Heavens Arena Arc", desc: "Gon and Killua train at the tower of martial arts, where they learn the mysterious power of Nen from master Wing." },
    4: { name: "Yorknew City Arc", desc: "The protagonists reunite in Yorknew City, where Kurapika seeks vengeance against the Phantom Troupe who slaughtered his clan." },
    5: { name: "Greed Island Arc", desc: "Gon and Killua enter a legendary, dangerous Nen-based video game created by Gon's father, training under Biscuit Krueger." },
    6: { name: "Chimera Ant Arc", desc: "A dark and legendary saga where humanity faces an existential threat from mutant insects, forcing the Hunters into a brutal war." },
    7: { name: "13th Chairman Election Arc", desc: "As Netero's successor is chosen through complex political maneuverings, Killua seeks to heal a hospitalized Gon using Alluka's power." },
    8: { name: "Dark Continent Expedition", desc: "Beyond the known world lies a hostile frontier of unimaginable horrors and riches, prompting the world's powers to assemble." },
    9: { name: "Succession Contest Arc", desc: "A deadly royal battle royale unfolds aboard the giant ship Black Whale 1 en route to the Dark Continent, with Kurapika guarding a young prince." }
  },
  FR: {
    1: { name: "Arc de l'Examen de Hunter", desc: "Gon quitte son île natale pour passer l'éreintant examen de Hunter, se faisant des amis pour la vie tout en affrontant des épreuves mortelles." },
    2: { name: "Arc de la Famille Zoldik", desc: "Gon, Kurapika et Leorio se rendent au mont Kukuroo pour sauver Killua des griffes de sa famille d'assassins d'élite." },
    3: { name: "Arc de la Tour Celeste", desc: "Gon et Killua s'entraînent dans la tour des arts martiaux, où ils apprennent le pouvoir mystérieux du Nen auprès du maître Wing." },
    4: { name: "Arc de Yorknew City", desc: "Les protagonistes se réunissent à Yorknew City, où Kurapika cherche à se venger de la Brigade Fantôme qui a massacré son clan." },
    5: { name: "Arc de Greed Island", desc: "Gon et Killua entrent dans un jeu vidéo légendaire et dangereux basé sur le Nen, créé par le père de Gon, sous la tutelle de Biscuit Krueger." },
    6: { name: "Arc des Fourmis Chimères", desc: "Une saga sombre et légendaire où l'humanité fait face à une menace existentielle d'insectes mutants, forçant les Hunters à une guerre brutale." },
    7: { name: "Arc de l'Élection du 13e Président", desc: "Alors que le successeur de Netero est choisi à travers des intrigues politiques complexes, Killua cherche à guérir Gon avec le pouvoir d'Alluka." },
    8: { name: "Arc de l'Expédition du Continent Obscur", desc: "Au-delà du monde connu se trouve une frontière hostile d'horreurs et de richesses inimaginables, incitant les puissances mondiales à s'assembler." },
    9: { name: "Arc de la Succession Royale", desc: "Une bataille royale mortelle se déroule à bord du navire géant Black Whale 1 en route vers le Continent Obscur, Kurapika protégeant un jeune prince." }
  },
  ES: {
    1: { name: "Arco del Examen del Cazador", desc: "Gon deja su isla natal para tomar el agotador Examen de Cazador, haciendo amigos de por vida como Killua, Kurapika y Leorio mientras enfrenta pruebas mortales." },
    2: { name: "Arco de la Familia Zoldyck", desc: "Gon, Kurapika y Leorio viajan a la montaña Kukuroo para rescatar a Killua de su familia de asesinos de élite." },
    3: { name: "Arco del Coliseo del Cielo", desc: "Gon y Killua entrenan en la torre de artes marciales, donde aprenden el misterioso poder del Nen con el vaso Wing." },
    4: { name: "Arco de la Ciudad de Yorknew", desc: "Los protagonistas se reúnen en Yorknew, donde Kurapika busca venganza contra la Brigada Fantasma que masacró a su clan." },
    5: { name: "Arco de Greed Island", desc: "Gon y Killua entran en un videojuego legendario y peligroso basado en Nen creado por el padre de Gon, entrenando bajo Biscuit Krueger." },
    6: { name: "Arco de las Hormigas Quimera", desc: "Una saga oscura y legendaria donde la humanidad enfrenta una amenaza existencial de insectos mutantes, forzando a los Cazadores a una guerra brutal." },
    7: { name: "Arco de la Elección del 13° Presidente", desc: "Mientras se elige al sucesor de Netero mediante complejas maniobras políticas, Killua busca curar a Gon usando el poder de Alluka." },
    8: { name: "Arco de la Expedición al Continente Oscuro", desc: "Más allá del mundo conocido se encuentra una frontera hostil de inimaginables horrores y riquezas, lo que impulsa a las potencias mundiales a reunirse." },
    9: { name: "Arco del Concurso de Sucesión", desc: "Una batalla real mortal se desarrolla a bordo del barco gigante Black Whale 1 en ruta al Continente Oscuro, con Kurapika vigilando a un joven príncipe." }
  },
  DE: {
    1: { name: "Hunter-Prüfung Arc", desc: "Gon verlässt seine Heimatinsel, um die zermürbende Hunter-Prüfung abzulegen, schließt lebenslange Freundschaften und stellt sich tödlichen Prüfungen." },
    2: { name: "Zoldyck-Familie Arc", desc: "Gon, Kurapika und Leorio reisen zum Kukuroo-Berg, um Killua aus den Händen seiner Familie von Elite-Attentätern zu retten." },
    3: { name: "Himmelsarena Arc", desc: "Gon und Killua trainieren im Turm der Kampfkünste, wo sie die geheimnisvolle Kraft des Nen von Meister Wing erlernen." },
    4: { name: "Yorknew City Arc", desc: "Die Protagonisten treffen sich in Yorknew City wieder, wo Kurapika Rache an der Phantom-Truppe sucht, die seinen Clan abgeschlachtet hat." },
    5: { name: "Greed Island Arc", desc: "Gon und Killua betreten ein legendäres, gefährliches Nen-Videospiel, das von Gons Vater entwickelt wurde, und trainieren unter Biscuit Krueger." },
    6: { name: "Ameisen-Arc (Chimera Ant)", desc: "Eine düstere Saga, in der die Menschheit einer existentiellen Bedrohung durch mutierte Insekten gegenübersteht und die Hunter in einen brutalen Krieg zwingt." },
    7: { name: "13. Vorsitzendenwahl Arc", desc: "Während Neteros Nachfolger durch politische Manöver gewählt wird, versucht Killua, Gon mit der Kraft von Alluka zu heilen." },
    8: { name: "Dunkler Kontinent Expedition", desc: "Jenseits der bekannten Welt liegt eine feindselige Grenze unvorstellbarer Schrecken und Reichtümer, die die Weltmächte zur Versammlung zwingt." },
    9: { name: "Nachfolge-Wettbewerb Arc", desc: "Ein tödlicher königlicher Kampf entfaltet sich an Bord des Riesenschiffs Black Whale 1 auf dem Weg zum Dunklen Kontinent, während Kurapika einen jungen Prinzen bewacht." }
  },
  TR: {
    1: { name: "Avcı Sınavı Arkı", desc: "Gon, ölümcül sınavlarla yüzleşirken Killua, Kurapika ve Leorio ile ömür boyu sürecek dostluklar kuracağı zorlu Avcı Sınavı için adasından ayrılır." },
    2: { name: "Zoldyck Ailesi Arkı", desc: "Gon, Kurapika ve Leorio, Killua'yı suikastçı ailesinden kurtarmak için Kukuroo Dağı'na seyahat eder." },
    3: { name: "Gökyüzü Arenası Arkı", desc: "Gon ve Killua, Wing ustadan Nen'in gizemli gücünü öğrendikleri dövüş sanatları kulesinde eğitim alırlar." },
    4: { name: "Yorknew Şehri Arkı", desc: "Kahramanlarımız, Kurapika'nın klanını katleden Hayalet Takımı'ndan intikam almak istediği Yorknew Şehri'nde yeniden bir araya gelir." },
    5: { name: "Greed Island Arkı", desc: "Gon ve Killua, Gon'un babası tarafından yaratılan Nen tabanlı efsanevi ve tehlikeli bir video oyununa girerek Biscuit gözetiminde eğitilir." },
    6: { name: "Kamera Karıncası Arkı", desc: "İnsanlığın mutant böceklerin varoluşsal tehdidiyle karşı karşıya kaldığı ve Avcıları acımasız bir savaşa sürükleyen karanlık ve efsanevi bir destan." },
    7: { name: "13. Başkanlık Seçimi Arkı", desc: "Netero'nun halefi karmaşık siyasi manevralarla seçilirken, Killua Alluka'nın gücünü kullanarak hastanedeki Gon'u iyileştirmeye çalışır." },
    8: { name: "Karanlık Kıta Seferi", desc: "Bilinen dünyanın ötesinde, hayal edilemez dehşetlerin ve zenginliklerin yer aldığı, dünya güçlerinin bir araya gelmesini gerektiren düşmanca bir sınır uzanır." },
    9: { name: "Taht Veraseti Savaşı Arkı", desc: "Karanlık Kıta'ya giden devasa Black Whale 1 gemisinde, Kurapika'nın genç bir prensi koruduğu ölümcül bir kraliyet savaşı başlar." }
  },
  JP: {
    1: { name: "ハンター試験編", desc: "ゴンは過酷なハンター試験に挑むため故郷の島を旅立ち、キルア、クラピカ、レオリオといった生涯の友と出会い、命がけの試練に立ち向かう。" },
    2: { name: "ゾルディック家編", desc: "ゴン、クラピカ、レオリオは、エリート暗殺者一家からキルアを救い出すため、ククルーマウンテンへと向かう。" },
    3: { name: "天空闘技場編", desc: "ゴンとキルアは武闘の塔で修行し、心源流の師範代ウイングから念（ねん）という未知の力を学ぶ。" },
    4: { name: "ヨークシンシティ編", desc: "ヨークシンで再会した一行。クラピカは同胞を虐殺した幻影旅団（クモ）への復讐の火を燃やす。" },
    5: { name: "グリードアイランド編", desc: "ゴンの父が作った念能力者専用の伝説のゲーム「G.I」に挑むゴンとキルア。ビスケの指導のもと修行を重ねる。" },
    6: { name: "キメラ＝アント編", desc: "突然変異した昆虫と人類の存亡をかけた、壮絶でダークな戦い。ハンター協会は総力を挙げて討伐に向かう。" },
    7: { name: "会長選挙・アルカ編", desc: "ネテロの後継者を決める選挙の裏で、キルアは傷ついたゴンを救うため、妹アルカの能力を借りるべく動く。" },
    8: { name: "暗黒大陸遠征編", desc: "世界の境界線の外側に広がる、未踏の領域「暗黒大陸」。人類の生存を脅かす災厄と未知のリターンを求め、各勢力が動き出す。" },
    9: { name: "王位継承戦編", desc: "暗黒大陸を目指す巨大船「ブラック・ホエール1号」の内部で、カキン帝国の王子たちによる凄惨な殺し合いが始まる。クラピカは護衛として参戦する。" }
  },
  AR: {
    1: { name: "أرك اختبار الصيادين", desc: "يغادر غون جزيرته لخوض اختبار الصيادين الصعب، حيث يلتقي بكيلوا، كورابيكا، وليوريو ويواجه تجارب مميتة." },
    2: { name: "أرك عائلة زولديك", desc: "يسافر غون وكورابيكا وليوريو إلى جبل كوكورو لإنقاذ كيلوا من عائله الشهيرة من القتلة المأجورين النخبة." },
    3: { name: "أرك برج القوة (حلبة السماء)", desc: "يتدرب غون وكيلوا في برج الفنون القتالية، حيث يتعلمان القوة الغامضة للنين تحت إشراف المعلم وينغ." },
    4: { name: "أرك مدينة يوركنيو", desc: "يجتمع الأصدقاء في مدينة يوركنيو، حيث يسعى كورابيكا للانتقام من عصابة ريودان (العنكبوت) التي أبادرت عشيرته." },
    5: { name: "أرك جزيرة الطمع (غريد آيلاند)", desc: "يدخل غون وكيلوا لعبة فيديو أسطورية وخطيرة تعتمد على النين صممها والد غون، ويتدربان تحت إشراف بيسكيت كروغر." },
    6: { name: "أرك نمل الكيميرا", desc: "ملحمة مظلمة وأسطورية تواجه فيها البشرية تهديداً وجودياً من حشرات متحولة، مما يجبر الصيادين على خوض حرب وحشية." },
    7: { name: "أرك انتخاب رئيس الصيادين الـ13", desc: "بينما يتم اختيار خليفة نيتيرو من خلال مناورات سياسية معقدة، يسعى كيلوا لشفاء غون المصاب باستخدام قوة ألوكا." },
    8: { name: "أرك استكشاف القارة المظلمة", desc: "خلف العالم المعروف تقع حدود معادية من أهوال وثروات لا يمكن تصورها، مما يدفع القوى العالمية للاستعداد والاجتماع." },
    9: { name: "أرك حرب الخلافة", desc: "معركة ملكية مميتة تنكشف على متن سفينة الحوت الأسود الضخمة المتجهة إلى القارة المظلمة، مع كورابيكا الذي يحرس أميراً شاباً." }
  }
};

/** Translate the entire site UI to active language */
function translateUI() {
  const lang = currentState.currentLang || 'EN';
  
  // Set html lang + dir attribute
  document.documentElement.lang = lang === 'JP' ? 'ja' : lang === 'AR' ? 'ar' : lang.toLowerCase();
  document.documentElement.dir = lang === 'AR' ? 'rtl' : 'ltr';

  // Translate standard text fields
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);
    
    if (el.children.length === 0) {
      el.textContent = text;
    } else {
      // Preserve SVG icon nodes, only overwrite textual nodes
      Array.from(el.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim() !== '') {
          node.nodeValue = text;
        }
      });
    }
  });

  // Translate inputs placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });

  // Translate ARIA labels
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label');
    el.setAttribute('aria-label', t(key));
  });

  // Translate image alt texts
  document.querySelectorAll('[data-i18n-alt]').forEach(el => {
    const key = el.getAttribute('data-i18n-alt');
    el.alt = t(key);
  });

  // Translate breadcrumb labels in chapter list view
  const bcHome = document.querySelector('#chapters-breadcrumb .breadcrumb-item a');
  if (bcHome) bcHome.textContent = t('breadcrumb_home');
  const bcChapters = document.querySelector('#chapters-breadcrumb .breadcrumb-current');
  if (bcChapters) bcChapters.textContent = t('breadcrumb_chapters');

  // Translate breadcrumb labels in reader view
  const readerBcItems = document.querySelectorAll('#reader-breadcrumb .breadcrumb-item a');
  if (readerBcItems.length >= 1) readerBcItems[0].textContent = t('breadcrumb_home');
  if (readerBcItems.length >= 2) readerBcItems[1].textContent = t('breadcrumb_chapters');

  // Translate dynamic sort labels
  const sortLabel = document.getElementById('sort-label');
  if (sortLabel) {
    sortLabel.textContent = currentState.sortNewestFirst ? t('sort_newest') : t('sort_oldest');
  }

  // Rerender lists and dynamic UI elements to apply translation dynamically
  updateDynamicUi();
  renderArcs();
  renderRecentChapters();
  
  // Update view specific header titles
  if (currentState.currentView === 'reader') {
    const chNum = currentState.currentChapter;
    const chData = CHAPTERS.find(c => c.number === chNum);
    const titleText = chData ? `${formatChapterNumber(chNum)} — ${chData.title}` : `${t('chapter_word')} ${chNum}`;
    
    const rTitle = document.getElementById('reader-title');
    if (rTitle) rTitle.textContent = titleText;
    
    const rInfo = document.getElementById('reader-chapter-info');
    if (rInfo) {
      const arc = ARCS.find(a => chNum >= a.start && chNum <= a.end);
      const translatedArc = ARC_TRANSLATIONS[lang] ? ARC_TRANSLATIONS[lang][arc.id] : null;
      const arcName = translatedArc ? translatedArc.name : (arc ? arc.name : '');
      rInfo.innerHTML = `
        <h2>${titleText}</h2>
        ${arc ? `<p style="color: ${arc.color}; font-weight: 600; margin-top: 4px; font-size: 0.8rem; text-transform: uppercase;">${arcName}</p>` : ''}
        <p class="reader-intro-text">${t('read_chapter_prefix')} <strong>${titleText}</strong>.${arc ? ' ' + t('read_arc_prefix') + ' <strong>' + arcName + '</strong>.' : ''} ${t('read_nav_hint')}</p>
      `;

      // Update reader breadcrumb current item
      const rBcCurrent = document.getElementById('reader-breadcrumb-current');
      if (rBcCurrent) rBcCurrent.textContent = `${t('breadcrumb_chapter_prefix')} ${chNum}${chData ? ': ' + chData.title : ''}`;
    }
  }

  // Always update all SEO head tags when language changes
  updateClientSeo();
}

/** Dynamically update <title>, meta, canonical, hreflang, OG, Twitter & JSON-LD for current language + view */
function updateClientSeo() {
  const lang = currentState.currentLang || 'EN';
  const langMap = { EN: 'en', FR: 'fr', ES: 'es', DE: 'de', TR: 'tr', JP: 'ja', AR: 'ar' };
  const langPrefix = langMap[lang] || 'en';
  const siteUrl = window.location.origin;
  const LANG_CODES = ['en', 'es', 'fr', 'de', 'tr', 'ja', 'ar'];

  let title = '';
  let desc = '';
  let pagePath = '/';

  if (currentState.currentView === 'chapters') {
    title = t('seo_title_chapters');
    desc   = t('seo_desc_chapters');
    pagePath = `/${langPrefix}/chapters`;
  } else if (currentState.currentView === 'reader') {
    const chNum  = currentState.currentChapter;
    const chData = CHAPTERS.find(c => c.number === chNum);
    const chTitle = chData ? chData.title : `Chapter ${chNum}`;
    const arc = ARCS.find(a => chNum >= a.start && chNum <= a.end);
    const arcTrans = arc && ARC_TRANSLATIONS[lang] ? ARC_TRANSLATIONS[lang][arc.id] : null;
    const arcName = arcTrans ? arcTrans.name : (arc ? arc.name : '');
    title = t('seo_title_chapter').replace('{ch}', chNum).replace('{title}', chTitle).replace('{arc}', arcName);
    desc  = t('seo_desc_chapter').replace('{ch}', chNum).replace('{title}', chTitle).replace('{arc}', arcName);
    pagePath = `/${langPrefix}/chapter/${chNum}`;
  } else {
    title = t('seo_title_home');
    desc  = t('seo_desc_home');
    pagePath = `/${langPrefix}/`;
  }

  // ── <title> ──
  document.title = title;

  // ── Meta description ──
  let metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', desc);

  // ── Canonical ──
  let canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', `${siteUrl}${pagePath}`);

  // ── Open Graph ──
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', title);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', desc);
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', `${siteUrl}${pagePath}`);
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  if (ogLocale) {
    const localeMap = { en: 'en_US', fr: 'fr_FR', es: 'es_ES', de: 'de_DE', tr: 'tr_TR', ja: 'ja_JP', ar: 'ar_SA' };
    ogLocale.setAttribute('content', localeMap[langPrefix] || 'en_US');
  }

  // ── Twitter Card ──
  const twTitle = document.querySelector('meta[name="twitter:title"]');
  if (twTitle) twTitle.setAttribute('content', title);
  const twDesc = document.querySelector('meta[name="twitter:description"]');
  if (twDesc) twDesc.setAttribute('content', desc);

  // ── hreflang alternates ──
  // Determine the sub-path (without language prefix)
  let subPath = '/';
  if (currentState.currentView === 'chapters') {
    subPath = '/chapters';
  } else if (currentState.currentView === 'reader') {
    subPath = `/chapter/${currentState.currentChapter}`;
  }

  LANG_CODES.forEach(lc => {
    let link = document.querySelector(`link[rel="alternate"][hreflang="${lc}"]`);
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', lc);
      document.head.appendChild(link);
    }
    link.setAttribute('href', `${siteUrl}/${lc}${subPath === '/' ? '/' : subPath}`);
  });

  // x-default always points to English
  let xDefault = document.querySelector('link[rel="alternate"][hreflang="x-default"]');
  if (!xDefault) {
    xDefault = document.createElement('link');
    xDefault.setAttribute('rel', 'alternate');
    xDefault.setAttribute('hreflang', 'x-default');
    document.head.appendChild(xDefault);
  }
  xDefault.setAttribute('href', `${siteUrl}/en${subPath === '/' ? '/' : subPath}`);

  // ── JSON-LD structured data ──
  const script = document.getElementById('structured-data');
  if (script) {
    const schema = buildSeoSchema(lang, siteUrl, pagePath, title, desc);
    script.textContent = JSON.stringify(schema, null, 2);
  }
}

/** Build locale-aware JSON-LD schema for current view */
function buildSeoSchema(lang, siteUrl, pagePath, title, desc) {
  const authorName = lang === 'JP' ? '冨樫義博' : lang === 'AR' ? 'يوشيهيرو توغاشي' : 'Yoshihiro Togashi';
  const seriesName = lang === 'JP' ? 'ハンター×ハンター' : lang === 'AR' ? 'هنتر × هنتر' : 'Hunter × Hunter';
  const coverUrl = `${siteUrl}/cover-image`;

  const homeBc = { '@type': 'ListItem', position: 1, name: t('breadcrumb_home'), item: `${siteUrl}/` };
  const chapsBc = { '@type': 'ListItem', position: 2, name: t('breadcrumb_chapters'), item: `${siteUrl}/chapters` };

  if (currentState.currentView === 'home') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${siteUrl}/#website`,
          url: `${siteUrl}/`,
          name: `HXH Reader — ${t('seo_h1')}`,
          description: desc,
          inLanguage: document.documentElement.lang,
          potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/chapters?search={search_term_string}` },
            'query-input': 'required name=search_term_string'
          }
        },
        {
          '@type': 'BookSeries',
          name: seriesName,
          author: { '@type': 'Person', name: authorName },
          url: `${siteUrl}/`,
          genre: ['Action', 'Adventure', 'Fantasy', 'Shounen'],
          numberOfVolumes: '37',
          inLanguage: document.documentElement.lang
        },
        { '@type': 'BreadcrumbList', itemListElement: [homeBc] },
        {
          '@type': 'FAQPage',
          mainEntity: [
            { '@type': 'Question', name: t('faq_q1'), acceptedAnswer: { '@type': 'Answer', text: t('faq_a1') } },
            { '@type': 'Question', name: t('faq_q2'), acceptedAnswer: { '@type': 'Answer', text: t('faq_a2') } },
            { '@type': 'Question', name: t('faq_q3'), acceptedAnswer: { '@type': 'Answer', text: t('faq_a3') } },
            { '@type': 'Question', name: t('faq_q4'), acceptedAnswer: { '@type': 'Answer', text: t('faq_a4') } },
            { '@type': 'Question', name: t('faq_q5'), acceptedAnswer: { '@type': 'Answer', text: t('faq_a5') } }
          ]
        }
      ]
    };
  }

  if (currentState.currentView === 'chapters') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'CollectionPage', name: title, description: desc, url: `${siteUrl}${pagePath}`, inLanguage: document.documentElement.lang },
        { '@type': 'BreadcrumbList', itemListElement: [homeBc, chapsBc] }
      ]
    };
  }

  if (currentState.currentView === 'reader') {
    const chNum = currentState.currentChapter;
    const chData = CHAPTERS.find(c => c.number === chNum);
    const chTitle = chData ? chData.title : `Chapter ${chNum}`;
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: title,
          description: desc,
          image: coverUrl,
          author: { '@type': 'Person', name: authorName },
          publisher: { '@type': 'Organization', name: 'HXH Reader', url: siteUrl },
          inLanguage: document.documentElement.lang,
          isPartOf: { '@type': 'BookSeries', name: seriesName, url: siteUrl }
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            homeBc, chapsBc,
            { '@type': 'ListItem', position: 3, name: `${t('breadcrumb_chapter_prefix')} ${chNum}: ${chTitle}`, item: `${siteUrl}${pagePath}` }
          ]
        }
      ]
    };
  }

  return {};
}

/** Translate lookup helper with dynamic chapter count and latest chapter substitution */
function t(key) {
  const lang = currentState.currentLang || 'EN';
  let text = (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || (TRANSLATIONS['EN'] && TRANSLATIONS['EN'][key]) || key;
  const latestNum = CHAPTERS.length > 0 ? CHAPTERS[CHAPTERS.length - 1].number : 419;
  const countCh   = CHAPTERS.length > 0 ? CHAPTERS.length : 419;

  return text
    .replace(/\{ch\}/g, latestNum)
    .replace(/\{count\}/g, countCh)
    .replace(/\b412\b/g, latestNum);
}

/** Update hero badge, stats counter, latest chapter button, and footer links dynamically */
function updateDynamicUi() {
  const totalCount = CHAPTERS.length;
  const latestCh   = totalCount > 0 ? CHAPTERS[totalCount - 1] : { number: 419, title: 'Chapter 419' };
  const latestNum  = latestCh.number;

  // 1. Hero badge: "Ongoing · Chapter {LATEST_CHAPTER.number}"
  const heroBadge = document.querySelector('.hero-badge span[data-i18n="hero_ongoing"]');
  if (heroBadge) {
    const rawBadgeText = t('hero_ongoing');
    heroBadge.textContent = rawBadgeText.replace('{ch}', latestNum).replace(/\b412\b/g, latestNum);
  }

  // 2. Latest chapter button: link to /chapter/{LATEST_CHAPTER.number}
  const latestBtn = document.getElementById('hero-latest-btn');
  if (latestBtn) {
    latestBtn.onclick = () => readLatestChapter();
    latestBtn.setAttribute('aria-label', `Read Hunter x Hunter latest chapter — Chapter ${latestNum}`);
  }

  // 3. Start Reading button: link to /chapter/1 (always Chapter 1)
  const startBtn = document.getElementById('hero-start-btn');
  if (startBtn) {
    startBtn.onclick = () => readChapter(1);
    startBtn.setAttribute('aria-label', 'Start reading Hunter x Hunter from Chapter 1');
  }

  // 4. Homepage statistics: CHAPTERS.length chapters available
  const statCount = document.getElementById('stat-chapters-count');
  if (statCount) {
    statCount.textContent = totalCount;
  }

  // 5. Footer latest link
  const footerLatest = document.getElementById('footer-latest-link');
  if (footerLatest) {
    footerLatest.href = `/chapter/${latestNum}`;
    footerLatest.textContent = `${t('breadcrumb_chapter_prefix')} ${latestNum} — ${t('latest_release')}`;
  }
}

function readLatestChapter() {
  const latestNum = CHAPTERS.length > 0 ? CHAPTERS[CHAPTERS.length - 1].number : 1;
  navigateTo(`/chapter/${latestNum}`);
}

/** Dynamic chapter formatting based on language styles */
function formatChapterNumber(num) {
  const lang = currentState.currentLang || 'EN';
  if (lang === 'JP') {
    return `第 ${num} 話`;
  } else if (lang === 'AR') {
    return `${t('chapter_word')} ${num}`;
  } else {
    return `${t('chapter_word')} ${num}`;
  }
}

