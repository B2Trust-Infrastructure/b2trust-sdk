/**
 * B2Trust SDK Type Definitions
 *
 * TypeScript interfaces for the B2Trust public API. Shapes mirror the live JSON
 * responses from https://b2trust.com/api/v1/ (Identity Consensus model: the API
 * reports how many sources confirm a company — registry_count — never which
 * registries, so source_registries is intentionally absent).
 */

// --- Client configuration --------------------------------------------------

export interface ClientOptions {
  /** Your B2Trust API key. Required. Get one at https://b2trust.com/developers */
  apiKey: string;
  /** Base URL of the B2Trust API. Defaults to `https://b2trust.com`. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to `10000` (10 s). */
  timeout?: number;
  /** Max automatic retries on HTTP 429 (honors Retry-After). Defaults to `2`. */
  maxRetries?: number;
}

// --- Shared value types ----------------------------------------------------

/** Company status. Known values plus any string the API may add. */
export type CompanyStatus = 'active' | 'dissolved' | 'suspended' | 'inactive' | (string & {});

/** Postal address of a company. */
export interface Address {
  street?: string;
  city?: string;
  postal_code?: string;
  /** ISO 3166-1 alpha-2 country code. */
  country: string;
}

/** B2Trust confidence assessment for a search result. */
export interface ConfidenceScore {
  /** 0 (no confidence) to 100 (fully verified). */
  score: number;
  /** Human-readable tier, e.g. `'High'`. */
  label: string;
  /** UI colour hint, e.g. `'green'`. */
  color: string;
  /** Individual factors that contributed to the score. */
  factors: string[];
}

/** A business-activity classification code (e.g. PKD/NACE). */
export interface ActivityCode {
  code: string;
  system: string;
  description: string;
}

/** Confirmation-source breakdown by TYPE (never registry names). */
export interface SourceBreakdown {
  registry: number;
  search: number;
  node_scan: number;
  opc: number;
  bulk_import: number;
}

// --- Search ----------------------------------------------------------------

export interface SearchOptions {
  /** Filter by one or more ISO alpha-2 codes (e.g. `'PL'` or `['PL','GB']`). UK is `GB`. */
  country?: string | string[];
  /** Status filter. Defaults to `'active'`. */
  status?: 'active' | 'dissolved' | 'suspended' | 'inactive' | 'all';
  /** Legal-form filter (one or more; case-insensitive partial match). */
  legalForm?: string | string[];
  /** Registered-address city filter. */
  city?: string;
  /** Earliest registration date, `YYYY-MM-DD`. */
  dateFrom?: string;
  /** Latest registration date, `YYYY-MM-DD`. */
  dateTo?: string;
  /** Sort order. Defaults to `'relevance'`. */
  sort?: 'relevance' | 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'country' | 'confidence';
  /** Page number (1-based). Defaults to `1`. */
  page?: number;
  /** Results per page. Defaults to `50`, max `500`. */
  limit?: number;
  /** Force search mode. Auto-detected when omitted. */
  mode?: 'name' | 'taxid';
  /** Response locale hint (e.g. `'en'`, `'pl'`). */
  locale?: string;
}

/** A single result item from `GET /api/v1/search`. */
export interface CompanySearchResult {
  country_code: string;
  national_id: string;
  registry_number: string | null;
  company_name: string;
  legal_form: string | null;
  status: CompanyStatus;
  registered_address: Address | null;
  registration_date: string | null;
  /** How many independent sources confirm this company. */
  registry_count: number;
  vat_number: string | null;
  fetched_at: string | null;
  confidence: ConfidenceScore;
  first_indexed_at: string | null;
  vies_status: 'valid' | 'invalid' | 'unavailable' | null;
  vies_note: string | null;
}

export interface SearchMeta {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  query_time_ms: number;
  cache_hit: boolean;
  countries: string[];
  country_counts: Record<string, number>;
  legal_forms: string[];
}

export interface SearchResponse {
  status: 'ok';
  query: string;
  mode: 'name' | 'taxid';
  data: CompanySearchResult[];
  meta: SearchMeta;
}

// --- Company profile -------------------------------------------------------

/** Full company profile from `GET /api/v1/company/{id}`. */
export interface CompanyProfile {
  country_code: string;
  national_id: string;
  vat_number: string | null;
  secondary_id: string | null;
  registry_number: string | null;
  company_name: string;
  legal_form: string | null;
  registered_address: Address | null;
  registration_date: string | null;
  status: CompanyStatus;
  activity_codes: ActivityCode[];
  registry_count: number;
  bank_accounts_count: number;
  verified_at: string | null;
  first_indexed_at: string | null;
  vies_cross_check_status: 'valid_match' | 'valid_mismatch' | 'invalid' | 'error' | null;
  vies_name: string | null;
  vies_match_score: number | null;
  vies_checked_at: string | null;
  vies_vat_id: string | null;
  confirmation_count: number;
  source_breakdown: SourceBreakdown;
  first_seen: string | null;
  last_confirmed: string | null;
}

export interface CompanyMeta {
  cached: boolean;
  enriched: boolean;
  source_count: number;
  fetched_at: string;
  expires_at: string;
}

export interface CompanyResponse {
  status: 'ok';
  data: CompanyProfile;
  meta: CompanyMeta;
}

// --- Bank verification -----------------------------------------------------

export interface BankVerification {
  verified: boolean;
  company_name: string;
  account_count: number;
  checked_at: string;
}

export interface BankVerificationResponse {
  status: 'ok';
  data: BankVerification;
}

// --- Stats -----------------------------------------------------------------

export interface Stats {
  firms: string;
  countries: number;
  continents: number;
  price: string;
  searches_today: number;
  cached_companies: number;
}

export interface StatsResponse {
  status: 'ok';
  data: Stats;
}

// --- Error response (raw API shape) ----------------------------------------

export interface ApiErrorResponse {
  status: 'error';
  error: string;
  retry_after?: number;
}
