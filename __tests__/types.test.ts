import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Type validation tests. Runtime value assertions: if the literal satisfies the
 * interface, the type is correct. Shapes mirror live API responses (verified
 * against prod 2026-06-30).
 */
import type {
  Address,
  ConfidenceScore,
  CompanySearchResult,
  CompanyProfile,
  SearchResponse,
  CompanyResponse,
  BankVerificationResponse,
  StatsResponse,
  SearchOptions,
  ClientOptions,
} from '../src/types.ts';

describe('Type shapes', () => {
  it('CompanySearchResult satisfies the /search data[] shape', () => {
    const row: CompanySearchResult = {
      country_code: 'PL',
      national_id: '7342867148',
      registry_number: '0000317499',
      company_name: 'CD PROJEKT S.A.',
      legal_form: 'Spółka Akcyjna',
      status: 'active',
      registered_address: { street: 'ul. Jagiellońska 74', city: 'Warszawa', postal_code: '03-301', country: 'PL' },
      registration_date: '2002-02-01',
      registry_count: 3,
      vat_number: 'PL7342867148',
      fetched_at: '2026-04-30T00:23:02.602Z',
      confidence: { score: 92, label: 'High', color: 'green', factors: ['Exact name match'] },
      first_indexed_at: '2025-11-10T08:14:00.000Z',
      vies_status: 'valid',
      vies_note: null,
    };
    assert.equal(row.country_code, 'PL');
    assert.equal(row.registry_count, 3);
  });

  it('CompanySearchResult allows null optionals + unknown status string', () => {
    const row: CompanySearchResult = {
      country_code: 'GB',
      national_id: '12345678',
      registry_number: null,
      company_name: 'Test Ltd',
      legal_form: null,
      status: 'struck-off',
      registered_address: null,
      registration_date: null,
      registry_count: 1,
      vat_number: null,
      fetched_at: null,
      confidence: { score: 30, label: 'Low', color: 'red', factors: [] },
      first_indexed_at: null,
      vies_status: null,
      vies_note: null,
    };
    assert.equal(row.legal_form, null);
    assert.equal(row.status, 'struck-off');
  });

  it('CompanyProfile satisfies the /company data shape', () => {
    const profile: CompanyProfile = {
      country_code: 'PL',
      national_id: '7342867148',
      vat_number: 'PL7342867148',
      secondary_id: '0000317499',
      registry_number: '0000317499',
      company_name: 'CD PROJEKT S.A.',
      legal_form: 'Spółka Akcyjna',
      registered_address: { city: 'Warszawa', postal_code: '03-301', country: 'PL' },
      registration_date: '2002-02-01',
      status: 'active',
      activity_codes: [{ code: '62.01.Z', system: 'PKD', description: 'Software development' }],
      registry_count: 3,
      bank_accounts_count: 2,
      verified_at: '2026-04-30T00:23:02.602Z',
      first_indexed_at: '2025-11-10T08:14:00.000Z',
      vies_cross_check_status: 'valid_match',
      vies_name: 'CD PROJEKT SPÓŁKA AKCYJNA',
      vies_match_score: 0.94,
      vies_checked_at: '2026-04-30T00:23:01.000Z',
      vies_vat_id: 'PL7342867148',
      confirmation_count: 5,
      source_breakdown: { registry: 3, search: 1, node_scan: 0, opc: 0, bulk_import: 1 },
      first_seen: '2025-11-10T08:14:00.000Z',
      last_confirmed: '2026-04-30T00:23:02.602Z',
    };
    assert.equal(profile.confirmation_count, 5);
    assert.equal(profile.source_breakdown.registry, 3);
  });

  it('Address allows partial fields', () => {
    const addr: Address = { country: 'FR' };
    assert.equal(addr.country, 'FR');
    assert.equal(addr.postal_code, undefined);
  });

  it('ConfidenceScore has score/label/color/factors', () => {
    const c: ConfidenceScore = { score: 80, label: 'High', color: 'green', factors: ['Verified by 3 registries'] };
    assert.equal(c.label, 'High');
    assert.ok(c.score >= 0 && c.score <= 100);
  });

  it('SearchResponse envelope', () => {
    const r: SearchResponse = {
      status: 'ok',
      query: 'test',
      mode: 'name',
      data: [],
      meta: { total: 0, page: 1, limit: 50, total_pages: 0, query_time_ms: 50, cache_hit: false, countries: [], country_counts: {}, legal_forms: [] },
    };
    assert.equal(r.mode, 'name');
    assert.equal(r.meta.limit, 50);
  });

  it('CompanyResponse + BankVerificationResponse + StatsResponse envelopes', () => {
    const company: CompanyResponse['status'] = 'ok';
    const bank: BankVerificationResponse = { status: 'ok', data: { verified: true, company_name: 'X', account_count: 2, checked_at: '2026-06-30T00:00:00Z' } };
    const stats: StatsResponse = { status: 'ok', data: { firms: '30.1M+', countries: 33, continents: 4, price: '€0.00', searches_today: 6, cached_companies: 29471564 } };
    assert.equal(company, 'ok');
    assert.equal(bank.data.verified, true);
    assert.equal(stats.data.countries, 33);
  });

  it('SearchOptions accepts the full option set', () => {
    const opts: SearchOptions = {
      country: ['PL', 'GB'], status: 'suspended', legalForm: ['SAS', 'Ltd'], city: 'Warszawa',
      dateFrom: '2000-01-01', dateTo: '2026-01-01', sort: 'newest', page: 2, limit: 25, mode: 'taxid', locale: 'pl',
    };
    assert.ok(opts);
  });

  it('ClientOptions requires apiKey, allows maxRetries', () => {
    const opts: ClientOptions = { apiKey: 'k', maxRetries: 3 };
    assert.equal(opts.apiKey, 'k');
    assert.equal(opts.maxRetries, 3);
  });
});
