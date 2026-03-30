/**
 * B2Trust SDK Error Classes
 *
 * Structured error hierarchy so consumers can catch specific failure modes
 * with `instanceof` checks rather than parsing error strings.
 */

import type { ApiErrorResponse } from './types.ts';

/** Base error class for all B2Trust SDK errors. */
export class B2TrustError extends Error {
  /** HTTP status code, if the error originated from an API response. */
  readonly statusCode: number | undefined;

  /** Raw API error response body, if available. */
  readonly response: ApiErrorResponse | undefined;

  constructor(
    message: string,
    statusCode?: number,
    response?: ApiErrorResponse,
  ) {
    super(message);
    this.name = 'B2TrustError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

/** Thrown when the API key is missing, invalid, or revoked (HTTP 401 / 403). */
export class AuthenticationError extends B2TrustError {
  constructor(message: string, statusCode: number, response?: ApiErrorResponse) {
    super(message, statusCode, response);
    this.name = 'AuthenticationError';
  }
}

/** Thrown when the API rate limit is exceeded (HTTP 429). */
export class RateLimitError extends B2TrustError {
  /** Seconds to wait before retrying. */
  readonly retryAfter: number;

  constructor(message: string, retryAfter: number, response?: ApiErrorResponse) {
    super(message, 429, response);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/** Thrown when the requested resource does not exist (HTTP 404). */
export class NotFoundError extends B2TrustError {
  constructor(message: string, response?: ApiErrorResponse) {
    super(message, 404, response);
    this.name = 'NotFoundError';
  }
}

/** Thrown when request parameters are invalid (HTTP 400). */
export class ValidationError extends B2TrustError {
  constructor(message: string, response?: ApiErrorResponse) {
    super(message, 400, response);
    this.name = 'ValidationError';
  }
}

/** Thrown when the B2Trust server returns a 5xx error. */
export class ServerError extends B2TrustError {
  constructor(message: string, statusCode: number, response?: ApiErrorResponse) {
    super(message, statusCode, response);
    this.name = 'ServerError';
  }
}

/** Thrown when a request exceeds the configured timeout. */
export class TimeoutError extends B2TrustError {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/** Thrown when the network connection fails entirely. */
export class NetworkError extends B2TrustError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}
