# @b2trust/sdk

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

Official TypeScript SDK for searching 10+ government business registries through one API.

> **Not yet on npm.** Install from GitHub for now (see below); the npm release is coming.

## Install

```bash
npm install github:B2Trust-Infrastructure/b2trust-sdk
```

## Quick Start

```typescript
import { B2TrustClient } from '@b2trust/sdk';

const b2trust = new B2TrustClient({ apiKey: 'your-api-key' });

const results = await b2trust.search('Microsoft', { country: ['PL', 'GB'] });
for (const company of results.data) {
  console.log(`${company.country_code} | ${company.company_name} (${company.national_id})`);
  console.log(`  confirmed by ${company.registry_count} sources`);
}
```

## What you get

B2Trust is a **verification / consensus** layer over government registries. The SDK reports
**how many independent sources confirm** a company (`registry_count`, and on the full profile a
`source_breakdown` by type) — never *which* registries. Natural-person data (directors, beneficial
owners, shareholders) is never returned.

## Features

- **Fully typed** — every parameter, response, and error has TypeScript definitions
- **Auto-ID detection** — pass a KRS number, NIP, SIREN, CRN, or ABN and the API routes to the correct registry
- **Structured errors** — catch `RateLimitError`, `AuthenticationError`, `NotFoundError` by type
- **Auto-retry on 429** — honors `Retry-After` (configurable via `maxRetries`)
- **Zero dependencies** — native `fetch` (Node.js 18+)
- **Dual format** — ESM (`import`) and CommonJS (`require`)

## API Reference

### `new B2TrustClient(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | *required* | Your B2Trust API key |
| `baseUrl` | `string` | `https://b2trust.com` | API base URL |
| `timeout` | `number` | `10000` | Request timeout in ms |
| `maxRetries` | `number` | `2` | Auto-retries on HTTP 429 (honors `Retry-After`) |

### `client.search(query, options?)`

```typescript
const results = await b2trust.search('Volkswagen', {
  country: ['DE', 'PL'],
  status: 'active',
  sort: 'relevance',
  limit: 25,
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `country` | `string \| string[]` | all | ISO alpha-2 codes (UK is `GB`) |
| `status` | `'active' \| 'dissolved' \| 'suspended' \| 'inactive' \| 'all'` | `'active'` | Status filter |
| `legalForm` | `string \| string[]` | — | Legal-form filter |
| `city` | `string` | — | Registered-address city |
| `dateFrom` / `dateTo` | `string` (`YYYY-MM-DD`) | — | Registration-date range |
| `sort` | `'relevance' \| 'newest' \| 'oldest' \| 'name_asc' \| 'name_desc' \| 'country' \| 'confidence'` | `'relevance'` | Sort order |
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `50` | Results per page (max 500) |
| `mode` | `'name' \| 'taxid'` | auto | Force search mode |
| `locale` | `string` | `en` | Response locale hint |

**Returns:** `SearchResponse` — `{ status, query, mode, data: CompanySearchResult[], meta: SearchMeta }`.

### `client.getCompany(id)`

```typescript
const company = await b2trust.getCompany('PL-7342867148');
console.log(company.company_name, '— confirmed by', company.confirmation_count, 'records');
```

- `id` — composite ID `{country}-{national_id}` (e.g. `PL-7342867148`, `GB-12345678`).

**Returns:** `CompanyProfile` (identity + trust metadata: `registry_count`, `source_breakdown`,
`confirmation_count`, VIES cross-check, `bank_accounts_count`, `first_seen`/`last_confirmed`).

### `client.verifyBank(id, account)`

Verify whether a bank account is registered against a Polish company on the VAT Whitelist (Biała
Lista). Poland only. Never returns account numbers.

```typescript
const result = await b2trust.verifyBank('PL-7342867148', 'PL61109010140000071219812874');
console.log(result.verified); // boolean
```

- `account` — a 26-digit NRB or a `PL`-prefixed IBAN (separators ignored).

**Returns:** `BankVerification` — `{ verified, company_name, account_count, checked_at }`.

### `client.getStats()`

```typescript
const stats = await b2trust.getStats();
// { firms: '30.1M+', countries: 33, continents: 4, price: '€0.00', searches_today: 6, cached_companies: 29471564 }
```

**Returns:** `Stats`.

## Error Handling

All errors extend `B2TrustError` with `message`, `statusCode`, and `response`.

```typescript
import { B2TrustClient, RateLimitError, AuthenticationError, NotFoundError } from '@b2trust/sdk';

try {
  const results = await b2trust.search('ford');
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (error instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (error instanceof NotFoundError) {
    console.log('Not found');
  }
}
```

| Error Class | HTTP Status | When |
|-------------|-------------|------|
| `AuthenticationError` | 401, 403 | Invalid or missing API key |
| `RateLimitError` | 429 | Rate limit exceeded (has `retryAfter`; auto-retried `maxRetries` times first) |
| `NotFoundError` | 404 | Company not found |
| `ValidationError` | 400 | Invalid parameters |
| `ServerError` | 500+ | Server error |
| `TimeoutError` | — | Request exceeded timeout |
| `NetworkError` | — | Connection failed |

## Rate Limits

Trial keys (`b2t_trial_*`):

- **20 requests per minute** per key
- **200 requests per day** per key
- **14-day** key validity

Need higher limits? [Contact us](https://b2trust.com/developers).

## Beta Notice

> This SDK is pre-1.0. The surface may change between minor versions until v1.0. Pin your version.

## Get an API Key

Sign up at [b2trust.com/developers](https://b2trust.com/developers).

## Links

- [B2Trust Platform](https://b2trust.com) · [API Documentation](https://b2trust.com/developers)

## License

MIT
