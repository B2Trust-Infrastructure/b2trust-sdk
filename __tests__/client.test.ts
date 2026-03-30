import { describe, it, beforeEach, afterEach, mock } from 'node:test';
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(body: unknown, status = 200, headers?: Record<string, string>): void {
  mock.method(globalThis, 'fetch', () =>
    Promise.resolve(new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    })),
  );
}

function mockFetchReject(error: Error): void {
  mock.method(globalThis, 'fetch', () => Promise.reject(error));
}

const SEARCH_RESPONSE = {
  status: 'ok' as const,
  data: [
    {
      country_code: 'PL',
      national_id: '0000578849',
      company_name: 'Test sp. z o.o.',
      legal_form: 'sp. z o.o.',
      status: 'active',
      registered_address: { city: 'Krakow', postalCode: '30-033', country: 'PL' },
      source_registries: [{ key: 'KRS', fetchedAt: '2026-03-22T10:15:00Z' }],
      confidence: { score: 72, level: 'medium', factors: [] },
    },
  ],
  meta: {
    total: 1,
    query: 'Test',
    mode: 'name' as const,
    query_time_ms: 150,
    country_counts: { PL: 1 },
    legal_forms: ['sp. z o.o.'],
  },
};

const COMPANY_RESPONSE = {
  status: 'ok' as const,
  data: SEARCH_RESPONSE.data[0]!,
};

