# @b2trust/sdk

[![npm version](https://img.shields.io/npm/v/@b2trust/sdk)](https://www.npmjs.com/package/@b2trust/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

Official TypeScript SDK for searching 10+ government business registries through one API.

## Install

```bash
npm install @b2trust/sdk
```

## Quick Start

```typescript
import { B2TrustClient } from '@b2trust/sdk';

const b2trust = new B2TrustClient({ apiKey: 'your-api-key' });

const results = await b2trust.search('Microsoft', { country: ['PL', 'UK'] });
for (const company of results.data) {
  console.log(`${company.country_code} | ${company.company_name} (${company.national_id})`);
}
```

## Features

- **Fully typed** — every parameter, response, and error has TypeScript definitions
- **Auto-ID detection** — pass a KRS number, NIP, SIREN, CRN, or ABN and the API routes to the correct registry
- **Structured errors** — catch `RateLimitError`, `AuthenticationError`, `NotFoundError` by type
- **Zero dependencies** — uses native `fetch` (Node.js 18+)
- **Dual format** — works with ESM (`import`) and CommonJS (`require`)

## API Reference

### `new B2TrustClient(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | *required* | Your B2Trust API key |
| `baseUrl` | `string` | `https://b2trust.com` | API base URL |
| `timeout` | `number` | `10000` | Request timeout in ms |

### `client.search(query, options?)`

Search for companies by name or national identifier.

```typescript
const results = await b2trust.search('Volkswagen', {
  country: ['DE', 'PL'],
  status: 'active',
  sort: 'relevance',
  limit: 25,
});
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `country` | `string \| string[]` | all | Filter by country codes |
| `status` | `'active' \| 'dissolved' \| 'all'` | `'active'` | Company status filter |
| `legalForm` | `string` | — | Legal form filter |
| `sort` | `'relevance' \| 'name' \| 'date'` | `'relevance'` | Sort order |
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `500` | Results per page |
| `mode` | `'name' \| 'taxid'` | auto | Force search mode |

**Returns:** `SearchResponse` with `data: CompanyData[]` and `meta: SearchMeta`

### `client.getCompany(id)`

Get a single company profile by composite ID.

```typescript
const company = await b2trust.getCompany('PL-0000578849');
console.log(company.company_name); // "Example sp. z o.o."
```

**Parameters:**
- `id` — Composite ID in `{country}-{national_id}` format (e.g. `PL-0000578849`, `UK-12345678`)

**Returns:** `CompanyData`

### `client.getStats()`

Get aggregate platform statistics.

```typescript
const stats = await b2trust.getStats();
// { total_companies: 5025576, countries_count: 19, registries_count: 33 }
```

**Returns:** `StatsResponse`

## Error Handling

All errors extend `B2TrustError` with `message`, `statusCode`, and `response` properties.

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
| `RateLimitError` | 429 | Rate limit exceeded (has `retryAfter` in seconds) |
| `NotFoundError` | 404 | Company ID not found |
| `ValidationError` | 400 | Invalid parameters |
| `ServerError` | 500+ | Server error |
| `TimeoutError` | — | Request exceeded timeout |
| `NetworkError` | — | Connection failed |

## Supported Countries

| Country | Registry | ID Format | Example |
|---------|----------|-----------|---------|
| Poland | KRS, CEIDG | KRS: 10 digits, NIP: 10 digits | `PL-0000578849` |
| United Kingdom | Companies House | CRN: 8 chars | `UK-12345678` |
| France | SIRENE | SIREN: 9 digits, SIRET: 14 digits | `FR-123456789` |
| Germany | Handelsregister | Court_Type_Number | `DE-Hamburg_HRB_150148` |
| Norway | Bronnysund | Org nr: 9 digits | `NO-123456789` |
| Czech Republic | ARES | ICO: 8 digits | `CZ-12345678` |
| United States | SEC EDGAR | CIK: up to 10 digits | `US-0001234567` |
| Australia | ABN Lookup | ABN: 11 digits | `AU-51824753556` |
| New Zealand | NZBN | NZBN: 13 digits | `NZ-1234567890123` |
| EU-wide | VIES | VAT number | VAT validation only |

## Rate Limits

- **20 requests per day** per API key
- **3 requests per minute** per API key

Need higher limits? [Contact us](https://b2trust.com/developers) for enterprise access.

## Beta Notice

> **This SDK is in beta.** The API surface may change between minor versions until v1.0. Pin your version in `package.json` to avoid surprises.

## Get an API Key

Sign up for a free API key at [b2trust.com/developers](https://b2trust.com/developers).

## Links

- [B2Trust Platform](https://b2trust.com)
- [API Documentation](https://b2trust.com/developers)
- [awesome-business-registries](https://github.com/B2Trust-Infrastructure/awesome-business-registries) — curated list of open business registries
- [registry-api-examples](https://github.com/B2Trust-Infrastructure/registry-api-examples) — raw API examples for each registry

## License

MIT
