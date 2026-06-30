/**
 * Print aggregate platform statistics.
 *
 * Usage:
 *   B2TRUST_API_KEY=your-key npx tsx examples/get-stats.ts
 */
import { B2TrustClient } from '../src/index.ts';

const apiKey = process.env.B2TRUST_API_KEY;
if (!apiKey) {
  console.error('Set B2TRUST_API_KEY. Get a free key at https://b2trust.com/developers');
  process.exit(1);
}

const client = new B2TrustClient({ apiKey });
const stats = await client.getStats();
console.log(`Firms indexed:    ${stats.firms}`);
console.log(`Countries:        ${stats.countries}`);
console.log(`Continents:       ${stats.continents}`);
console.log(`Searches today:   ${stats.searches_today}`);
console.log(`Cached companies: ${stats.cached_companies.toLocaleString()}`);
