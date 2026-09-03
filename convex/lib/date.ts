const SAST_OFFSET_MS = 2 * 60 * 60 * 1000; // SAST is UTC+2, no DST

/**
 * Returns today's date as YYYY-MM-DD in South Africa Standard Time (UTC+2),
 * regardless of the server's local timezone. This app targets Pretoria (SAST)
 * users exclusively, so "today" must be computed relative to SAST rather than
 * UTC to avoid date drift between 00:00 and 02:00 SAST.
 */
export function todaySast(): string {
  const sastTimestamp = new Date(Date.now() + SAST_OFFSET_MS);
  return sastTimestamp.toISOString().split("T")[0] ?? "";
}

/**
 * Returns the current month as YYYY-MM in South Africa Standard Time (UTC+2).
 */
export function currentMonthKeySast(): string {
  return todaySast().substring(0, 7);
}
