/**
 * Search for companies filtered to specific countries.
 *
 * Usage:
 *   B2TRUST_API_KEY=your-key npx tsx examples/filter-by-country.ts "Volkswagen" DE,PL
 */

import { B2TrustClient } from '../src/index.ts';

const apiKey = process.env.B2TRUST_API_KEY;
if (!apiKey) {
  console.error('Set B2TRUST_API_KEY environment variable. Get your free key at https://b2trust.com/developers');
  process.exit(1);
}

const query = process.argv[2];
const countriesArg = process.argv[3];

if (!query || !countriesArg) {
  console.error('Usage: npx tsx examples/filter-by-country.ts "Company Name" DE,PL');
  process.exit(1);
}

const countries = countriesArg.split(',').map((c) => c.trim());

const client = new B2TrustClient({ apiKey });
const results = await client.search(query, { country: countries });

console.log(`Search: "${results.meta.query}" in ${countries.join(', ')}`);
console.log(`Found: ${results.meta.total} results (${results.meta.query_time_ms}ms)\n`);

console.log('Results by country:');
for (const [code, count] of Object.entries(results.meta.country_counts)) {
  console.log(`  ${code}: ${count}`);
}

console.log();
console.table(
  results.data.slice(0, 15).map((c) => ({
    Country: c.country_code,
    Name: c.company_name,
    Status: c.status,
    Confidence: c.confidence.score,
  })),
);
