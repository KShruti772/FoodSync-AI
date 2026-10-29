import assert from 'node:assert/strict';
import test from 'node:test';
import { getValidPickupCoordinates } from '../lib/pickup-location.mjs';

test('preserves valid pickup coordinates exactly, including boundary values', () => {
  assert.deepEqual(getValidPickupCoordinates(12.9716, 77.5946), [12.9716, 77.5946]);
  assert.deepEqual(getValidPickupCoordinates(-90, -180), [-90, -180]);
  assert.deepEqual(getValidPickupCoordinates(90, 180), [90, 180]);
});

test('rejects missing, non-finite, and out-of-range pickup coordinates', () => {
  assert.equal(getValidPickupCoordinates(null, null), null);
  assert.equal(getValidPickupCoordinates(12, undefined), null);
  assert.equal(getValidPickupCoordinates(Number.NaN, 77), null);
  assert.equal(getValidPickupCoordinates(90.01, 77), null);
  assert.equal(getValidPickupCoordinates(12, -180.01), null);
});
