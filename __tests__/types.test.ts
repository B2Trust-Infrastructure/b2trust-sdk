import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Type validation tests.
 *
 * These tests verify that the exported types accurately describe the shapes
 * returned by the B2Trust API. They use runtime value assertions — if a value
 * satisfies the interface, the type system is correct.
 */

import type {
  CompanyData,
  Address,
  SourceRegistry,
  ConfidenceScore,
  SearchResponse,
  SearchMeta,
  StatsResponse,
  SearchOptions,
  ClientOptions,
} from '../src/types.ts';

describe('Type shapes', () => {
  it('CompanyData satisfies expected shape', () => {
    const company: CompanyData = {
      country_code: 'PL',
      national_id: '0000578849',
      company_name: 'Test sp. z o.o.',
      legal_form: 'sp. z o.o.',
      status: 'active',
      registered_address: {
        city: 'Krakow',
        postalCode: '30-033',
        country: 'PL',
      },
      source_registries: [{ key: 'KRS', fetchedAt: '2026-03-22T10:15:00Z' }],
      confidence: { score: 72, level: 'medium', factors: [] },
    };

    assert.equal(company.country_code, 'PL');
    assert.equal(company.status, 'active');
    assert.ok(company.registered_address);
  });

  it('CompanyData allows null optional fields', () => {
    const company: CompanyData = {
      country_code: 'UK',
      national_id: '12345678',
      company_name: 'Test Ltd',
      legal_form: null,
      status: 'dissolved',
      registered_address: null,
      source_registries: [],
      confidence: { score: 30, level: 'low', factors: ['missing_address'] },
    };

    assert.equal(company.legal_form, null);
    assert.equal(company.registered_address, null);
  });

  it('Address allows partial fields', () => {
    const addr: Address = { country: 'FR' };
    assert.equal(addr.country, 'FR');
    assert.equal(addr.street, undefined);
    assert.equal(addr.city, undefined);
  });

  it('SearchResponse has expected structure', () => {
    const response: SearchResponse = {
      status: 'ok',
      data: [],
      meta: {
        total: 0,
        query: 'test',
        mode: 'name',
        query_time_ms: 50,
        country_counts: {},
        legal_forms: [],
      },
    };

    assert.equal(response.status, 'ok');
    assert.ok(Array.isArray(response.data));
    assert.equal(response.meta.mode, 'name');
  });

  it('StatsResponse has expected structure', () => {
    const stats: StatsResponse = {
      total_companies: 5000000,
      countries_count: 19,
      registries_count: 33,
    };

    assert.equal(typeof stats.total_companies, 'number');
    assert.equal(typeof stats.countries_count, 'number');
  });

  it('SearchOptions accepts all valid combinations', () => {
    const opts1: SearchOptions = {};
    const opts2: SearchOptions = { country: 'PL' };
    const opts3: SearchOptions = { country: ['PL', 'UK'] };
    const opts4: SearchOptions = {
      country: ['FR'],
      status: 'dissolved',
      legalForm: 'SAS',
      sort: 'date',
      page: 3,
      limit: 50,
      mode: 'taxid',
    };

    assert.ok(opts1);
    assert.ok(opts2);
    assert.ok(opts3);
    assert.ok(opts4);
  });

  it('ClientOptions requires apiKey', () => {
    const opts: ClientOptions = {
      apiKey: 'test-key',
    };
    assert.equal(opts.apiKey, 'test-key');
    assert.equal(opts.baseUrl, undefined);
    assert.equal(opts.timeout, undefined);
  });

  it('ConfidenceScore level is one of low/medium/high', () => {
    const scores: ConfidenceScore[] = [
      { score: 20, level: 'low', factors: ['no_address'] },
      { score: 55, level: 'medium', factors: [] },
      { score: 95, level: 'high', factors: ['multi_registry', 'vat_confirmed'] },
    ];

    const validLevels = new Set(['low', 'medium', 'high']);
    for (const s of scores) {
      assert.ok(validLevels.has(s.level));
      assert.ok(s.score >= 0 && s.score <= 100);
    }
  });
});
