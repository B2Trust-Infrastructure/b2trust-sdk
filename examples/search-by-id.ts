/**
 * Search by a national identifier (KRS, NIP, SIREN, CRN, ABN, etc.).
 * The API auto-detects the ID type and routes to the correct registry.
 *
 * Usage:
 *   B2TRUST_API_KEY=your-key npx tsx examples/search-by-id.ts "0000578849"
 */

import { B2TrustClient } from '../src/index.ts';

const apiKey = process.env.B2TRUST_API_KEY;
if (!apiKey) {
  console.error('Set B2TRUST_API_KEY environment variable. Get your free key at https://b2trust.com/developers');
  process.exit(1);
}

const id = process.argv[2];
if (!id) {
  console.error('Usage: npx tsx examples/search-by-id.ts "0000578849"');
  process.exit(1);
}

const client = new B2TrustClient({ apiKey });
const results = await client.search(id);

console.log(`Mode: ${results.meta.mode}`);
console.log(`Found ${results.meta.total} result(s)\n`);

for (const company of results.data) {
  console.log(`${company.country_code} | ${company.company_name} (${company.national_id})`);
  console.log(`  Status: ${company.status} | Confidence: ${company.confidence.score}/100`);
  if (company.registered_address) {
    const addr = company.registered_address;
    console.log(`  Address: ${[addr.street, addr.postalCode, addr.city].filter(Boolean).join(', ')}`);
  }
  console.log();
}
