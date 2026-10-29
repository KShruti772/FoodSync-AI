import assert from 'node:assert/strict';
import test from 'node:test';
import { mapBackendUser } from '../lib/backend-user-mapper.mjs';

test('maps the authenticated recipient role and registered contact profile', () => {
  const user = mapBackendUser({
    id: 'user-recipient-42',
    email: 'recipient@example.org',
    role: 'RECIPIENT',
    organization_name: 'Local Shelter',
    address: '12 Main Street',
    phone: '+1-555-0100',
    latitude: 12.5,
    longitude: 77.5,
  });

  assert.equal(user.id, 'user-recipient-42');
  assert.equal(user.role, 'RECIPIENT');
  assert.equal(user.organization, 'Local Shelter');
  assert.equal(user.address, '12 Main Street');
  assert.equal(user.phone, '+1-555-0100');
});

test('maps provider profile fields without replacing its role', () => {
  const user = mapBackendUser({
    id: 'user-provider-24',
    email: 'provider@example.org',
    role: 'FOOD_PROVIDER',
    organization_name: 'Community Kitchen',
    address: '24 Market Road',
    phone: '+1-555-0124',
    latitude: 11,
    longitude: 76,
  });

  assert.equal(user.id, 'user-provider-24');
  assert.equal(user.role, 'FOOD_PROVIDER');
  assert.equal(user.address, '24 Market Road');
  assert.equal(user.phone, '+1-555-0124');
});
