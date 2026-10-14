import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  apiGetRecipientMatches,
  apiAcceptMatch,
  apiCompleteDonation,
  ApiMatch,
  ApiDonation,
  ApiError,
} from '../api';

describe('Match Alerts, Polling Refresh & Pickup Coordination Unit Tests', () => {
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

  describe('Match Discovery via Polling', () => {
    it('fetches candidate matches for recipient via apiGetRecipientMatches', async () => {
      const mockMatches: ApiMatch[] = [
        {
          id: 'mat_001',
          donation_id: 'don_101',
          recipient_id: 'usr-recip-001',
          compatibility_score: 0.88,
          distance_km: 2.5,
          status: 'PROPOSED',
          created_at: '2026-10-12T00:00:00Z',
          updated_at: '2026-10-12T00:00:00Z',
        },
      ];
      mockResponseBody = { success: true, data: mockMatches };

      const result = await apiGetRecipientMatches('test-token');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/recipients\/matches$/);
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'mat_001');
      assert.equal(result[0].status, 'PROPOSED');
    });

    it('handles network failure during polling without uncaught exception', async () => {
      globalThis.fetch = (async () => {
        throw new Error('Connection reset by peer');
      }) as any;

      await assert.rejects(
        async () => {
          await apiGetRecipientMatches('test-token');
        },
        (err: any) => {
          assert.equal(err instanceof ApiError, true);
          assert.match(err.message, /Cannot connect to backend server/);
          return true;
        }
      );
    });

    it('deduplicates entities cleanly when multiple polls return identical records', () => {
      const sampleMatches = [
        { id: 'mat_1', donationId: 'don_1' },
        { id: 'mat_2', donationId: 'don_2' },
        { id: 'mat_1', donationId: 'don_1' }, // duplicate from concurrent poll
      ];

      const deduplicated = Array.from(new Map(sampleMatches.map((m) => [m.id, m])).values());
      assert.equal(deduplicated.length, 2);
      assert.equal(deduplicated[0].id, 'mat_1');
      assert.equal(deduplicated[1].id, 'mat_2');
    });
  });

  describe('Reservation Acceptance & Handover Coordination', () => {
    it('accepts a proposed match to reserve surplus food', async () => {
      mockResponseBody = {
        success: true,
        message: 'Match accepted',
        data: {
          id: 'mat_001',
          donation_id: 'don_101',
          recipient_id: 'usr-recip-001',
          status: 'ACCEPTED',
        },
      };

      const result = await apiAcceptMatch('mat_001', 'recipient-token');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/matches\/mat_001\/accept$/);
      assert.equal(interceptedCalls[0].options.method, 'POST');
      assert.equal(result.data.status, 'ACCEPTED');
    });

    it('completes food handover with confirmed meal quantity and verification notes', async () => {
      mockResponseBody = {
        success: true,
        message: 'Donation completed and impact logged',
        data: {
          donation_id: 'don_101',
          status: 'COMPLETED',
          donation: { id: 'don_101', quantity_meals: 45 },
          impact: {
            id: 'imp_001',
            meals_served: 45,
            meals_rescued: 45,
            food_weight_kg: 22.5,
            co2_savings_kg: 56.25,
          },
        },
      };

      const payload = {
        confirmed_quantity_meals: 45,
        notes: 'Collected in sanitized temperature-controlled bags.',
      };

      const result = await apiCompleteDonation('don_101', payload, 'recipient-token');

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/donations\/don_101\/complete$/);
      assert.equal(interceptedCalls[0].options.method, 'POST');
      assert.deepEqual(JSON.parse(interceptedCalls[0].options.body as string), payload);
      assert.equal(result.data.status, 'COMPLETED');
      assert.equal(result.data.impact.meals_rescued, 45);
    });

    it('rejects handover completion from unauthorized party (403 Forbidden)', async () => {
      mockResponseStatus = 403;
      mockResponseBody = {
        detail: {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not authorized to complete this donation',
            details: [],
          },
        },
      };

      await assert.rejects(
        async () => {
          await apiCompleteDonation('don_101', {}, 'unauthorized-token');
        },
        (err: any) => {
          assert.equal(err instanceof ApiError, true);
          assert.equal(err.status, 403);
          assert.match(err.message, /not authorized to complete/);
          return true;
        }
      );
    });
  });

  describe('Map Preview and Routing URL Computation', () => {
    it('computes OpenStreetMap bbox and routing parameters safely without external keys', () => {
      const lat = 17.6599;
      const lng = 75.9064;
      const delta = 0.008;

      const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
      const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
        bbox
      )}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;

      assert.match(embedUrl, /https:\/\/www\.openstreetmap\.org\/export\/embed\.html/);
      assert.match(embedUrl, /marker=17\.6599%2C75\.9064/);

      // Routing URL between recipient and donor
      const recipLat = 17.665;
      const recipLng = 75.912;
      const routeUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${recipLat}%2C${recipLng}%3B${lat}%2C${lng}`;
      assert.match(routeUrl, /route=17\.665%2C75\.912%3B17\.6599%2C75\.9064/);
    });
  });
});
