/**
 * Calendar-date helpers that respect a user's IANA timezone.
 *
 * Log dates are stored as plain YYYY-MM-DD strings. Only the question "what is today
 * for this user" depends on the timezone; stored dates are never rewritten. A missing
 * or invalid zone falls back to UTC, which is also the default for every user until
 * they explicitly choose a zone in their profile. A zone is never guessed.
 */

const DEFAULT_TIME_ZONE = 'UTC';

// Only IANA names ("Asia/Kolkata", "UTC"). Node also accepts UTC offsets such as "+05:30"
// in Intl; those are rejected here because an offset is not a time zone and has no DST rules.
const IANA_SHAPE = /^(?:UTC|[A-Za-z][A-Za-z_]*(?:\/[A-Za-z0-9_+-]+)+)$/;

const formatterCache = new Map();

function formatterFor(timeZone) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(timeZone, new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }));
  }
  return formatterCache.get(timeZone);
}

/** Return `timeZone` if the runtime accepts it, otherwise UTC. */
function safeTimeZone(timeZone) {
  if (typeof timeZone !== 'string' || !timeZone.trim()) return DEFAULT_TIME_ZONE;
  if (!IANA_SHAPE.test(timeZone.trim())) return DEFAULT_TIME_ZONE;
  try {
    formatterFor(timeZone.trim());
    return timeZone.trim();
  } catch (err) {
    return DEFAULT_TIME_ZONE;
  }
}

/** The user's current calendar date as YYYY-MM-DD in `timeZone`. */
function localDateIso(timeZone = DEFAULT_TIME_ZONE, now = new Date()) {
  const parts = formatterFor(safeTimeZone(timeZone)).formatToParts(now);
  const pick = (type) => parts.find((p) => p.type === type).value;
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

/** Add whole days to a YYYY-MM-DD string (calendar arithmetic, no timezone involved). */
function addDaysIso(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** First date of a window of `days` days that ends today (inclusive) in `timeZone`. */
function daysAgoIso(days, timeZone = DEFAULT_TIME_ZONE, now = new Date()) {
  return addDaysIso(localDateIso(timeZone, now), -(days - 1));
}

module.exports = { IANA_SHAPE, DEFAULT_TIME_ZONE, safeTimeZone, localDateIso, addDaysIso, daysAgoIso };
