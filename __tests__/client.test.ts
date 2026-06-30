import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { B2TrustClient } from '../src/client.ts';
import {
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
  ServerError,
  TimeoutError,
  NetworkError,
} from '../src/errors.ts';

function mockFetch(body: unknown, status = 200, headers?: Record<string, string>): void {
  mock.method(globalThis, 'fetch', () =>
    Promise.resolve(new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    })),
  );
}

/** Returns a different queued response per call (last one repeats). */
function mockFetchSequence(responses: Array<{ body: unknown; status: number; headers?: Record<string, string> }>): void {
  let i = 0;
  mock.method(globalThis, 'fetch', () => {
    const r = responses[Math.min(i, responses.length - 1)]!;
    i++;
    return Promise.resolve(new Response(JSON.stringify(r.body), {
      status: r.status,
      headers: { 'content-type': 'application/json', ...r.headers },
    }));
  });
}

function mockFetchReject(error: Error): void {
  mock.method(globalThis, 'fetch', () => Promise.reject(error));
}

const SEARCH_RESPONSE = {
  status: 'ok' as const,
  query: 'Test',
  mode: 'name' as const,
  data: [
    {
      country_code: 'PL',
      national_id: '7342867148',
      registry_number: '0000317499',
      company_name: 'Test sp. z o.o.',
      legal_form: 'sp. z o.o.',
      status: 'active',
      registered_address: { city: 'Krakow', postal_code: '30-033', country: 'PL' },
      registration_date: '2002-02-01',
      registry_count: 3,
      vat_number: 'PL7342867148',
      fetched_at: '2026-04-30T00:23:02.602Z',
      confidence: { score: 72, label: 'Medium', color: 'amber', factors: [] },
      first_indexed_at: null,
      vies_status: 'valid',
      vies_note: null,
    },
  ],
  meta: {
    total: 1, page: 1, limit: 50, total_pages: 1, query_time_ms: 150,
    cache_hit: true, countries: ['PL'], country_counts: { PL: 1 }, legal_forms: ['sp. z o.o.'],
  },
};

const COMPANY_RESPONSE = {
  status: 'ok' as const,
  data: {
    country_code: 'PL', national_id: '7342867148', vat_number: 'PL7342867148', secondary_id: '0000317499',
    registry_number: '0000317499', company_name: 'Test sp. z o.o.', legal_form: 'sp. z o.o.',
    registered_address: { city: 'Krakow', postal_code: '30-033', country: 'PL' }, registration_date: '2002-02-01',
    status: 'active', activity_codes: [], registry_count: 3, bank_accounts_count: 2,
    verified_at: '2026-04-30T00:23:02.602Z', first_indexed_at: null,
    vies_cross_check_status: 'valid_match', vies_name: 'TEST', vies_match_score: 0.9,
    vies_checked_at: '2026-04-30T00:23:01.000Z', vies_vat_id: 'PL7342867148', confirmation_count: 5,
    source_breakdown: { registry: 3, search: 2, node_scan: 0, opc: 0, bulk_import: 0 },
    first_seen: '2025-11-10T08:14:00.000Z', last_confirmed: '2026-04-30T00:23:02.602Z',
  },
  meta: { cached: true, enriched: false, source_count: 3, fetched_at: '2026-04-30T00:23:02.602Z', expires_at: '2026-05-07T00:23:02.602Z' },
};

const BANK_RESPONSE = {
  status: 'ok' as const,
  data: { verified: true, company_name: 'Test sp. z o.o.', account_count: 2, checked_at: '2026-06-30T00:00:00.000Z' },
};

const STATS_RESPONSE = {
  status: 'ok' as const,
  data: { firms: '30.1M+', countries: 33, continents: 4, price: '€0.00', searches_today: 6, cached_companies: 29471564 },
};

