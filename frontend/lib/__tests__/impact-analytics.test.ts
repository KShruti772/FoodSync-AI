import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  apiGetImpactSummary,
  apiGetImpactLedger,
  apiDownloadImpactCsv,
  apiDownloadImpactCertificate,
  ApiImpactLedgerResponse,
  ApiError,
} from '../api';

describe('Impact Analytics, Historical Ledger & Export Tests', () => {
  let interceptedCalls: Array<{ url: string; options: RequestInit }> = [];
  let mockResponseStatus = 200;
  let mockResponseBody: any = {};
  let mockBlobContent: string = '';

  beforeEach(() => {
    interceptedCalls = [];
    mockResponseStatus = 200;
    mockResponseBody = {};
    mockBlobContent = '';

    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      interceptedCalls.push({
        url: url.toString(),
        options: options || {},
      });

      return {
        ok: mockResponseStatus >= 200 && mockResponseStatus < 300,
        status: mockResponseStatus,
        json: async () => mockResponseBody,
        text: async () => typeof mockResponseBody === 'string' ? mockResponseBody : JSON.stringify(mockResponseBody),
        blob: async () => new Blob([mockBlobContent]),
      } as unknown as Response;
    }) as any;
  });

  describe('apiGetImpactSummary', () => {
    it('fetches public platform impact summary when unauthenticated', async () => {
      mockResponseBody = {
        total_meals_rescued: 450,
        total_food_weight_kg: 225.0,
        total_co2_savings_kg: 562.5,
        total_completed_donations: 12,
      };

      const summary = await apiGetImpactSummary();
      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/impact\/summary$/);
      assert.equal((interceptedCalls[0].options.headers as any)?.Authorization, undefined);
      assert.equal(summary.total_meals_rescued, 450);
      assert.equal(summary.total_food_weight_kg, 225.0);
    });

    it('passes authorization and query parameters when requested', async () => {
      mockResponseBody = {
        total_meals_rescued: 80,
        total_food_weight_kg: 40.0,
        total_co2_savings_kg: 100.0,
        total_completed_donations: 2,
      };

      const summary = await apiGetImpactSummary('prov-jwt-token', {
        scope: 'user',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      });

      assert.equal(interceptedCalls.length, 1);
      const call = interceptedCalls[0];
      assert.match(call.url, /scope=user/);
      assert.match(call.url, /start_date=2026-10-01/);
      assert.match(call.url, /end_date=2026-10-31/);
      assert.equal((call.options.headers as any).Authorization, 'Bearer prov-jwt-token');
      assert.equal(summary.total_meals_rescued, 80);
    });
  });

  describe('apiGetImpactLedger', () => {
    it('retrieves full impact ledger with reconciled summary, monthly trends, and records', async () => {
      const mockLedger: ApiImpactLedgerResponse = {
        summary: {
          total_meals_rescued: 140,
          total_food_weight_kg: 70.0,
          total_co2_savings_kg: 175.0,
          total_completed_donations: 2,
        },
        monthly_trends: [
          {
            month: '2026-09',
            meals_rescued: 60,
            food_weight_kg: 30.0,
            co2_savings_kg: 75.0,
            completed_rescues: 1,
          },
          {
            month: '2026-10',
            meals_rescued: 80,
            food_weight_kg: 40.0,
            co2_savings_kg: 100.0,
            completed_rescues: 1,
          },
        ],
        records: [
          {
            id: 'imp_001',
            donation_id: 'don_001',
            match_id: 'mat_001',
            donation_title: '60 Thali Meals',
            food_type: 'VEGETARIAN_COOKED',
            completed_at: '2026-10-10T12:00:00Z',
            meals_rescued: 80,
            food_weight_kg: 40.0,
            co2_savings_kg: 100.0,
            provider_name: 'Solapur Grand Catering',
            recipient_name: 'Hope Shelter',
            verification_notes: 'Delivered warm and fresh',
          },
          {
            id: 'imp_002',
            donation_id: 'don_002',
            match_id: 'mat_002',
            donation_title: '60 Thali Meals',
            food_type: 'VEGETARIAN_COOKED',
            completed_at: '2026-09-20T10:00:00Z',
            meals_rescued: 60,
            food_weight_kg: 30.0,
            co2_savings_kg: 75.0,
            provider_name: 'Solapur Grand Catering',
            recipient_name: 'Hope Shelter',
          },
        ],
        scope: 'user',
      };
      mockResponseBody = mockLedger;

      const ledger = await apiGetImpactLedger('auth-token-123', {
        scope: 'user',
        startDate: '2026-09-01',
      });

      assert.equal(interceptedCalls.length, 1);
      assert.match(interceptedCalls[0].url, /\/api\/v1\/impact\/ledger/);
      assert.equal((interceptedCalls[0].options.headers as any).Authorization, 'Bearer auth-token-123');

      // Verify mathematical reconciliation between summary, trends, and individual records
      assert.equal(
        ledger.summary.total_meals_rescued,
        ledger.records.reduce((sum, r) => sum + r.meals_rescued, 0)
      );
      assert.equal(
        ledger.summary.total_food_weight_kg,
        ledger.records.reduce((sum, r) => sum + r.food_weight_kg, 0)
      );
      assert.equal(
        ledger.summary.total_completed_donations,
        ledger.records.length
      );
      assert.equal(
        ledger.summary.total_meals_rescued,
        ledger.monthly_trends.reduce((sum, m) => sum + m.meals_rescued, 0)
      );
    });

    it('throws ApiError if ledger fetch returns 401/403', async () => {
      mockResponseStatus = 401;
      mockResponseBody = { detail: 'Invalid or expired token' };

      await assert.rejects(
        async () => apiGetImpactLedger('expired-token'),
        (err: any) => {
          assert.equal(err instanceof ApiError, true);
          assert.equal(err.status, 401);
          return true;
        }
      );
    });
  });

  describe('apiDownloadImpactCsv', () => {
    it('downloads authenticated CSV blob with filter parameters', async () => {
      mockBlobContent = 'Rescue Reference,Donation Title\nimp_001,60 Meals\n';

      const blob = await apiDownloadImpactCsv('auth-token-456', {
        scope: 'user',
        startDate: '2026-10-01',
      });

      assert.equal(interceptedCalls.length, 1);
      const call = interceptedCalls[0];
      assert.match(call.url, /\/api\/v1\/impact\/export\/csv\?/);
      assert.match(call.url, /start_date=2026-10-01/);
      assert.equal((call.options.headers as any).Authorization, 'Bearer auth-token-456');
      assert.ok(blob instanceof Blob);
    });
  });

  describe('apiDownloadImpactCertificate', () => {
    it('downloads signed PDF certificate for authorized donation', async () => {
      mockBlobContent = '%PDF-1.4\n...%%EOF\n';

      const blob = await apiDownloadImpactCertificate('don_00000001', 'auth-token-789');

      assert.equal(interceptedCalls.length, 1);
      const call = interceptedCalls[0];
      assert.match(call.url, /\/api\/v1\/impact\/certificates\/don_00000001$/);
      assert.equal((call.options.headers as any).Authorization, 'Bearer auth-token-789');
      assert.ok(blob instanceof Blob);
    });

    it('throws ApiError on forbidden certificate access (403)', async () => {
      mockResponseStatus = 403;
      mockResponseBody = {
        detail: {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You are not authorized to access this impact certificate' },
        },
      };

      await assert.rejects(
        async () => apiDownloadImpactCertificate('don_other_org', 'stranger-token'),
        (err: any) => {
          assert.equal(err instanceof ApiError, true);
          assert.equal(err.status, 403);
          assert.match(err.message, /not authorized/);
          return true;
        }
      );
    });
  });
});
