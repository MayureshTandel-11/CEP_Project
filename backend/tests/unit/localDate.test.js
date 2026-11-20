const {
  localDateIso, addDaysIso, daysAgoIso, safeTimeZone,
} = require('../../src/utils/localDate');
const { isValidTimeZone, validateTimeZone } = require('../../src/utils/validators');

// 2026-10-18T20:00Z is already 2026-10-19 01:30 in Kolkata and still 2026-10-18 in New York.
const INSTANT = new Date('2026-10-18T20:00:00Z');

describe('localDateIso', () => {
  test('the same instant is a different calendar date in different zones', () => {
    expect(localDateIso('UTC', INSTANT)).toBe('2026-10-18');
    expect(localDateIso('Asia/Kolkata', INSTANT)).toBe('2026-10-19');
    expect(localDateIso('America/New_York', INSTANT)).toBe('2026-10-18');
    expect(localDateIso('Pacific/Kiritimati', INSTANT)).toBe('2026-10-19');
  });
  test('missing or invalid zones fall back to UTC; nothing is inferred', () => {
    for (const bad of [undefined, null, '', 'Mars/Olympus', '+05:30', 42]) {
      expect(safeTimeZone(bad)).toBe('UTC');
      expect(localDateIso(bad, INSTANT)).toBe('2026-10-18');
    }
  });
  test('daylight-saving transition days keep calendar arithmetic exact', () => {
    // US clocks went back on 2026-11-01; the window is calendar days, not 24h blocks.
    const instant = new Date('2026-11-02T03:00:00Z');
    expect(localDateIso('America/New_York', instant)).toBe('2026-11-01');
    expect(daysAgoIso(3, 'America/New_York', instant)).toBe('2026-10-30');
  });
  test('addDaysIso crosses month and year ends', () => {
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysIso('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('time-zone validation', () => {
  test.each(['UTC', 'Asia/Kolkata', 'America/Argentina/Buenos_Aires', 'Europe/London'])('%s is valid', (z) => {
    expect(isValidTimeZone(z)).toBe(true);
    expect(validateTimeZone(` ${z} `)).toBe(z);
  });
  test.each(['', ' ', 'Mars/Olympus', '+05:30', 'IST', 'Asia/', '../etc/passwd', 'a'.repeat(80), null, 5, {}])('%p is rejected', (z) => {
    expect(isValidTimeZone(z)).toBe(false);
    expect(() => validateTimeZone(z)).toThrow(/IANA/);
  });
});