describe('B2TrustClient', () => {
  afterEach(() => mock.restoreAll());

  describe('constructor', () => {
    it('creates client with required options', () => {
      assert.ok(new B2TrustClient({ apiKey: 'k' }) instanceof B2TrustClient);
    });
    it('throws ValidationError when API key is empty', () => {
      assert.throws(() => new B2TrustClient({ apiKey: '' }), (e: unknown) => e instanceof ValidationError);
    });
  });

  describe('search()', () => {
    it('builds correct URL with query', async () => {
      mockFetch(SEARCH_RESPONSE);
      await new B2TrustClient({ apiKey: 'k' }).search('Microsoft');
      const call = (globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls[0]!;
      const url = new URL(call.arguments[0] as string);
      assert.equal(url.pathname, '/api/v1/search');
      assert.equal(url.searchParams.get('q'), 'Microsoft');
    });

    it('sends X-API-Key header', async () => {
      mockFetch(SEARCH_RESPONSE);
      await new B2TrustClient({ apiKey: 'secret' }).search('test');
      const call = (globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls[0]!;
      const headers = (call.arguments[1] as RequestInit).headers as Record<string, string>;
      assert.equal(headers['X-API-Key'], 'secret');
    });

    it('parses the search envelope', async () => {
      mockFetch(SEARCH_RESPONSE);
      const r = await new B2TrustClient({ apiKey: 'k' }).search('Test');
      assert.equal(r.status, 'ok');
      assert.equal(r.mode, 'name');
      assert.equal(r.data[0]!.company_name, 'Test sp. z o.o.');
      assert.equal(r.data[0]!.registry_count, 3);
      assert.equal(r.meta.limit, 50);
      assert.equal(r.meta.cache_hit, true);
    });

    it('joins country array', async () => {
      mockFetch(SEARCH_RESPONSE);
      await new B2TrustClient({ apiKey: 'k' }).search('t', { country: ['PL', 'GB', 'FR'] });
      const call = (globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls[0]!;
      assert.equal(new URL(call.arguments[0] as string).searchParams.get('country'), 'PL,GB,FR');
    });

    it('passes all options as params', async () => {
      mockFetch(SEARCH_RESPONSE);
      await new B2TrustClient({ apiKey: 'k' }).search('t', {
        status: 'suspended', legalForm: ['Ltd', 'SAS'], city: 'Warszawa',
        dateFrom: '2000-01-01', dateTo: '2026-01-01', sort: 'newest', page: 2, limit: 10, locale: 'pl',
      });
      const call = (globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls[0]!;
      const p = new URL(call.arguments[0] as string).searchParams;
      assert.equal(p.get('status'), 'suspended');
      assert.equal(p.get('legal_form'), 'Ltd,SAS');
      assert.equal(p.get('city'), 'Warszawa');
      assert.equal(p.get('date_from'), '2000-01-01');
      assert.equal(p.get('date_to'), '2026-01-01');
      assert.equal(p.get('sort'), 'newest');
      assert.equal(p.get('page'), '2');
      assert.equal(p.get('limit'), '10');
      assert.equal(p.get('locale'), 'pl');
    });

    it('throws ValidationError for empty query', async () => {
      const c = new B2TrustClient({ apiKey: 'k' });
      await assert.rejects(() => c.search(''), (e: unknown) => e instanceof ValidationError);
      await assert.rejects(() => c.search('   '), (e: unknown) => e instanceof ValidationError);
    });
  });

  describe('getCompany()', () => {
    it('builds correct URL', async () => {
      mockFetch(COMPANY_RESPONSE);
      await new B2TrustClient({ apiKey: 'k' }).getCompany('PL-7342867148');
      const call = (globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls[0]!;
      assert.equal(new URL(call.arguments[0] as string).pathname, '/api/v1/company/PL-7342867148');
    });

    it('returns the unwrapped profile', async () => {
      mockFetch(COMPANY_RESPONSE);
      const c = await new B2TrustClient({ apiKey: 'k' }).getCompany('PL-7342867148');
      assert.equal(c.company_name, 'Test sp. z o.o.');
      assert.equal(c.confirmation_count, 5);
      assert.equal(c.source_breakdown.registry, 3);
    });

    it('throws ValidationError for empty ID', async () => {
      await assert.rejects(() => new B2TrustClient({ apiKey: 'k' }).getCompany(''), (e: unknown) => e instanceof ValidationError);
    });
  });

  describe('verifyBank()', () => {
    it('POSTs the account in a JSON body', async () => {
      mockFetch(BANK_RESPONSE);
      await new B2TrustClient({ apiKey: 'k' }).verifyBank('PL-7342867148', 'PL61109010140000071219812874');
      const call = (globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls[0]!;
      const url = new URL(call.arguments[0] as string);
      const init = call.arguments[1] as RequestInit;
      assert.equal(url.pathname, '/api/v1/company/PL-7342867148/verify-bank');
      assert.equal(init.method, 'POST');
      assert.equal((init.headers as Record<string, string>)['Content-Type'], 'application/json');
      assert.deepEqual(JSON.parse(init.body as string), { account: 'PL61109010140000071219812874' });
    });

    it('returns the unwrapped verification result', async () => {
      mockFetch(BANK_RESPONSE);
      const r = await new B2TrustClient({ apiKey: 'k' }).verifyBank('PL-7342867148', '61109010140000071219812874');
      assert.equal(r.verified, true);
      assert.equal(r.account_count, 2);
    });

    it('throws ValidationError for empty account', async () => {
      await assert.rejects(
        () => new B2TrustClient({ apiKey: 'k' }).verifyBank('PL-7342867148', ''),
        (e: unknown) => e instanceof ValidationError,
      );
    });
  });

  describe('getStats()', () => {
    it('returns the unwrapped stats', async () => {
      mockFetch(STATS_RESPONSE);
      const s = await new B2TrustClient({ apiKey: 'k' }).getStats();
      assert.equal(s.countries, 33);
      assert.equal(s.cached_companies, 29471564);
      assert.equal(s.firms, '30.1M+');
    });
  });

  describe('429 auto-retry', () => {
    it('retries on 429 then succeeds', async () => {
      mockFetchSequence([
        { body: { status: 'error', error: 'rate limited' }, status: 429, headers: { 'Retry-After': '0' } },
        { body: SEARCH_RESPONSE, status: 200 },
      ]);
      const r = await new B2TrustClient({ apiKey: 'k', maxRetries: 2 }).search('test');
      assert.equal(r.status, 'ok');
      assert.equal((globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls.length, 2);
    });

    it('throws RateLimitError after exhausting retries', async () => {
      mockFetch({ status: 'error', error: 'rate limited', retry_after: 30 }, 429, { 'Retry-After': '0' });
      await assert.rejects(
        () => new B2TrustClient({ apiKey: 'k', maxRetries: 2 }).search('test'),
        (e: unknown) => e instanceof RateLimitError && (e as RateLimitError).retryAfter === 30,
      );
      assert.equal((globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls.length, 3);
    });

    it('does not retry when maxRetries is 0', async () => {
      mockFetch({ status: 'error', error: 'rate limited' }, 429);
      await assert.rejects(
        () => new B2TrustClient({ apiKey: 'k', maxRetries: 0 }).search('test'),
        (e: unknown) => e instanceof RateLimitError,
      );
      assert.equal((globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls.length, 1);
    });
  });

  describe('error handling (retries disabled)', () => {
    it('401 → AuthenticationError', async () => {
      mockFetch({ status: 'error', error: 'Invalid API key' }, 401);
      await assert.rejects(
        () => new B2TrustClient({ apiKey: 'bad', maxRetries: 0 }).search('t'),
        (e: unknown) => e instanceof AuthenticationError && (e as AuthenticationError).statusCode === 401,
      );
    });
    it('403 → AuthenticationError', async () => {
      mockFetch({ status: 'error', error: 'Forbidden' }, 403);
      await assert.rejects(
        () => new B2TrustClient({ apiKey: 'k', maxRetries: 0 }).search('t'),
        (e: unknown) => e instanceof AuthenticationError && (e as AuthenticationError).statusCode === 403,
      );
    });
    it('404 → NotFoundError', async () => {
      mockFetch({ status: 'error', error: 'Company not found' }, 404);
      await assert.rejects(
        () => new B2TrustClient({ apiKey: 'k', maxRetries: 0 }).getCompany('XX-0'),
        (e: unknown) => e instanceof NotFoundError,
      );
    });
    it('400 → ValidationError', async () => {
      mockFetch({ status: 'error', error: 'Invalid parameter' }, 400);
      await assert.rejects(
        () => new B2TrustClient({ apiKey: 'k', maxRetries: 0 }).search('x'),
        (e: unknown) => e instanceof ValidationError,
      );
    });
    it('500 → ServerError', async () => {
      mockFetch({ status: 'error', error: 'Internal server error' }, 500);
      await assert.rejects(
        () => new B2TrustClient({ apiKey: 'k', maxRetries: 0 }).search('t'),
        (e: unknown) => e instanceof ServerError && (e as ServerError).statusCode === 500,
      );
    });
    it('timeout → TimeoutError', async () => {
      const c = new B2TrustClient({ apiKey: 'k', timeout: 1, maxRetries: 0 });
      mock.method(globalThis, 'fetch', (_u: string, init: RequestInit) =>
        new Promise((_res, reject) => {
          init.signal!.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')));
        }),
      );
      await assert.rejects(() => c.search('t'), (e: unknown) => e instanceof TimeoutError);
    });
    it('fetch rejection → NetworkError', async () => {
      mockFetchReject(new TypeError('Failed to fetch'));
      await assert.rejects(
        () => new B2TrustClient({ apiKey: 'k', maxRetries: 0 }).search('t'),
        (e: unknown) => e instanceof NetworkError && (e as NetworkError).message === 'Failed to fetch',
      );
    });
  });

  describe('custom configuration', () => {
    it('uses a custom base URL', async () => {
      mockFetch(STATS_RESPONSE);
      await new B2TrustClient({ apiKey: 'k', baseUrl: 'https://staging.b2trust.com' }).getStats();
      const call = (globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls[0]!;
      assert.ok((call.arguments[0] as string).startsWith('https://staging.b2trust.com'));
    });
  });
});
