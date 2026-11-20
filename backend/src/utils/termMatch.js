/**
 * One whole-word matcher shared by the rule engine (foods) and the LLM output filter (text).
 *
 * A term matches only as a whole word or phrase, with an optional plural suffix, so a
 * dislike of "ham" does not remove "chamomile tea" and "egg" does not match "eggplant",
 * while "egg" still matches "Scrambled Eggs". Underscores and hyphens count as spaces.
 */

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Lower-case a term and treat '_' and '-' as spaces ("tree_nut" -> "tree nut"). */
function normalizeTerm(value) {
  return String(value ?? '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const cache = new Map();
function termRegex(term) {
  const key = String(term);
  if (!cache.has(key)) {
    cache.set(key, new RegExp(`\\b${escapeRegExp(key)}(?:s|es)?\\b`, 'i'));
  }
  return cache.get(key);
}

/** True if `term` appears in `text` as a whole word or phrase. Empty terms never match. */
function termMatches(text, term) {
  const needle = normalizeTerm(term);
  if (!needle) return false;
  return termRegex(needle).test(normalizeTerm(text));
}

module.exports = { escapeRegExp, normalizeTerm, termRegex, termMatches };
