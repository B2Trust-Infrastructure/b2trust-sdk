/**
 * @b2trust/sdk — Official TypeScript SDK for the B2Trust API
 *
 * @example
 * ```ts
 * import { B2TrustClient } from '@b2trust/sdk';
 *
 * const client = new B2TrustClient({ apiKey: 'your-key' });
 * const results = await client.search('Microsoft');
 * ```
 *
 * @see https://b2trust.com/developers
 */

export { B2TrustClient } from './client.ts';

export {
  B2TrustError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
  ServerError,
  TimeoutError,
  NetworkError,
} from './errors.ts';

export type {
  ClientOptions,
  SearchOptions,
  SearchResponse,
  SearchMeta,
  CompanyData,
  CompanyResponse,
  Address,
  SourceRegistry,
  ConfidenceScore,
  StatsResponse,
  ApiErrorResponse,
} from './types.ts';
