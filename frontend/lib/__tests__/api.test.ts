import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  apiLogin,
  apiRegister,
  apiGetMe,
  apiCreateDonation,
  apiGetDonations,
  apiGetDonation,
  apiCancelDonation,
  apiCompleteDonation,
  apiGetDonationMatches,
  apiGetRecipientMatches,
  apiAcceptMatch,
  apiRejectMatch,
  apiGetNotifications,
  apiMarkNotificationRead,
  apiGetImpactSummary,
  mapFoodTypeToApi,
  mapApiDonationToDemo,
  mapApiMatchToDemo,
  mapApiNotificationToDemo,
  mapApiImpactToDemo,
  ApiError,
  ApiDonation,
  ApiMatch,
  ApiNotification,
  ApiImpactSummary,
} from '../api';

describe('FoodSync AI Typed API Client & Contract Verification', () => {
  let interceptedCalls: Array<{ url: string; options: RequestInit }> = [];
  let mockResponseStatus = 200;
  let mockResponseBody: any = {};

  beforeEach(() => {
    interceptedCalls = [];
    mockResponseStatus = 200;
    mockResponseBody = {};

    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      interceptedCalls.push({
        url: url.toString(),
        options: options || {},
      });

      return {
        ok: mockResponseStatus >= 200 && mockResponseStatus < 300,
        status: mockResponseStatus,
        json: async () => mockResponseBody,
      } as Response;
    }) as any;
  });

  describe('Authentication Endpoints', () => {
    it('apiLogin posts to /api/v1/auth/login with credentials', async () => {
      mockResponseBody = {
        user: { id: 'usr-1', email: 'donor@example.com', role: 'FOOD_PROVIDER', organization_name: 'Green Kitchen' },
        token: 'jwt-token-123',
      };

      const result = await apiLogin('donor@example.com', 'secretPass123');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/auth\/login$/);
      assert.equal(interceptedCalls[0].options.method, 'POST');
      assert.equal(
        interceptedCalls[0].options.body,
        JSON.stringify({ email: 'donor@example.com', password: 'secretPass123' })
      );
      assert.equal(result.token, 'jwt-token-123');
      assert.equal(result.user.id, 'usr-1');
    });

    it('apiRegister posts to /api/v1/auth/register with user profile', async () => {
      mockResponseBody = {
        user: { id: 'usr-2', email: 'shelter@example.com', role: 'RECIPIENT', organization_name: 'Hope Shelter' },
        token: 'jwt-token-456',
      };

      const payload = {
        email: 'shelter@example.com',
        password: 'password123',
        role: 'RECIPIENT' as const,
        organization_name: 'Hope Shelter',
        phone: '+91 9876543210',
        address: 'Solapur East',
        latitude: 17.6599,
        longitude: 75.9064,
      };

      const result = await apiRegister(payload);

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/auth\/register$/);
      assert.equal(interceptedCalls[0].options.method, 'POST');
      assert.deepEqual(JSON.parse(interceptedCalls[0].options.body as string), payload);
      assert.equal(result.user.role, 'RECIPIENT');
    });

    it('apiGetMe attaches bearer token header', async () => {
      mockResponseBody = {
        id: 'usr-1',
        email: 'donor@example.com',
        role: 'FOOD_PROVIDER',
        organization_name: 'Green Kitchen',
      };

      const result = await apiGetMe('valid-token-abc');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/auth\/me$/);
      assert.equal(interceptedCalls[0].options.method, 'GET');
      const headers = interceptedCalls[0].options.headers as Record<string, string>;
      assert.equal(headers.Authorization, 'Bearer valid-token-abc');
      assert.equal(result.id, 'usr-1');
    });
  });

  describe('Donation Endpoints', () => {
    it('apiCreateDonation posts valid payload and attaches Authorization', async () => {
      const donationPayload = {
        title: '50 Hot Meal Packets',
        food_type: 'VEGETARIAN_COOKED' as const,
        perishable: true,
        quantity_meals: 50,
        prepared_at: '2026-10-12T12:00:00Z',
        expiry_time: '2026-10-12T16:00:00Z',
        pickup_address: '42 Market Road, Solapur Central',
        latitude: 17.6599,
        longitude: 75.9064,
        special_instructions: 'Keep warm',
      };

      mockResponseStatus = 201;
      mockResponseBody = {
        id: 'don_00000001',
        provider_id: 'usr-1',
        ...donationPayload,
        status: 'AVAILABLE',
        created_at: '2026-10-12T12:05:00Z',
        updated_at: '2026-10-12T12:05:00Z',
      };

      const res = await apiCreateDonation(donationPayload, 'test-token');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/donations$/);
      assert.equal(interceptedCalls[0].options.method, 'POST');
      assert.equal(
        (interceptedCalls[0].options.headers as any).Authorization,
        'Bearer test-token'
      );
      assert.equal(res.id, 'don_00000001');
      assert.equal(res.quantity_meals, 50);
    });

    it('apiGetDonations fetches donation list with optional auth header', async () => {
      mockResponseBody = [
        { id: 'don-1', title: 'Bread Rolls', status: 'AVAILABLE' },
        { id: 'don-2', title: 'Rice Curry', status: 'RESERVED' },
      ];

      const res = await apiGetDonations('auth-token');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/donations$/);
      assert.equal(interceptedCalls[0].options.method, 'GET');
      assert.equal(res.length, 2);
    });

    it('apiGetDonation fetches single donation by ID', async () => {
      mockResponseBody = { id: 'don_00000001', title: 'Cooked Lunch', status: 'AVAILABLE' };

      const res = await apiGetDonation('don_00000001', 'token-123');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/donations\/don_00000001$/);
      assert.equal(res.id, 'don_00000001');
    });

    it('apiCancelDonation sends cancel action', async () => {
      mockResponseBody = { success: true, message: 'Donation cancelled', data: { id: 'don-1', status: 'CANCELLED' } };

      const res = await apiCancelDonation('don-1', 'owner-token');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/donations\/don-1\/cancel$/);
      assert.equal(interceptedCalls[0].options.method, 'POST');
      assert.equal(res.success, true);
    });

    it('apiCompleteDonation posts handover confirmation with payload', async () => {
      mockResponseBody = {
        success: true,
        message: 'Donation completed and impact logged',
        data: {
          donation_id: 'don-1',
          status: 'COMPLETED',
          donation: { id: 'don-1', status: 'COMPLETED' },
          impact: { meals_served: 50, co2_savings_kg: 62.5 },
        },
      };

      const res = await apiCompleteDonation('don-1', { confirmed_quantity_meals: 50, notes: 'Handover complete' }, 'token-abc');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/donations\/don-1\/complete$/);
      assert.equal(interceptedCalls[0].options.method, 'POST');
      assert.equal(res.data.status, 'COMPLETED');
    });
  });

  describe('Match & Reservation Endpoints', () => {
    it('apiGetDonationMatches retrieves computed matches for a donation', async () => {
      mockResponseBody = [
        { id: 'match-1', donation_id: 'don-1', recipient_id: 'recip-1', compatibility_score: 0.92, status: 'PROPOSED' },
      ];

      const res = await apiGetDonationMatches('don-1', 'prov-token');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/donations\/don-1\/matches$/);
      assert.equal(res[0].compatibility_score, 0.92);
    });

    it('apiGetRecipientMatches unwraps success envelope from /api/v1/recipients/matches', async () => {
      mockResponseBody = {
        success: true,
        data: [
          { id: 'match-1', recipient_id: 'recip-1', compatibility_score: 0.88, status: 'NOTIFIED' },
        ],
      };

      const res = await apiGetRecipientMatches('recip-token');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/recipients\/matches$/);
      assert.equal(res.length, 1);
      assert.equal(res[0].id, 'match-1');
    });

    it('apiAcceptMatch reserves donation and transitions match to ACCEPTED', async () => {
      mockResponseBody = {
        success: true,
        message: 'Match accepted',
        data: { id: 'match-1', status: 'ACCEPTED' },
      };

      const res = await apiAcceptMatch('match-1', 'recip-token');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/matches\/match-1\/accept$/);
      assert.equal(interceptedCalls[0].options.method, 'POST');
      assert.equal(res.success, true);
      assert.equal(res.data.status, 'ACCEPTED');
    });

    it('apiRejectMatch rejects match and permits reallocation', async () => {
      mockResponseBody = {
        success: true,
        message: 'Match rejected',
        data: { id: 'match-1', status: 'REJECTED' },
      };

      const res = await apiRejectMatch('match-1', 'recip-token');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/matches\/match-1\/reject$/);
      assert.equal(interceptedCalls[0].options.method, 'POST');
      assert.equal(res.data.status, 'REJECTED');
    });
  });

  describe('Notifications & Impact Endpoints', () => {
    it('apiGetNotifications fetches user in-app alerts', async () => {
      mockResponseBody = [
        { id: 'notif-1', title: 'New Match', is_read: false, type: 'MATCH_ALERT' },
      ];

      const res = await apiGetNotifications('user-token');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/notifications$/);
      assert.equal(res[0].title, 'New Match');
    });

    it('apiMarkNotificationRead patches notification read state', async () => {
      mockResponseBody = { success: true, message: 'Notification marked as read', data: { id: 'notif-1', is_read: true } };

      const res = await apiMarkNotificationRead('notif-1', 'user-token');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/notifications\/notif-1\/read$/);
      assert.equal(interceptedCalls[0].options.method, 'PATCH');
      assert.equal(res.data.is_read, true);
    });

    it('apiGetImpactSummary fetches platform aggregate impact without auth', async () => {
      mockResponseBody = {
        total_meals_rescued: 1250,
        total_food_weight_kg: 625.0,
        total_co2_savings_kg: 1562.5,
        total_completed_donations: 25,
      };

      const res = await apiGetImpactSummary();

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/impact\/summary$/);
      assert.equal(res.total_meals_rescued, 1250);
      assert.equal(res.total_completed_donations, 25);
    });
  });

  describe('Error Handling and Resiliency', () => {
    it('parses FastAPI structured error { detail: { error: { message } } }', async () => {
      mockResponseStatus = 400;
      mockResponseBody = {
        detail: {
          success: false,
          error: { code: 'INVALID_STATE', message: 'Donation must be reserved before completion' },
        },
      };

      await assert.rejects(
        async () => {
          await apiCompleteDonation('don-1', {}, 'token');
        },
        (err: ApiError) => {
          assert.equal(err.status, 400);
          assert.equal(err.message, 'Donation must be reserved before completion');
          return true;
        }
      );
    });

    it('parses string detail error { detail: "Invalid email or password" }', async () => {
      mockResponseStatus = 401;
      mockResponseBody = { detail: 'Invalid email or password' };

      await assert.rejects(
        async () => {
          await apiLogin('wrong@example.com', 'wrongPass');
        },
        (err: ApiError) => {
          assert.equal(err.status, 401);
          assert.equal(err.message, 'Invalid email or password');
          return true;
        }
      );
    });

    it('handles network failure without unhandled rejection', async () => {
      globalThis.fetch = async () => {
        throw new Error('Connection refused');
      };

      await assert.rejects(
        async () => {
          await apiGetDonations();
        },
        (err: ApiError) => {
          assert.equal(err.status, 0);
          assert.match(err.message, /Cannot connect to backend server/);
          return true;
        }
      );
    });
  });

  describe('Contract Mappers', () => {
    it('mapFoodTypeToApi correctly maps UI categories and dietary tags', () => {
      assert.equal(mapFoodTypeToApi('Cooked Meals', ['Vegetarian']), 'VEGETARIAN_COOKED');
      assert.equal(mapFoodTypeToApi('Cooked Meals', ['Non-Vegetarian Chicken']), 'NON_VEGETARIAN_COOKED');
      assert.equal(mapFoodTypeToApi('Bakery', []), 'BAKERY');
      assert.equal(mapFoodTypeToApi('Fresh Produce', []), 'PRODUCE_RAW');
      assert.equal(mapFoodTypeToApi('Packaged Goods', []), 'PACKAGED_GROCERY');
    });

    it('mapApiDonationToDemo converts backend model into UI presentation model', () => {
      const apiDonation: ApiDonation = {
        id: 'don_00000001',
        provider_id: 'usr_000001',
        title: 'Dal & Rice Prepared Meals',
        food_type: 'VEGETARIAN_COOKED',
        perishable: true,
        quantity_meals: 45,
        prepared_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        expiry_time: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
        pickup_address: 'Green Valley Kitchen, Solapur',
        latitude: 17.6599,
        longitude: 75.9064,
        special_instructions: 'Dietary: Vegetarian, Nut-Free',
        status: 'AVAILABLE',
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      };

      const demo = mapApiDonationToDemo(apiDonation, { organization_name: 'Green Valley Catering' }, 2);

      assert.equal(demo.id, 'don_00000001');
      assert.equal(demo.quantity, 45);
      assert.equal(demo.quantityUnit, 'Meals');
      assert.equal(demo.storageRequirement, 'REFRIGERATED');
      assert.equal(demo.status, 'AVAILABLE');
      assert.equal(demo.matchedCount, 2);
      assert.deepEqual(demo.dietary, ['Vegetarian', 'Nut-Free']);
    });

    it('mapApiMatchToDemo maps score breakdown and explainability text', () => {
      const apiMatch: ApiMatch = {
        id: 'match_1_don_1',
        donation_id: 'don_1',
        recipient_id: 'usr_000002',
        compatibility_score: 0.9125,
        distance_km: 2.34,
        matched_factors: {
          distance_score: 0.84,
          urgency_score: 0.95,
          capacity_score: 0.90,
          requirement_score: 1.0,
        },
        status: 'PROPOSED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const demo = mapApiMatchToDemo(apiMatch, null, 'Hope Shelter');

      assert.equal(demo.id, 'match_1_don_1');
      assert.equal(demo.matchScore, 91);
      assert.equal(demo.distanceKm, 2.3);
      assert.equal(demo.urgencyScore, 95);
      assert.equal(demo.capacityScore, 90);
      assert.equal(demo.requirementScore, 100);
      assert.equal(demo.status, 'PROPOSED');
      assert.match(demo.whyBreakdown.distanceText, /2.3 km away/);
      assert.match(demo.whyBreakdown.urgencyText, /95\/100/);
    });

    it('mapApiNotificationToDemo maps notification types and links', () => {
      const apiNotif: ApiNotification = {
        id: 'notif-1',
        user_id: 'usr-2',
        match_id: 'match-123',
        title: 'New Match Alert',
        message: 'A food donation matches your profile',
        type: 'MATCH_ALERT',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const demo = mapApiNotificationToDemo(apiNotif);

      assert.equal(demo.id, 'notif-1');
      assert.equal(demo.type, 'MATCH_PROPOSED');
      assert.equal(demo.link, '/matches/match-123');
      assert.equal(demo.read, false);
    });

    it('mapApiImpactToDemo formats aggregate metrics', () => {
      const apiImpact: ApiImpactSummary = {
        total_meals_rescued: 500,
        total_food_weight_kg: 250.0,
        total_co2_savings_kg: 625.0,
        total_completed_donations: 10,
      };

      const demo = mapApiImpactToDemo(apiImpact, 3);

      assert.equal(demo.totalMealsRescued, 500);
      assert.equal(demo.totalDonations, 10);
      assert.equal(demo.co2OffsetKg, 625);
      assert.equal(demo.activeMatches, 3);
    });
  });
});
