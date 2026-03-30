/**
 * Get aggregate B2Trust platform statistics.
 *
 * Usage:
 *   B2TRUST_API_KEY=your-key npx tsx examples/get-stats.ts
 */

import { B2TrustClient } from '../src/index.ts';

const apiKey = process.env.B2TRUST_API_KEY;
if (!apiKey) {
  console.error('Set B2TRUST_API_KEY environment variable. Get your free key at https://b2trust.com/developers');
  process.exit(1);
}

const client = new B2TrustClient({ apiKey });
const stats = await client.getStats();

console.log('B2Trust Platform Statistics');
console.log('═'.repeat(35));
console.log(`Companies indexed:  ${stats.total_companies.toLocaleString()}`);
console.log(`Countries covered:  ${stats.countries_count}`);
console.log(`Registries online:  ${stats.registries_count}`);
