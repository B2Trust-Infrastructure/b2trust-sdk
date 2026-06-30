/**
 * Get a single company profile by its composite ID.
 *
 * Usage:
 *   B2TRUST_API_KEY=your-key npx tsx examples/get-company.ts "PL-7342867148"
 */
import { B2TrustClient, NotFoundError } from '../src/index.ts';

const apiKey = process.env.B2TRUST_API_KEY;
if (!apiKey) {
  console.error('Set B2TRUST_API_KEY. Get a free key at https://b2trust.com/developers');
  process.exit(1);
}
const companyId = process.argv[2];
if (!companyId) {
  console.error('Usage: npx tsx examples/get-company.ts "PL-7342867148"');
  process.exit(1);
}

const client = new B2TrustClient({ apiKey });
try {
  const company = await client.getCompany(companyId);
  console.log(company.company_name);
  console.log('─'.repeat(50));
  console.log(`Country:      ${company.country_code}`);
  console.log(`National ID:  ${company.national_id}`);
  console.log(`VAT:          ${company.vat_number ?? 'N/A'}`);
  console.log(`Legal form:   ${company.legal_form ?? 'N/A'}`);
  console.log(`Status:       ${company.status}`);
  console.log(`Confirmed by: ${company.registry_count} sources (${company.confirmation_count} confirmations)`);
  console.log(`VIES:         ${company.vies_cross_check_status ?? 'N/A'}`);
  if (company.registered_address) {
    const a = company.registered_address;
    console.log(`Address:      ${[a.street, a.postal_code, a.city, a.country].filter(Boolean).join(', ')}`);
  }
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error(`Company "${companyId}" not found.`);
  } else {
    throw error;
  }
}
