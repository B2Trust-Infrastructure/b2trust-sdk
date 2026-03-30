/**
 * Get a single company profile by its composite ID.
 *
 * Usage:
 *   B2TRUST_API_KEY=your-key npx tsx examples/get-company.ts "PL-0000578849"
 */

import { B2TrustClient, NotFoundError } from '../src/index.ts';

const apiKey = process.env.B2TRUST_API_KEY;
if (!apiKey) {
  console.error('Set B2TRUST_API_KEY environment variable. Get your free key at https://b2trust.com/developers');
  process.exit(1);
}

const companyId = process.argv[2];
if (!companyId) {
  console.error('Usage: npx tsx examples/get-company.ts "PL-0000578849"');
  process.exit(1);
}

const client = new B2TrustClient({ apiKey });

try {
  const company = await client.getCompany(companyId);

  console.log(`${company.company_name}`);
  console.log(`${'─'.repeat(50)}`);
  console.log(`Country:     ${company.country_code}`);
  console.log(`National ID: ${company.national_id}`);
  console.log(`Legal form:  ${company.legal_form ?? 'N/A'}`);
  console.log(`Status:      ${company.status}`);
  console.log(`Confidence:  ${company.confidence.score}/100 (${company.confidence.level})`);

  if (company.registered_address) {
    const addr = company.registered_address;
    console.log(`Address:     ${[addr.street, addr.postalCode, addr.city, addr.country].filter(Boolean).join(', ')}`);
  }

  console.log(`\nSources:`);
  for (const src of company.source_registries) {
    console.log(`  - ${src.key} (fetched ${src.fetchedAt})`);
  }
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error(`Company "${companyId}" not found.`);
  } else {
    throw error;
  }
}
