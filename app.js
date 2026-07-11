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
  searchQuery: ''
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
  
  // Close mobile menu when clicking any link inside it
  const mobMenu = document.getElementById('mobile-menu');
  if (mobMenu) {
    mobMenu.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        toggleMobileMenu();
      }
    });
  }
  
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

  document.title = 'HXH Reader';

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

  document.title = 'All Chapters | HXH Reader';

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
          searchInput.value = `Arc ${arc.id}`;
          filterChapters(searchInput.value);
        }
      }, 50);
    };

    card.innerHTML = `
      <div class="arc-num" style="color: ${arc.color}">Arc ${arc.id}</div>
      <h3 class="arc-name">${arc.name}</h3>
      <div class="arc-range">${arc.range}</div>
      <p class="arc-desc">${arc.desc}</p>
      <div class="arc-read-btn" style="background: ${arc.color}15; color: ${arc.color}">
        Read Arc
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
      <div class="recent-ch-num">Chapter ${ch.number}</div>
      <div class="recent-ch-title">${ch.title}</div>
      <div class="recent-ch-date">Latest Release</div>
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
    // Check if the query is an Arc filter
    const arcMatch = q.match(/^arc\s+(\d+)$/);
    if (arcMatch) {
      const arcId = parseInt(arcMatch[1]);
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
    clTbody.innerHTML = `<tr><td colspan="4" class="no-results">No chapters found for "${currentState.searchQuery}"</td></tr>`;
    return;
  }

  filtered.forEach(ch => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${ch.number}</td>
      <td class="ch-title-cell"><a href="#/chapter/${ch.number}">${ch.title}</a></td>
      <td class="ch-date-cell hide-mobile">Released</td>
      <td>
        <a href="#/chapter/${ch.number}" class="ch-read-btn" aria-label="Read Chapter ${ch.number}">
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
    label.textContent = currentState.sortNewestFirst ? 'Newest First' : 'Oldest First';
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
  const titleText = chData ? `Chapter ${chNum} — ${chData.title}` : `Chapter ${chNum}`;
  readerTitle.textContent = titleText;
  document.title = chData
    ? `Ch. ${chNum} — ${chData.title} | HXH Reader`
    : `Chapter ${chNum} | HXH Reader`;
  
  // Update header/navigation UI details
  readerChIndicator.textContent = `${chNum} / ${CHAPTERS.length}`;
  
  // Set prev/next buttons disabled states
  prevChBtn.disabled = chNum <= 1;
  prevChBtn2.disabled = chNum <= 1;
  nextChBtn.disabled = chNum >= CHAPTERS.length;
  nextChBtn2.disabled = chNum >= CHAPTERS.length;

  // Load Arc association info
  const arc = ARCS.find(a => chNum >= a.start && chNum <= a.end);
  readerChapterInfo.innerHTML = `
    <h2>${titleText}</h2>
    ${arc ? `<p style="color: ${arc.color}; font-weight: 600; margin-top: 4px; font-size: 0.8rem; text-transform: uppercase;">${arc.name}</p>` : ''}
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
  loadingMsg.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" style="margin-bottom:12px; animation: spin 1.2s linear infinite;">
      <circle cx="12" cy="12" r="10" stroke-dasharray="31.4" stroke-dashoffset="10"/>
    </svg>
    <p>Loading chapter ${chNum}…</p>
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
