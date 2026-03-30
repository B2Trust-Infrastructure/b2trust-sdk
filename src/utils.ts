/**
 * B2Trust SDK Utilities
 *
 * Internal helpers for URL construction and parameter validation.
 */

import type { SearchOptions } from './types.ts';

/**
 * Build a full URL from a base, path, and optional query parameters.
 * Trims trailing slashes from the base to avoid double-slash issues.
 */
export function buildUrl(
  base: string,
  path: string,
  params?: Record<string, string | number | undefined>,
): string {
  const trimmedBase = base.replace(/\/+$/, '');
  const url = new URL(`${trimmedBase}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

/**
 * Convert {@link SearchOptions} into flat query-string parameters
 * that match the B2Trust API contract.
 */
export function searchOptionsToParams(
  query: string,
  options?: SearchOptions,
): Record<string, string | number | undefined> {
  const params: Record<string, string | number | undefined> = { q: query };

  if (!options) return params;

  if (options.mode) params.mode = options.mode;

  if (options.country) {
    params.country = Array.isArray(options.country)
      ? options.country.join(',')
      : options.country;
  }

  if (options.status) params.status = options.status;
  if (options.legalForm) params.legal_form = options.legalForm;
  if (options.sort) params.sort = options.sort;
  if (options.page !== undefined) params.page = options.page;
  if (options.limit !== undefined) params.limit = options.limit;

  return params;
}
