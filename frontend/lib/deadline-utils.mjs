/**
 * @param {string | null | undefined} value
 * @param {number} [now]
 * @returns {string | null}
 */
export function formatActiveReservationDeadline(value, now = Date.now()) {
  if (!value) return null;

  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= now) return null;

  return deadline.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
