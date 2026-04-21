/**
 * Format a duration in milliseconds into a short human-readable string.
 *
 * @example
 * formatDuration(0);          // "0s"
 * formatDuration(5_000);      // "5s"
 * formatDuration(60_000);     // "1m"
 * formatDuration(90_000);     // "1m 30s"
 * formatDuration(3_900_000);  // "1h 5m"
 *
 * @param {number} ms - Non-negative duration in milliseconds.
 * @returns {string}
 */
export function formatDuration(ms) {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;

  const min = Math.floor(sec / 60);
  if (min < 60) {
    const s = sec % 60;
    return s ? `${min}m ${s}s` : `${min}m`;
  }

  const hr = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${hr}h ${m}m` : `${hr}h`;
}
