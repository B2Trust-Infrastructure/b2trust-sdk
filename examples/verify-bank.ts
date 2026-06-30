/**
 * Verify a bank account against a Polish company (Biała Lista).
 *
 * Usage:
 *   B2TRUST_API_KEY=your-key npx tsx examples/verify-bank.ts "PL-7342867148" "PL61109010140000071219812874"
 */
import { B2TrustClient, ValidationError } from '../src/index.ts';

const apiKey = process.env.B2TRUST_API_KEY;
if (!apiKey) {
  console.error('Set B2TRUST_API_KEY. Get a free key at https://b2trust.com/developers');
  process.exit(1);
}
const [, , id, account] = process.argv;
if (!id || !account) {
  console.error('Usage: npx tsx examples/verify-bank.ts "PL-7342867148" "PL611090..."');
  process.exit(1);
}

const client = new B2TrustClient({ apiKey });
try {
  const result = await client.verifyBank(id, account);
  console.log(`Company:    ${result.company_name}`);
  console.log(`Verified:   ${result.verified ? 'YES — account is registered' : 'NO — not on the whitelist'}`);
  console.log(`Accounts:   ${result.account_count} registered`);
  console.log(`Checked at: ${result.checked_at}`);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Invalid input: ${error.message}`);
  } else {
    throw error;
  }
}
