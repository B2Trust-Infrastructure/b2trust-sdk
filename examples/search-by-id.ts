/**
 * Search by a national/tax/registry ID (auto-detected).
 *
 * Usage:
 *   B2TRUST_API_KEY=your-key npx tsx examples/search-by-id.ts "7342867148"
 */
import { B2TrustClient } from '../src/index.ts';

const apiKey = process.env.B2TRUST_API_KEY;
if (!apiKey) {
  console.error('Set B2TRUST_API_KEY. Get a free key at https://b2trust.com/developers');
  process.exit(1);
}
const id = process.argv[2];
if (!id) {
  console.error('Usage: npx tsx examples/search-by-id.ts "7342867148"');
  process.exit(1);
}

const client = new B2TrustClient({ apiKey });
const results = await client.search(id, { mode: 'taxid' });
if (results.data.length === 0) {
  console.log(`No company found for ID "${id}".`);
} else {
  for (const c of results.data) {
    console.log(`${c.country_code} | ${c.company_name} (${c.national_id}) — ${c.status}, ${c.registry_count} sources`);
  }
}
