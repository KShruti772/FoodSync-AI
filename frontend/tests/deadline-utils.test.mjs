import assert from 'node:assert/strict';
import test from 'node:test';
import { formatActiveReservationDeadline } from '../lib/deadline-utils.mjs';

test('formats an active deadline in the local timezone', () => {
  const value = '2030-01-02T03:04:00.000Z';

  assert.equal(
    formatActiveReservationDeadline(value, Date.parse('2030-01-01T00:00:00.000Z')),
    new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
  );
});

test('does not invent a deadline when it is missing, invalid, or expired', () => {
  const now = Date.parse('2030-01-02T03:04:00.000Z');

  assert.equal(formatActiveReservationDeadline(null, now), null);
  assert.equal(formatActiveReservationDeadline(undefined, now), null);
  assert.equal(formatActiveReservationDeadline('not-a-date', now), null);
  assert.equal(formatActiveReservationDeadline('2030-01-02T03:03:59.999Z', now), null);
});