const STATS_RESPONSE = {
  total_companies: 5025576,
  countries_count: 19,
  registries_count: 33,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('B2TrustClient', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  // -- Initialization -------------------------------------------------------

  describe('constructor', () => {
    it('creates client with required options', () => {
      const client = new B2TrustClient({ apiKey: 'test-key' });
      assert.ok(client instanceof B2TrustClient);
    });

    it('throws ValidationError when API key is empty', () => {
      assert.throws(
        () => new B2TrustClient({ apiKey: '' }),
        (err: unknown) => err instanceof ValidationError,
      );
    });
  });

  // -- search() -------------------------------------------------------------

  describe('search()', () => {
    it('builds correct URL with query parameter', async () => {
      mockFetch(SEARCH_RESPONSE);
      const client = new B2TrustClient({ apiKey: 'key-123' });

      await client.search('Microsoft');

      const fetchCall = (globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls[0]!;
      const url = new URL(fetchCall.arguments[0] as string);
      assert.equal(url.pathname, '/api/v1/search');
      assert.equal(url.searchParams.get('q'), 'Microsoft');
    });

    it('sends API key in X-API-Key header', async () => {
      mockFetch(SEARCH_RESPONSE);
      const client = new B2TrustClient({ apiKey: 'my-secret-key' });

      await client.search('test');

      const fetchCall = (globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls[0]!;
      const options = fetchCall.arguments[1] as RequestInit;
      const headers = options.headers as Record<string, string>;
      assert.equal(headers['X-API-Key'], 'my-secret-key');
    });

    it('parses search response correctly', async () => {
      mockFetch(SEARCH_RESPONSE);
      const client = new B2TrustClient({ apiKey: 'key' });

      const result = await client.search('Test');

      assert.equal(result.status, 'ok');
      assert.equal(result.data.length, 1);
      assert.equal(result.data[0]!.company_name, 'Test sp. z o.o.');
      assert.equal(result.meta.total, 1);
      assert.equal(result.meta.mode, 'name');
    });

    it('converts country array to comma-separated string', async () => {
      mockFetch(SEARCH_RESPONSE);
      const client = new B2TrustClient({ apiKey: 'key' });

      await client.search('test', { country: ['PL', 'UK', 'FR'] });

      const fetchCall = (globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls[0]!;
      const url = new URL(fetchCall.arguments[0] as string);
      assert.equal(url.searchParams.get('country'), 'PL,UK,FR');
    });

    it('passes all search options as query parameters', async () => {
      mockFetch(SEARCH_RESPONSE);
      const client = new B2TrustClient({ apiKey: 'key' });

      await client.search('test', {
        status: 'dissolved',
        legalForm: 'Ltd',
        sort: 'name',
        page: 2,
        limit: 10,
      });

      const fetchCall = (globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls[0]!;
      const url = new URL(fetchCall.arguments[0] as string);
      assert.equal(url.searchParams.get('status'), 'dissolved');
      assert.equal(url.searchParams.get('legal_form'), 'Ltd');
      assert.equal(url.searchParams.get('sort'), 'name');
      assert.equal(url.searchParams.get('page'), '2');
      assert.equal(url.searchParams.get('limit'), '10');
    });

    it('throws ValidationError for empty query', async () => {
      const client = new B2TrustClient({ apiKey: 'key' });

      await assert.rejects(
        () => client.search(''),
        (err: unknown) => err instanceof ValidationError,
      );

      await assert.rejects(
        () => client.search('   '),
        (err: unknown) => err instanceof ValidationError,
      );
    });
  });

  // -- getCompany() ---------------------------------------------------------

  describe('getCompany()', () => {
    it('builds correct URL with company ID', async () => {
      mockFetch(COMPANY_RESPONSE);
      const client = new B2TrustClient({ apiKey: 'key' });

      await client.getCompany('PL-0000578849');

      const fetchCall = (globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls[0]!;
      const url = new URL(fetchCall.arguments[0] as string);
      assert.equal(url.pathname, '/api/v1/company/PL-0000578849');
    });

    it('returns CompanyData (unwrapped from response)', async () => {
      mockFetch(COMPANY_RESPONSE);
      const client = new B2TrustClient({ apiKey: 'key' });

      const company = await client.getCompany('PL-0000578849');

      assert.equal(company.company_name, 'Test sp. z o.o.');
      assert.equal(company.country_code, 'PL');
    });

    it('throws ValidationError for empty ID', async () => {
      const client = new B2TrustClient({ apiKey: 'key' });
      await assert.rejects(
        () => client.getCompany(''),
        (err: unknown) => err instanceof ValidationError,
      );
    });
  });

  // -- getStats() -----------------------------------------------------------

  describe('getStats()', () => {
    it('returns platform statistics', async () => {
      mockFetch(STATS_RESPONSE);
      const client = new B2TrustClient({ apiKey: 'key' });

      const stats = await client.getStats();

      assert.equal(stats.total_companies, 5025576);
      assert.equal(stats.countries_count, 19);
      assert.equal(stats.registries_count, 33);
    });
  });

  // -- Error handling -------------------------------------------------------

  describe('error handling', () => {
    it('throws AuthenticationError on 401', async () => {
      mockFetch({ status: 'error', error: 'Invalid API key' }, 401);
      const client = new B2TrustClient({ apiKey: 'bad-key' });

      await assert.rejects(
        () => client.search('test'),
        (err: unknown) => {
          assert.ok(err instanceof AuthenticationError);
          assert.equal(err.statusCode, 401);
          assert.equal(err.message, 'Invalid API key');
          return true;
        },
      );
    });

    it('throws AuthenticationError on 403', async () => {
      mockFetch({ status: 'error', error: 'Forbidden' }, 403);
      const client = new B2TrustClient({ apiKey: 'revoked-key' });

      await assert.rejects(
        () => client.search('test'),
        (err: unknown) => err instanceof AuthenticationError && err.statusCode === 403,
      );
    });

    it('throws RateLimitError on 429 with retryAfter', async () => {
      mockFetch({ status: 'error', error: 'Rate limit exceeded', retry_after: 45 }, 429);
      const client = new B2TrustClient({ apiKey: 'key' });

      await assert.rejects(
        () => client.search('test'),
        (err: unknown) => {
          assert.ok(err instanceof RateLimitError);
          assert.equal(err.retryAfter, 45);
          return true;
        },
      );
    });

    it('defaults retryAfter to 60 when not provided', async () => {
      mockFetch({ status: 'error', error: 'Rate limit exceeded' }, 429);
      const client = new B2TrustClient({ apiKey: 'key' });

      await assert.rejects(
        () => client.search('test'),
        (err: unknown) => {
          assert.ok(err instanceof RateLimitError);
          assert.equal(err.retryAfter, 60);
          return true;
        },
      );
    });

    it('throws NotFoundError on 404', async () => {
      mockFetch({ status: 'error', error: 'Company not found' }, 404);
      const client = new B2TrustClient({ apiKey: 'key' });

      await assert.rejects(
        () => client.getCompany('XX-0000000000'),
        (err: unknown) => err instanceof NotFoundError,
      );
    });

    it('throws ValidationError on 400', async () => {
      mockFetch({ status: 'error', error: 'Invalid parameter' }, 400);
      const client = new B2TrustClient({ apiKey: 'key' });

      await assert.rejects(
        () => client.search('x'),
        (err: unknown) => err instanceof ValidationError,
      );
    });

    it('throws ServerError on 500', async () => {
      mockFetch({ status: 'error', error: 'Internal server error' }, 500);
      const client = new B2TrustClient({ apiKey: 'key' });

      await assert.rejects(
        () => client.search('test'),
        (err: unknown) => {
          assert.ok(err instanceof ServerError);
          assert.equal(err.statusCode, 500);
          return true;
        },
      );
    });

    it('throws TimeoutError when request exceeds timeout', async () => {
      const client = new B2TrustClient({ apiKey: 'key', timeout: 1 });
      // Mock fetch that respects the AbortSignal
      mock.method(globalThis, 'fetch', (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          const signal = init.signal!;
          signal.addEventListener('abort', () => {
            const err = new DOMException('The operation was aborted.', 'AbortError');
            reject(err);
          });
        }),
      );

      await assert.rejects(
        () => client.search('test'),
        (err: unknown) => err instanceof TimeoutError,
      );
    });

    it('throws NetworkError when fetch rejects', async () => {
      mockFetchReject(new TypeError('Failed to fetch'));
      const client = new B2TrustClient({ apiKey: 'key' });

      await assert.rejects(
        () => client.search('test'),
        (err: unknown) => {
          assert.ok(err instanceof NetworkError);
          assert.equal(err.message, 'Failed to fetch');
          return true;
        },
      );
    });
  });

  // -- Custom base URL ------------------------------------------------------

  describe('custom configuration', () => {
    it('uses custom base URL', async () => {
      mockFetch(STATS_RESPONSE);
      const client = new B2TrustClient({
        apiKey: 'key',
        baseUrl: 'https://staging.b2trust.com',
      });

      await client.getStats();

      const fetchCall = (globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls[0]!;
      const url = fetchCall.arguments[0] as string;
      assert.ok(url.startsWith('https://staging.b2trust.com'));
    });
  });
});
