import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  apiGetRecipientProfile,
  apiUpdateRecipientProfile,
  ApiRecipientProfile,
  ApiRecipientProfileUpdate,
  ApiError,
} from '../api';

describe('Recipient Profile & Intake Settings Frontend Unit Tests', () => {
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

  describe('Loading Recipient Profile (GET /api/v1/recipients/profile)', () => {
    it('successfully loads recipient profile with authorization header', async () => {
      const mockProfile: ApiRecipientProfile = {
        id: 'recp_000001',
        user_id: 'usr-recip-001',
        org_type: 'SHELTER',
        daily_capacity_meals: 100,
        storage_types: ['DRY', 'REFRIGERATED'],
        dietary_preferences: 'ALL',
        max_travel_distance_km: 15.0,
        operating_hours: '08:00 - 20:00',
        created_at: '2026-10-12T00:00:00Z',
        updated_at: '2026-10-12T00:00:00Z',
      };
      mockResponseBody = mockProfile;

      const profile = await apiGetRecipientProfile('test-jwt-token');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/recipients\/profile$/);
      assert.equal(interceptedCalls[0].options.method, 'GET');
      assert.equal((interceptedCalls[0].options.headers as any)['Authorization'], 'Bearer test-jwt-token');
      assert.equal(profile.id, 'recp_000001');
      assert.equal(profile.daily_capacity_meals, 100);
      assert.deepEqual(profile.storage_types, ['DRY', 'REFRIGERATED']);
    });

    it('handles unauthorized access when role is not RECIPIENT (403 Forbidden)', async () => {
      mockResponseStatus = 403;
      mockResponseBody = {
        detail: {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only recipient users can access this endpoint',
            details: [],
          },
        },
      };

      await assert.rejects(
        async () => {
          await apiGetRecipientProfile('provider-jwt-token');
        },
        (err: any) => {
          assert.equal(err instanceof ApiError, true);
          assert.equal(err.status, 403);
          assert.match(err.message, /Only recipient users can access this endpoint/);
          return true;
        }
      );
    });
  });

  describe('Updating Recipient Profile (PUT /api/v1/recipients/profile)', () => {
    it('sends complete payload with validated ranges and receives updated profile', async () => {
      const updatePayload: ApiRecipientProfileUpdate = {
        org_type: 'COMMUNITY_KITCHEN',
        daily_capacity_meals: 200,
        storage_types: ['DRY', 'REFRIGERATED', 'FROZEN'],
        dietary_preferences: 'VEGETARIAN_ONLY',
        max_travel_distance_km: 10.0,
        operating_hours: '09:00 - 18:00',
      };

      const updatedResponse: ApiRecipientProfile = {
        id: 'recp_000001',
        user_id: 'usr-recip-001',
        org_type: 'COMMUNITY_KITCHEN',
        daily_capacity_meals: 200,
        storage_types: ['DRY', 'REFRIGERATED', 'FROZEN'],
        dietary_preferences: 'VEGETARIAN_ONLY',
        max_travel_distance_km: 10.0,
        operating_hours: '09:00 - 18:00',
        created_at: '2026-10-12T00:00:00Z',
        updated_at: '2026-10-12T01:00:00Z',
      };
      mockResponseBody = updatedResponse;

      const result = await apiUpdateRecipientProfile(updatePayload, 'test-jwt-token');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/recipients\/profile$/);
      assert.equal(interceptedCalls[0].options.method, 'PUT');
      assert.deepEqual(JSON.parse(interceptedCalls[0].options.body as string), updatePayload);
      assert.equal(result.daily_capacity_meals, 200);
      assert.equal(result.dietary_preferences, 'VEGETARIAN_ONLY');
      assert.deepEqual(result.storage_types, ['DRY', 'REFRIGERATED', 'FROZEN']);
    });

    it('handles validation failure response (422 Unprocessable Entity)', async () => {
      mockResponseStatus = 422;
      mockResponseBody = {
        detail: [
          {
            loc: ['body', 'daily_capacity_meals'],
            msg: 'Input should be greater than or equal to 0',
            type: 'greater_than_equal',
          },
        ],
      };

      const badPayload: ApiRecipientProfileUpdate = {
        org_type: 'SHELTER',
        daily_capacity_meals: -5,
        storage_types: ['DRY'],
        dietary_preferences: 'ALL',
        max_travel_distance_km: 15.0,
      };

      await assert.rejects(
        async () => {
          await apiUpdateRecipientProfile(badPayload, 'test-jwt-token');
        },
        (err: any) => {
          assert.equal(err instanceof ApiError, true);
          assert.equal(err.status, 422);
          return true;
        }
      );
    });

    it('handles network error gracefully and bubbles ApiError for UI preservation', async () => {
      globalThis.fetch = (async () => {
        throw new Error('Failed to fetch');
      }) as any;

      const payload: ApiRecipientProfileUpdate = {
        org_type: 'FOOD_BANK',
        daily_capacity_meals: 150,
        storage_types: ['DRY', 'REFRIGERATED'],
        dietary_preferences: 'ALL',
        max_travel_distance_km: 12.0,
      };

      await assert.rejects(
        async () => {
          await apiUpdateRecipientProfile(payload, 'test-jwt-token');
        },
        (err: any) => {
          assert.equal(err instanceof ApiError, true);
          assert.match(err.message, /Cannot connect to backend server/);
          return true;
        }
      );
    });
  });
});
