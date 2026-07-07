/* ===================================================================
   SUNNY DECK // RETRO  —  history-utils.js
   Shared history builder with whisper privacy filtering.
   Loaded after app.js. Exposes buildHistoryFor() as a global for
   classic scripts (app-ai.js, memory.js, etc.) to consume.
   =================================================================== */
'use strict';

/**
 * Build conversation history for a specific character, filtering out
 * whisper messages they weren't part of.
 *
 * @param {Object} sess  - session object with .history[]
 * @param {string|null} forCharKey
 *     - null  → omniscient view (router, stage director, quests)
 *     - key   → character-specific view (hides irrelevant whispers)
 * @param {number|null} limit
 *     - null/undefined → return ALL messages (no slice)
 *     - negative int   → slice from end (e.g. -8 = last 8)
 * @returns {string} formatted history, one line per message
 */
function buildHistoryFor(sess, forCharKey, limit) {
  var hist = (sess.history || []).filter(function(h) {
    // always exclude system messages (UI noise)
    if (h.kind === 'system') return false;

    // whisper privacy: hide whispers this character wasn't part of
    if (h.whisperTo) {
      // omniscient callers (null key) see everything
      if (forCharKey != null) {
        // include if character was the whisper target OR the speaker
        if (h.whisperTo !== forCharKey && h.speakerKey !== forCharKey) {
          return false;
        }
      }
    }

    return true;
  });

  // apply limit if specified
  if (limit != null) {
    hist = hist.slice(limit);
  }

  return hist.map(function(h) {
    var speaker = h.kind === 'event' ? 'Narrator' : h.speaker;
    return speaker + ': ' + h.text;
  }).join('\n');
}
