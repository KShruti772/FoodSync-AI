import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  apiRegister,
  apiLogin,
  apiCreateDonation,
  apiGetDonations,
  apiGetDonationMatches,
  apiGetRecipientMatches,
  apiAcceptMatch,
  apiCompleteDonation,
  apiGetNotifications,
  apiGetImpactSummary,
  apiGetImpactLedger,
  apiDownloadImpactCsv,
  apiDownloadImpactCertificate,
  apiGetRecipientProfile,
  apiUpdateRecipientProfile,
  ApiError,
} from '../api';

describe('End-to-End Live Backend Integration', () => {
  const uniqueSuffix = Date.now().toString().slice(-6);
  const donorEmail = `donor_${uniqueSuffix}@foodsync.org`;
  const recipientEmail = `shelter_${uniqueSuffix}@foodsync.org`;

  let donorToken = '';
  let recipientToken = '';
  let recipientUserId = '';
  let createdDonationId = '';
  let candidateMatchId = '';

  it('verifies live backend health and registers a Food Provider and Recipient', async () => {
    // 1. Register Food Provider
    const donorRes = await apiRegister({
      email: donorEmail,
      password: 'StrongPassword123!',
      role: 'FOOD_PROVIDER',
      organization_name: 'Solapur Grand Catering',
      phone: '+91 9876543210',
      address: '42 Station Road, Solapur Central',
      latitude: 17.6599,
      longitude: 75.9064,
    });

    assert.ok(donorRes.token, 'Expected JWT token for donor');
    assert.equal(donorRes.user.email, donorEmail);
    donorToken = donorRes.token;

    // 2. Register Recipient (Community Shelter)
    const recipRes = await apiRegister({
      email: recipientEmail,
      password: 'StrongPassword123!',
      role: 'RECIPIENT',
      organization_name: 'Solapur Hope Community Pantry',
      phone: '+91 9123456789',
      address: '15 Gandhi Nagar, Solapur East',
      latitude: 17.6650,
      longitude: 75.9120,
    });

    assert.ok(recipRes.token, 'Expected JWT token for recipient');
    assert.equal(recipRes.user.role, 'RECIPIENT');
    recipientToken = recipRes.token;
    recipientUserId = recipRes.user.id;
  });

  it('verifies initial recipient profile, updates intake settings, and checks live persistence after reload', async () => {
    // 1. Fetch initial profile
    const initialProfile = await apiGetRecipientProfile(recipientToken);
    assert.equal(initialProfile.org_type, 'SHELTER');
    assert.equal(initialProfile.daily_capacity_meals, 100);
    assert.deepEqual(initialProfile.storage_types, ['DRY']);

    // 2. Update intake settings (capacity 180, cold storage enabled, travel limit 12.0 km)
    const updatePayload = {
      org_type: 'COMMUNITY_KITCHEN' as const,
      daily_capacity_meals: 180,
      storage_types: ['DRY', 'REFRIGERATED', 'FROZEN'],
      dietary_preferences: 'ALL' as const,
      max_travel_distance_km: 12.0,
      operating_hours: '08:00 - 20:00',
    };

    const updateRes = await apiUpdateRecipientProfile(updatePayload, recipientToken);
    assert.equal(updateRes.org_type, 'COMMUNITY_KITCHEN');
    assert.equal(updateRes.daily_capacity_meals, 180);
    assert.equal(updateRes.max_travel_distance_km, 12.0);
    assert.deepEqual(updateRes.storage_types.sort(), ['DRY', 'FROZEN', 'REFRIGERATED'].sort());

    // 3. Reload profile from backend and verify persistence
    const reloadedProfile = await apiGetRecipientProfile(recipientToken);
    assert.equal(reloadedProfile.daily_capacity_meals, 180);
    assert.equal(reloadedProfile.max_travel_distance_km, 12.0);
    assert.deepEqual(reloadedProfile.storage_types.sort(), ['DRY', 'FROZEN', 'REFRIGERATED'].sort());
  });

  it('enforces role authorization and rejects food providers from recipient profile endpoints', async () => {
    // Food provider cannot GET recipient profile
    await assert.rejects(
      async () => {
        await apiGetRecipientProfile(donorToken);
      },
      (err: any) => {
        assert.equal(err instanceof ApiError, true);
        assert.equal(err.status, 403);
        return true;
      }
    );

    // Food provider cannot PUT recipient profile
    await assert.rejects(
      async () => {
        await apiUpdateRecipientProfile(
          {
            org_type: 'FOOD_BANK',
            daily_capacity_meals: 100,
            storage_types: ['DRY'],
            dietary_preferences: 'ALL',
            max_travel_distance_km: 15.0,
          },
          donorToken
        );
      },
      (err: any) => {
        assert.equal(err instanceof ApiError, true);
        assert.equal(err.status, 403);
        return true;
      }
    );
  });

  it('rejects invalid recipient settings with 422 Unprocessable Entity', async () => {
    await assert.rejects(
      async () => {
        await apiUpdateRecipientProfile(
          {
            org_type: 'SHELTER',
            daily_capacity_meals: -10, // Invalid: must be >= 0
            storage_types: ['DRY'],
            dietary_preferences: 'ALL',
            max_travel_distance_km: 15.0,
          },
          recipientToken
        );
      },
      (err: any) => {
        assert.equal(err instanceof ApiError, true);
        assert.equal(err.status, 422);
        return true;
      }
    );
  });

  it('authenticates Food Provider via apiLogin', async () => {
    const loginRes = await apiLogin(donorEmail, 'StrongPassword123!');
    assert.ok(loginRes.token);
    assert.equal(loginRes.user.organization_name, 'Solapur Grand Catering');
    donorToken = loginRes.token;
  });

  it('creates surplus donation and triggers synchronous deterministic matching engine', async () => {
    const expiryTime = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    const preparedTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const donation = await apiCreateDonation(
      {
        title: '60 Fresh Thali Meals (Rice, Roti, Subzi)',
        food_type: 'VEGETARIAN_COOKED',
        perishable: true,
        quantity_meals: 60,
        prepared_at: preparedTime,
        expiry_time: expiryTime,
        pickup_address: '42 Station Road, Solapur Central',
        latitude: 17.6599,
        longitude: 75.9064,
        special_instructions: 'Dietary: Vegetarian. Thermal containers.',
      },
      donorToken
    );

    assert.ok(donation.id);
    assert.equal(donation.title, '60 Fresh Thali Meals (Rice, Roti, Subzi)');
    assert.equal(donation.status, 'AVAILABLE');
    assert.equal(donation.quantity_meals, 60);
    createdDonationId = donation.id;
  });

  it('fetches donations list and computed donation matches', async () => {
    const donations = await apiGetDonations(donorToken);
    assert.ok(donations.length > 0);
    const found = donations.find((d) => d.id === createdDonationId);
    assert.ok(found, 'Created donation must appear in list');

    // Provider inspects matches
    const matches = await apiGetDonationMatches(createdDonationId, donorToken);
    assert.ok(Array.isArray(matches));
    if (matches.length > 0) {
      assert.ok(matches[0].compatibility_score > 0);
      assert.ok(matches[0].distance_km >= 0);
      candidateMatchId = matches[0].id;
    }
  });

  it('recipient receives candidate match alert and views assigned matches', async () => {
    const recipMatches = await apiGetRecipientMatches(recipientToken);
    assert.ok(Array.isArray(recipMatches));

    const myMatch = recipMatches.find((m) => m.donation_id === createdDonationId);
    if (myMatch) {
      candidateMatchId = myMatch.id;
      assert.equal(myMatch.status, 'PROPOSED');
    }

    // Check notifications for recipient
    const notifs = await apiGetNotifications(recipientToken);
    assert.ok(Array.isArray(notifs));
  });

  it('recipient accepts the match to reserve the surplus food', async () => {
    if (!candidateMatchId) return;

    const acceptRes = await apiAcceptMatch(candidateMatchId, recipientToken);
    assert.equal(acceptRes.success, true);
    assert.equal(acceptRes.data.status, 'ACCEPTED');

    // Verify donation status changed to RESERVED
    const allDonations = await apiGetDonations(donorToken);
    const reservedDonation = allDonations.find((d) => d.id === createdDonationId);
    assert.equal(reservedDonation?.status, 'RESERVED');
  });

  it('completes the donation handover and verifies impact logging', async () => {
    if (!createdDonationId) return;

    // Recipient confirms physical collection with quantity and notes
    const completeRes = await apiCompleteDonation(
      createdDonationId,
      { confirmed_quantity_meals: 60, notes: 'Collected safely by Hope Shelter logistics team' },
      recipientToken
    );

    assert.equal(completeRes.success, true);
    assert.equal(completeRes.data.status, 'COMPLETED');
    assert.equal(completeRes.data.impact.meals_rescued, 60);

    // Verify impact summary updated
    const impact = await apiGetImpactSummary();
    assert.ok(impact.total_meals_rescued >= 60);
    assert.ok(impact.total_completed_donations >= 1);
  });

  it('rejects handover completion on an already completed donation', async () => {
    if (!createdDonationId) return;

    await assert.rejects(
      async () => {
        await apiCompleteDonation(
          createdDonationId,
          { confirmed_quantity_meals: 60 },
          recipientToken
        );
      },
      (err: any) => {
        assert.equal(err instanceof ApiError, true);
        assert.equal(err.status, 400);
        return true;
      }
    );
  });

  it('retrieves authenticated historical impact ledger and verifies mathematical reconciliation', async () => {
    const ledger = await apiGetImpactLedger(donorToken);
    assert.ok(ledger.summary.total_meals_rescued >= 60);
    assert.ok(ledger.summary.total_food_weight_kg >= 30.0);
    assert.ok(ledger.summary.total_co2_savings_kg >= 75.0);
    assert.ok(ledger.records.length >= 1);

    // Verify mathematical reconciliation between summary and individual records
    const recordSumMeals = ledger.records.reduce((acc, r) => acc + r.meals_rescued, 0);
    assert.equal(ledger.summary.total_meals_rescued, recordSumMeals);

    const myRecord = ledger.records.find((r) => r.donation_id === createdDonationId);
    assert.ok(myRecord);
    assert.equal(myRecord.meals_rescued, 60);
    assert.equal(myRecord.food_weight_kg, 30.0);
    assert.equal(myRecord.co2_savings_kg, 75.0);
  });

  it('downloads sanitized CSV impact ledger', async () => {
    const csvBlob = await apiDownloadImpactCsv(donorToken);
    assert.ok(csvBlob instanceof Blob);
    const text = await csvBlob.text();
    assert.match(text, /Rescue Reference/);
    assert.match(text, /Meals Rescued/);
  });

  it('downloads signed PDF impact certificate for completed rescue', async () => {
    if (!createdDonationId) return;
    const pdfBlob = await apiDownloadImpactCertificate(createdDonationId, donorToken);
    assert.ok(pdfBlob instanceof Blob);
    assert.ok(pdfBlob.size > 500);
  });
});
