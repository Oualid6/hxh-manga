'use strict';

/**
 * sync/chapter-sync.js
 *
 * Automatic chapter synchronization orchestrator.
 *
 * Responsibilities:
 *   - Run a 24-hour cron loop to check WeebCentral for new chapters
 *   - Compare the remote latest chapter against locally stored chapters
 *   - If a new chapter exists: fetch its images, persist it, refresh server caches
 *   - Never block the HTTP server — all work is async, errors are caught and logged
 */

const db       = require('./chapters-db');
const provider = require('../providers/weebcentral-provider');

// The interval between automatic sync runs (24 hours in ms)
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Delay before the first sync after server start (avoids slowing down startup)
const INITIAL_DELAY_MS = 30 * 1000;

// Guard to prevent overlapping sync runs
let isSyncing = false;

// Injected server-side cache invalidation callback (set via startSyncScheduler)
let onNewChapterSaved = null;

// ── Logger ───────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[Sync] ${msg}`);
}

function logError(msg, err) {
  console.error(`[Sync] ${msg}`, err ? err.message || err : '');
}

// ── Core Sync Logic ──────────────────────────────────────────────────────────

/**
 * Run one complete sync cycle.
 *
 * Sequence:
 *  1. Fetch the latest chapter from WeebCentral (1 lightweight request)
 *  2. Compare with local state
 *  3. If up to date → exit immediately
 *  4. If new chapters exist → fetch their full list, then for each:
 *       a. Fetch chapter images
 *       b. Persist to chapters.js + sync-state.json
 *       c. Notify server to refresh its in-memory caches
 */
async function checkAndSync() {
  if (isSyncing) {
    log('Previous sync still running — skipping this cycle.');
    return;
  }

  isSyncing = true;
  log('Starting chapter sync check...');

  try {
    // ── Step 1: Single lightweight request to check latest remote chapter ──
    const remoteLatest = await provider.getLatestChapter();
    if (!remoteLatest) {
      logError('Could not determine latest remote chapter — aborting sync.');
      return;
    }

    const localLatest = db.getLocalLatestChapterNumber();
    log(`Remote latest: Ch.${remoteLatest.number} | Local latest: Ch.${localLatest}`);

    // ── Step 2: Fast exit if nothing new ──
    if (remoteLatest.number <= localLatest) {
      log('No new chapters found. Nothing to do.');
      db.recordSyncCheck(remoteLatest.number);
      return;
    }

    // ── Step 3: New chapter(s) detected — fetch the full list to get all gaps ──
    const gap = remoteLatest.number - localLatest;
    log(`${gap} new chapter(s) detected. Fetching full chapter list...`);

    const allRemote = await provider.getLatestChaptersList();

    // Filter to only chapters newer than local, sorted ASC so we save them in order
    const newChapters = allRemote
      .filter(c => c.number > localLatest && Number.isInteger(c.number))
      .sort((a, b) => a.number - b.number);

    if (newChapters.length === 0) {
      log('No integer-numbered new chapters to add. Sync complete.');
      db.recordSyncCheck(remoteLatest.number);
      return;
    }

    // Build a complete ID map from the remote list for state persistence
    const remoteIdMap = {};
    for (const ch of allRemote) {
      remoteIdMap[String(ch.number)] = ch.id;
    }

    let savedCount = 0;

    // ── Step 4: Persist each new chapter sequentially ──
    for (const chapter of newChapters) {
      try {
        // Skip if it already exists (idempotent guard)
        if (db.chapterExists(chapter.number)) {
          log(`Ch.${chapter.number} already exists locally — skipping.`);
          continue;
        }

        log(`Fetching images for Ch.${chapter.number} (ID: ${chapter.id})...`);
        const images = await provider.getChapterImages(chapter.id);

        if (images.length === 0) {
          logError(`Ch.${chapter.number} returned 0 images — skipping.`);
          continue;
        }

        const result = db.saveNewChapter(
          { number: chapter.number, title: chapter.title, id: chapter.id },
          remoteIdMap
        );

        if (result.skipped) {
          log(`Ch.${chapter.number} was already saved (race condition guard).`);
        } else {
          savedCount++;
          log(`Ch.${chapter.number} saved (${images.length} pages). chapters.js updated.`);

          // Notify the server to refresh its in-memory caches
          if (typeof onNewChapterSaved === 'function') {
            try {
              onNewChapterSaved(chapter.number, chapter.id, images);
            } catch (cbErr) {
              logError('Cache refresh callback threw:', cbErr);
            }
          }
        }
      } catch (chErr) {
        logError(`Failed to sync Ch.${chapter.number}:`, chErr);
        // Continue with the next chapter rather than aborting the whole run
      }
    }

    db.recordSyncCheck(remoteLatest.number, remoteIdMap);
    log(`Sync complete. ${savedCount} new chapter(s) added.`);

  } catch (err) {
    logError('Sync cycle encountered an unhandled error:', err);
  } finally {
    isSyncing = false;
  }
}

// ── Scheduler ────────────────────────────────────────────────────────────────

/**
 * Start the 24-hour automatic sync scheduler.
 *
 * @param {Function} cacheRefreshCallback
 *   Called after each new chapter is saved with (chapterNumber, chapterId, imageUrls[]).
 *   Use this to invalidate/update the server's in-memory caches without a restart.
 */
function startSyncScheduler(cacheRefreshCallback) {
  if (typeof cacheRefreshCallback === 'function') {
    onNewChapterSaved = cacheRefreshCallback;
  }

  // Delay the first run so it doesn't slow down server startup
  setTimeout(() => {
    checkAndSync();

    // Then run every 24 hours
    setInterval(() => {
      checkAndSync();
    }, SYNC_INTERVAL_MS);

  }, INITIAL_DELAY_MS);

  log(`Scheduler started. First sync in ${INITIAL_DELAY_MS / 1000}s, then every ${SYNC_INTERVAL_MS / 3600000}h.`);
}

module.exports = { startSyncScheduler, checkAndSync };
