/**
 * B2Trust API Client
 *
 * Core HTTP client with authentication, timeout, and structured error handling.
 * Uses native `fetch` — no runtime dependencies.
 */

import type {
  ClientOptions,
  SearchOptions,
  SearchResponse,
  CompanyData,
  CompanyResponse,
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

import { buildUrl, searchOptionsToParams } from './utils.ts';

const DEFAULT_BASE_URL = 'https://b2trust.com';
const DEFAULT_TIMEOUT = 10_000;

export class B2TrustClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(options: ClientOptions) {
    if (!options.apiKey) {
      throw new ValidationError('API key is required. Get one at https://b2trust.com/developers');
    }

    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * Search for companies by name or national identifier.
   *
   * The API auto-detects whether the query is a company name or a national ID
   * (KRS number, NIP, SIREN, CRN, ABN, etc.) unless you explicitly set `mode`.
   *
   * @param query - Company name or national identifier.
   * @param options - Optional filters and pagination.
   * @returns Search results with metadata.
   *
   * @example
   * ```ts
   * const results = await client.search('Microsoft', { country: ['PL', 'UK'] });
   * console.log(results.data); // CompanyData[]
   * ```
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
   * Get a single company profile by its composite ID.
   *
   * @param id - Composite ID in `{country_code}-{national_id}` format (e.g. `PL-0000578849`).
   * @returns The company data record.
   *
   * @example
   * ```ts
   * const company = await client.getCompany('PL-0000578849');
   * console.log(company.company_name);
   * ```
   */
  async getCompany(id: string): Promise<CompanyData> {
    if (!id || id.trim().length === 0) {
      throw new ValidationError('Company ID must not be empty');
    }

    const url = buildUrl(this.baseUrl, `/api/v1/company/${encodeURIComponent(id)}`);
    const response = await this.request<CompanyResponse>(url);
    return response.data;
  }

  /**
   * Get aggregate platform statistics (total companies, countries, registries).
   *
   * @returns Current B2Trust platform statistics.
   *
   * @example
   * ```ts
   * const stats = await client.getStats();
   * console.log(`${stats.total_companies} companies indexed`);
   * ```
   */
  async getStats(): Promise<StatsResponse> {
    const url = buildUrl(this.baseUrl, '/api/v1/stats');
    return this.request<StatsResponse>(url);
  }

  // ---------------------------------------------------------------------------
  // Internal HTTP layer
  // ---------------------------------------------------------------------------

  private async request<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let response: Response;

    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new TimeoutError(`Request timed out after ${this.timeout}ms`);
      }
      throw new NetworkError(
        error instanceof Error ? error.message : 'Network request failed',
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return (await response.json()) as T;
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let body: ApiErrorResponse | undefined;
    try {
      body = (await response.json()) as ApiErrorResponse;
    } catch {
      // Response body is not JSON — fall through with undefined body
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
