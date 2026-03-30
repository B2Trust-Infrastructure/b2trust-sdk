/**
 * Search for companies by name across all supported registries.
 *
 * Usage:
 *   B2TRUST_API_KEY=your-key npx tsx examples/search-by-name.ts "Microsoft"
 */

import { B2TrustClient, RateLimitError } from '../src/index.ts';

const apiKey = process.env.B2TRUST_API_KEY;
if (!apiKey) {
  console.error('Set B2TRUST_API_KEY environment variable. Get your free key at https://b2trust.com/developers');
  process.exit(1);
}

const query = process.argv[2];
if (!query) {
  console.error('Usage: npx tsx examples/search-by-name.ts "Company Name"');
  process.exit(1);
}

const client = new B2TrustClient({ apiKey });

try {
  const results = await client.search(query);

  console.log(`Found ${results.meta.total} results for "${results.meta.query}" (${results.meta.query_time_ms}ms)\n`);

  if (results.data.length === 0) {
    console.log('No companies found.');
  } else {
    console.table(
      results.data.slice(0, 20).map((c) => ({
        Country: c.country_code,
        Name: c.company_name,
        ID: c.national_id,
        Status: c.status,
        Confidence: c.confidence.score,
      })),
    );
  }
} catch (error) {
  if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter} seconds.`);
  } else {
    throw error;
  }
}
