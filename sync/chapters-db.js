'use strict';

/**
 * sync/chapters-db.js
 *
 * Manages the persistent state layer for the chapter sync system.
 * Handles reading/writing chapters.js and sync-state.json.
 *
 * chapters.js  — append-only; holds chapter metadata for the browser client
 * sync-state.json — lightweight JSON state (last checked chapter, ID map)
 */

const fs   = require('fs');
const path = require('path');

const ROOT_DIR        = path.join(__dirname, '..');
const CHAPTERS_FILE   = path.join(ROOT_DIR, 'chapters.js');
const STATE_FILE      = path.join(__dirname, 'sync-state.json');
const STATE_FILE_TMP  = STATE_FILE + '.tmp';

// ── State helpers ────────────────────────────────────────────────────────────

/**
 * Read and parse sync-state.json.
 * Returns a default state object if the file doesn't exist yet.
 */
function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (_) {
    return {
      lastSyncAt: null,
      lastCheckedChapterNumber: 0,
      chapterIdMap: {}
    };
  }
}

/**
 * Atomically write sync-state.json by writing to a temp file first,
 * then renaming — prevents data corruption if the process crashes mid-write.
 */
function writeState(state) {
  const json = JSON.stringify(state, null, 2);
  fs.writeFileSync(STATE_FILE_TMP, json, 'utf8');
  fs.renameSync(STATE_FILE_TMP, STATE_FILE);
}

// ── Chapter helpers ──────────────────────────────────────────────────────────

/**
 * Read and parse chapters.js, returning the array of chapter objects.
 * Supports the existing format: `const CHAPTERS = [ ... ];`
 */
function readChapters() {
  const raw = fs.readFileSync(CHAPTERS_FILE, 'utf8');
  // Extract the JSON array between the outer brackets
  const match = raw.match(/const\s+CHAPTERS\s*=\s*(\[[\s\S]*?\])\s*;?\s*$/);
  if (!match) throw new Error('chapters.js is not in the expected format');
  return JSON.parse(match[1]);
}

/**
 * Write the full chapters array back to chapters.js in the same
 * `const CHAPTERS = [...];` format the browser client expects.
 */
function writeChapters(chapters) {
  // Sort ascending by chapter number before writing
  chapters.sort((a, b) => a.number - b.number);
  const json = JSON.stringify(chapters, null, 2)
    .replace(/^\[/, '[\n ')
    .replace(/\]$/, '\n]');
  const content = `const CHAPTERS = ${json};\n`;
  fs.writeFileSync(CHAPTERS_FILE, content, 'utf8');
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the highest chapter number currently stored locally.
 */
function getLocalLatestChapterNumber() {
  try {
    const chapters = readChapters();
    if (!chapters.length) return 0;
    return Math.max(...chapters.map(c => c.number));
  } catch (err) {
    // Fall back to the sync-state value if chapters.js is unreadable
    const state = readState();
    return state.lastCheckedChapterNumber || 0;
  }
}

/**
 * Returns true if a chapter with the given number already exists locally.
 */
function chapterExists(number) {
  try {
    const chapters = readChapters();
    return chapters.some(c => c.number === number);
  } catch (_) {
    return false;
  }
}

/**
 * Persist a newly synced chapter.
 *
 * @param {{ number: number, title: string, id: string }} chapter
 * @param {Record<string,string>} fullIdMap — complete remote ID map to merge into state
 */
function saveNewChapter(chapter, fullIdMap = {}) {
  // Idempotency: never create a duplicate
  if (chapterExists(chapter.number)) {
    return { skipped: true };
  }

  const chapters = readChapters();
  chapters.push({ number: chapter.number, title: chapter.title });
  writeChapters(chapters);

  // Update sync state
  const state = readState();
  state.lastSyncAt = new Date().toISOString();
  state.lastCheckedChapterNumber = Math.max(state.lastCheckedChapterNumber, chapter.number);
  // Merge new ID entries (only add; never overwrite existing verified IDs)
  for (const [num, id] of Object.entries(fullIdMap)) {
    if (!state.chapterIdMap[num]) {
      state.chapterIdMap[num] = id;
    }
  }
  writeState(state);

  return { skipped: false };
}

/**
 * Update the sync state after a successful check (even if no new chapter).
 */
function recordSyncCheck(latestRemoteNumber, fullIdMap = {}) {
  const state = readState();
  state.lastSyncAt = new Date().toISOString();
  if (latestRemoteNumber > state.lastCheckedChapterNumber) {
    state.lastCheckedChapterNumber = latestRemoteNumber;
  }
  for (const [num, id] of Object.entries(fullIdMap)) {
    if (!state.chapterIdMap[num]) {
      state.chapterIdMap[num] = id;
    }
  }
  writeState(state);
}

/**
 * Look up the WeebCentral chapter ID for a given chapter number.
 * Returns null if not known.
 */
function getChapterId(number) {
  const state = readState();
  return state.chapterIdMap[String(number)] || null;
}

module.exports = {
  getLocalLatestChapterNumber,
  chapterExists,
  saveNewChapter,
  recordSyncCheck,
  getChapterId,
  readChapters,
};
