/**
 * B2Trust API Client
 *
 * Native-fetch HTTP client with auth, timeout, typed errors, and automatic
 * retry on HTTP 429 (honoring Retry-After). No runtime dependencies.
 */

import type {
  ClientOptions,
  SearchOptions,
  SearchResponse,
  CompanyProfile,
  CompanyResponse,
  BankVerification,
  BankVerificationResponse,
  Stats,
  StatsResponse,
  ApiErrorResponse,
} from './types.ts';

import {
  B2TrustError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
  ServerError,
  TimeoutError,
  NetworkError,
} from './errors.ts';

import { buildUrl, searchOptionsToParams, sleep } from './utils.ts';

const DEFAULT_BASE_URL = 'https://b2trust.com';
const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_MAX_RETRIES = 2;

interface RequestInitLite {
  method?: 'GET' | 'POST';
  body?: unknown;
}

export class B2TrustClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(options: ClientOptions) {
    if (!options.apiKey) {
      throw new ValidationError('API key is required. Get one at https://b2trust.com/developers');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  /**
   * Search for companies by name or national identifier.
   *
   * @example
   * const results = await client.search('Microsoft', { country: ['PL', 'GB'] });
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    if (!query || query.trim().length === 0) {
      throw new ValidationError('Search query must not be empty');
    }
    const params = searchOptionsToParams(query, options);
    const url = buildUrl(this.baseUrl, '/api/v1/search', params);
    return this.request<SearchResponse>(url);
  }

  /**
   * Get a full company profile by composite ID (`{country}-{national_id}`).
   *
   * @example
   * const company = await client.getCompany('PL-7342867148');
   */
  async getCompany(id: string): Promise<CompanyProfile> {
    if (!id || id.trim().length === 0) {
      throw new ValidationError('Company ID must not be empty');
    }
    const url = buildUrl(this.baseUrl, `/api/v1/company/${encodeURIComponent(id)}`);
    const response = await this.request<CompanyResponse>(url);
    return response.data;
  }

  /**
   * Verify whether a bank account is registered against a Polish company on the
   * VAT Whitelist (Biała Lista). Poland only. Never returns account numbers.
   *
   * @param id - Composite company ID, e.g. `PL-7342867148`.
   * @param account - 26-digit NRB or `PL` + 26-digit IBAN (separators ignored).
   *
   * @example
   * const result = await client.verifyBank('PL-7342867148', 'PL61109010140000071219812874');
   */
  async verifyBank(id: string, account: string): Promise<BankVerification> {
    if (!id || id.trim().length === 0) {
      throw new ValidationError('Company ID must not be empty');
    }
    if (!account || account.trim().length === 0) {
      throw new ValidationError('Bank account must not be empty');
    }
    const url = buildUrl(this.baseUrl, `/api/v1/company/${encodeURIComponent(id)}/verify-bank`);
    const response = await this.request<BankVerificationResponse>(url, { method: 'POST', body: { account } });
    return response.data;
  }

  /**
   * Get aggregate platform statistics.
   *
   * @example
   * const stats = await client.getStats(); // { firms: '30.1M+', countries: 33, ... }
   */
  async getStats(): Promise<Stats> {
    const url = buildUrl(this.baseUrl, '/api/v1/stats');
    const response = await this.request<StatsResponse>(url);
    return response.data;
  }

  // --- Internal HTTP layer -------------------------------------------------

  private async request<T>(url: string, init?: RequestInitLite): Promise<T> {
    let attempt = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      let response: Response;
      try {
        const headers: Record<string, string> = {
          'X-API-Key': this.apiKey,
          Accept: 'application/json',
        };
        const reqInit: RequestInit = {
          method: init?.method ?? 'GET',
          headers,
          signal: controller.signal,
        };
        if (init?.body !== undefined) {
          headers['Content-Type'] = 'application/json';
          reqInit.body = JSON.stringify(init.body);
        }
        response = await fetch(url, reqInit);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new TimeoutError(`Request timed out after ${this.timeout}ms`);
        }
        throw new NetworkError(error instanceof Error ? error.message : 'Network request failed');
      } finally {
        clearTimeout(timer);
      }

      // Auto-retry on 429 while attempts remain, honoring Retry-After.
      if (response.status === 429 && attempt < this.maxRetries) {
        attempt++;
        await sleep(this.parseRetryAfterMs(response));
        continue;
      }

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }
      return (await response.json()) as T;
    }
  }

  /** Retry-After header (seconds) → ms; default 1000ms when absent/invalid. */
  private parseRetryAfterMs(response: Response): number {
    const header = response.headers.get('Retry-After');
    const seconds = header ? parseInt(header, 10) : NaN;
    return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : 1000;
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let body: ApiErrorResponse | undefined;
    try {
      body = (await response.json()) as ApiErrorResponse;
    } catch {
      // not JSON — fall through
    }
    const message = body?.error ?? `HTTP ${response.status}`;

    switch (response.status) {
      case 400:
        throw new ValidationError(message, body);
      case 401:
      case 403:
        throw new AuthenticationError(message, response.status, body);
      case 404:
        throw new NotFoundError(message, body);
      case 429:
        throw new RateLimitError(message, body?.retry_after ?? 60, body);
      default:
        if (response.status >= 500) {
          throw new ServerError(message, response.status, body);
        }
        throw new B2TrustError(message, response.status, body);
    }
  }
}
