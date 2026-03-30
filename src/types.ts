/**
 * B2Trust SDK Type Definitions
 *
 * Complete TypeScript interfaces for the B2Trust public API.
 * All types match the JSON response shapes from https://b2trust.com/api/v1/.
 */

// ---------------------------------------------------------------------------
// Client configuration
// ---------------------------------------------------------------------------

/** Options for initializing a {@link B2TrustClient}. */
export interface ClientOptions {
  /** Your B2Trust API key. Required. Get one at https://b2trust.com/developers */
  apiKey: string;

  /** Base URL of the B2Trust API. Defaults to `https://b2trust.com`. */
  baseUrl?: string;

  /** Request timeout in milliseconds. Defaults to `10000` (10 s). */
  timeout?: number;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** Options for {@link B2TrustClient.search}. */
export interface SearchOptions {
  /** Filter by one or more 2-letter country codes (e.g. `'PL'` or `['PL','UK']`). */
  country?: string | string[];

  /** Filter by company status. Defaults to `'active'`. */
  status?: 'active' | 'dissolved' | 'all';

  /** Filter by legal form (e.g. `'sp. z o.o.'`, `'Ltd'`). */
  legalForm?: string;

  /** Sort order. Defaults to `'relevance'`. */
  sort?: 'relevance' | 'name' | 'date';

  /** Page number (1-based). Defaults to `1`. */
  page?: number;

  /** Results per page. Defaults to `500`. */
  limit?: number;

  /** Explicit search mode. Auto-detected when omitted. */
  mode?: 'name' | 'taxid';
}

/** Successful response from the search endpoint. */
export interface SearchResponse {
  status: 'ok';
  data: CompanyData[];
  meta: SearchMeta;
}

/** Metadata returned alongside search results. */
export interface SearchMeta {
  /** Total number of matching companies across all pages. */
  total: number;

  /** The original query string. */
  query: string;

  /** Detected search mode — `name` or `taxid`. */
  mode: 'name' | 'taxid';

  /** Server-side query duration in milliseconds. */
  query_time_ms: number;

  /** Number of results per country code. */
  country_counts: Record<string, number>;

  /** Distinct legal forms present in the result set. */
  legal_forms: string[];
}

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

/** A single company record returned by the B2Trust API. */
export interface CompanyData {
  /** ISO 3166-1 alpha-2 country code (e.g. `'PL'`, `'UK'`, `'FR'`). */
  country_code: string;

  /** National registration identifier (e.g. KRS number, CRN, SIREN). */
  national_id: string;

  /** Official registered company name. */
  company_name: string;

  /** Legal form label (e.g. `'sp. z o.o.'`, `'Ltd'`), or `null` if unavailable. */
  legal_form: string | null;

  /** Current company status. */
  status: 'active' | 'dissolved' | 'in_liquidation' | 'unknown';

  /** Registered address, or `null` if unavailable. */
  registered_address: Address | null;

  /** Registries that contributed data for this company. */
  source_registries: SourceRegistry[];

  /** B2Trust confidence score for this record. */
  confidence: ConfidenceScore;
}

/** Postal address of a company. */
export interface Address {
  /** Street name and number. */
  street?: string;

  /** City or locality. */
  city?: string;

  /** Postal / ZIP code. */
  postalCode?: string;

  /** ISO 3166-1 alpha-2 country code. */
  country: string;
}

/** A registry that contributed data to a company record. */
export interface SourceRegistry {
  /** Registry key (e.g. `'KRS'`, `'Companies House'`, `'SIRENE'`). */
  key: string;

  /** ISO 8601 timestamp of when data was last fetched from this registry. */
  fetchedAt: string;
}

/** B2Trust data confidence assessment. */
export interface ConfidenceScore {
  /** Numeric score from 0 (no confidence) to 100 (fully verified). */
  score: number;

  /** Human-readable confidence tier. */
  level: 'low' | 'medium' | 'high';

  /** Individual factors that contributed to the score. */
  factors: string[];
}

// ---------------------------------------------------------------------------
// Company profile
// ---------------------------------------------------------------------------

/** Response from the company profile endpoint. */
export interface CompanyResponse {
  status: 'ok';
  data: CompanyData;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

/** Aggregate platform statistics. */
export interface StatsResponse {
  /** Total number of companies in the B2Trust index. */
  total_companies: number;

  /** Number of countries covered. */
  countries_count: number;

  /** Number of government registries connected. */
  registries_count: number;
}

// ---------------------------------------------------------------------------
// Error response (raw API shape)
// ---------------------------------------------------------------------------

/** Raw error response body from the B2Trust API. */
export interface ApiErrorResponse {
  status: 'error';
  error: string;
  retry_after?: number;
}
