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
    range: "Chapters 349 – 412",
    start: 349,
    end: 412,
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
  renderChapterTable();
  setupParticles();
  setupScrollHandlers();
  initLang(); // Restore persisted language
  
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
  
  // Parse initial route if there is a hash
  handleHashRoute();
  window.addEventListener('hashchange', handleHashRoute);
});

// ── Routing & Hash Handling ──
function handleHashRoute() {
  const hash = window.location.hash;
  if (hash.startsWith('#/chapter/')) {
    const chNum = parseInt(hash.replace('#/chapter/', ''));
    if (!isNaN(chNum) && chNum >= 1 && chNum <= 412) {
      readChapter(chNum, false);
      return;
    }
  } else if (hash === '#/chapters') {
    showChapterList(false);
    return;
  } else if (hash === '#about-section') {
    showHome(false);
    setTimeout(() => {
      const el = document.getElementById('about-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return;
  }
  
  showHome(false);
}

function updateHashRoute() {
  if (currentState.currentView === 'reader') {
    window.location.hash = `#/chapter/${currentState.currentChapter}`;
  } else if (currentState.currentView === 'chapters') {
    window.location.hash = `#/chapters`;
  } else {
    // If the hash is already about-section, don't overwrite it
    if (window.location.hash !== '#about-section') {
      window.location.hash = `#/`;
    }
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

  const activeTitle = t('tab_title_home');
  document.title = activeTitle;
  trackPageView('/', activeTitle);

  const hash = window.location.hash;
  if (hash !== '#about-section') {
    window.scrollTo({ top: 0 });
  }
  if (updateHash) updateHashRoute();
}

function showChapterList(updateHash = true) {
  currentState.currentView = 'chapters';
  homeView.classList.add('hidden');
  chapterListView.classList.remove('hidden');
  readerView.classList.add('hidden');

  navHome.classList.remove('active');
  navChapters.classList.add('active');

  const activeTitle = t('tab_title_chapters');
  document.title = activeTitle;
  trackPageView('/chapters', activeTitle);

  window.scrollTo({ top: 0 });
  if (updateHash) updateHashRoute();
  renderChapterTable();
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
  });
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
    card.style.setProperty('--border-glow', arc.color);
    card.style.borderTop = `3px solid ${arc.color}`;
    
    card.onclick = () => {
      window.location.hash = '#/chapters';
      setTimeout(() => {
        const searchInput = document.getElementById('cl-search');
        if (searchInput) {
          // Use the word Arc in search input
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

function renderRecentChapters() {
  recentGrid.innerHTML = '';
  // Show the last 6 chapters
  const recent = CHAPTERS.slice(-6).reverse();
  recent.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'recent-card animate-in';
    card.onclick = () => {
      window.location.hash = `#/chapter/${ch.number}`;
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
      <td class="ch-title-cell"><a href="#/chapter/${ch.number}">${ch.title}</a></td>
      <td class="ch-date-cell hide-mobile">${t('released_label')}</td>
      <td>
        <a href="#/chapter/${ch.number}" class="ch-read-btn" aria-label="${t('read_chapter')} ${ch.number}">
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
  if (updateHash) updateHashRoute();

  // Find chapter details
  const chData = CHAPTERS.find(c => c.number === chNum);
  const titleText = chData ? `${formatChapterNumber(chNum)} — ${chData.title}` : `${t('chapter_word')} ${chNum}`;
  readerTitle.textContent = titleText;
  
  const newTitle = chData
    ? `${formatChapterNumber(chNum)} — ${chData.title} | ${t('tab_title_home')}`
    : `${t('chapter_word')} ${chNum} | ${t('tab_title_home')}`;
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
  
  readerChapterInfo.innerHTML = `
    <h2>${titleText}</h2>
    ${arc ? `<p style="color: ${arc.color}; font-weight: 600; margin-top: 4px; font-size: 0.8rem; text-transform: uppercase;">${arcName}</p>` : ''}
  `;

  // Start reading images — fetch all page URLs from the server first
  readerPages.innerHTML = '';
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

  // Render all pages
  images.forEach((rawUrl, idx) => {
    const pageContainer = document.createElement('div');
    pageContainer.style.width = '100%';
    pageContainer.style.display = 'flex';
    pageContainer.style.justifyContent = 'center';
    pageContainer.style.position = 'relative';

    const skeleton = document.createElement('div');
    skeleton.className = 'page-skeleton';
    pageContainer.appendChild(skeleton);
    readerPages.appendChild(pageContainer);

    const img = document.createElement('img');
    img.className = 'reader-page-img hidden';
    img.alt = `Chapter ${chNum} Page ${idx + 1}`;
    img.src = `/proxy-image?url=${encodeURIComponent(rawUrl)}`;

    img.onload = () => {
      skeleton.remove();
      img.classList.remove('hidden');
    };

    img.onerror = () => {
      pageContainer.remove();
    };

    pageContainer.appendChild(img);
  });
}

function navigateChapter(direction) {
  const targetCh = currentState.currentChapter + direction;
  if (targetCh >= 1 && targetCh <= CHAPTERS.length) {
    window.location.hash = `#/chapter/${targetCh}`;
  }
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
  const saved = localStorage.getItem(LANG_STORAGE_KEY) || 'EN';
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
    tab_title_chapters: "All Chapters | HXH Reader"
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
    tab_title_chapters: "Tous les chapitres | HXH Reader"
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
    tab_title_chapters: "Todos los capítulos | HXH Reader"
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
    tab_title_chapters: "Alle Kapitel | HXH Reader"
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
    tab_title_chapters: "Tüm Bölümler | HXH Reader"
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
    tab_title_chapters: "全話一覧 | HXH Reader"
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
    tab_title_chapters: "جميع الفصول | HXH Reader"
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

  // Translate dynamic sort labels
  const sortLabel = document.getElementById('sort-label');
  if (sortLabel) {
    sortLabel.textContent = currentState.sortNewestFirst ? t('sort_newest') : t('sort_oldest');
  }

  // Rerender lists to apply translation dynamically
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
      `;
    }
    
    // Update reader tab title
    const newTitle = chData
      ? `${formatChapterNumber(chNum)} — ${chData.title} | ${t('tab_title_home')}`
      : `${t('chapter_word')} ${chNum} | ${t('tab_title_home')}`;
    document.title = newTitle;
  }
}

/** Translate lookup helper */
function t(key) {
  const lang = currentState.currentLang || 'EN';
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || (TRANSLATIONS['EN'] && TRANSLATIONS['EN'][key]) || key;
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

