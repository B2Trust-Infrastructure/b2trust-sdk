/**
 * Search with a country filter and show the per-country breakdown.
 *
 * Usage:
 *   B2TRUST_API_KEY=your-key npx tsx examples/filter-by-country.ts "auto" PL,DE
 */
import { B2TrustClient } from '../src/index.ts';

const apiKey = process.env.B2TRUST_API_KEY;
if (!apiKey) {
  console.error('Set B2TRUST_API_KEY. Get a free key at https://b2trust.com/developers');
  process.exit(1);
}
const query = process.argv[2];
const countries = (process.argv[3] ?? '').split(',').filter(Boolean);
if (!query || countries.length === 0) {
  console.error('Usage: npx tsx examples/filter-by-country.ts "auto" PL,DE');
  process.exit(1);
}

const client = new B2TrustClient({ apiKey });
const results = await client.search(query, { country: countries });
console.log(`"${query}" in ${countries.join(', ')} → ${results.meta.total} results`);
console.log('Per-country counts:', results.meta.country_counts);
