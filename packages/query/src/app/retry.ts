import { MaxRetriesExceededError } from "./errors.js"
import type { QueryFn, RetryOptions } from "./types.js"

/**
 * Default exponential backoff function
 * Returns delay in ms: 1000, 2000, 4000, 8000, etc.
 */
export function exponentialBackoff(attempt: number, baseDelay = 1000): number {
  return 2 ** attempt * baseDelay
}

/**
 * Linear backoff function
 * Returns delay in ms: baseDelay, baseDelay*2, baseDelay*3, etc.
 */
export function linearBackoff(attempt: number, baseDelay = 1000): number {
  return (attempt + 1) * baseDelay
}

/**
 * Constant delay function
 */
export function constantDelay(delay: number): () => number {
  return () => delay
}

/**
 * Jittered exponential backoff (adds randomness to prevent thundering herd)
 */
export function jitteredBackoff(
  attempt: number,
  baseDelay = 1000,
  jitterFactor = 0.5,
): number {
  const delay = exponentialBackoff(attempt, baseDelay)
  const jitter = delay * jitterFactor * Math.random()
  return Math.floor(delay + jitter)
}

/**
 * Retry handler for query execution
 */
export class RetryHandler<Params extends unknown[], Result> {
  private _maxAttempts: number
  private _getDelay: (attempt: number) => number
  private _retryIf: (error: unknown) => boolean

  constructor(
    private _request: QueryFn<Params, Result>,
    options: RetryOptions,
  ) {
    this._maxAttempts = options.attempts
    this._getDelay = this._normalizeDelay(options.delay)
    this._retryIf = options.retryIf ?? (() => true)
  }

  /**
   * Execute with retry logic
   */
  async execute(...params: Params): Promise<Result> {
    let lastError: unknown

    for (let attempt = 0; attempt < this._maxAttempts; attempt++) {
      try {
        return await this._request(...params)
      } catch (error) {
        lastError = error

        // Check if we should retry
        if (!this._retryIf(error)) {
          throw error
        }

        // Don't wait after last attempt
        if (attempt < this._maxAttempts - 1) {
          const delay = this._getDelay(attempt)
          await this._sleep(delay)
        }
      }
    }

    throw new MaxRetriesExceededError(this._maxAttempts, lastError)
  }

  /**
   * Execute with retry logic and callback for each attempt
   */
  async executeWithCallback(
    params: Params,
    onRetry?: (attempt: number, error: unknown, delay: number) => void,
  ): Promise<Result> {
    let lastError: unknown

    for (let attempt = 0; attempt < this._maxAttempts; attempt++) {
      try {
        return await this._request(...params)
      } catch (error) {
        lastError = error

        if (!this._retryIf(error)) {
          throw error
        }

        if (attempt < this._maxAttempts - 1) {
          const delay = this._getDelay(attempt)
          onRetry?.(attempt, error, delay)
          await this._sleep(delay)
        }
      }
    }

    throw new MaxRetriesExceededError(this._maxAttempts, lastError)
  }

  private _normalizeDelay(
    delay: number | ((attempt: number) => number) | undefined,
  ): (attempt: number) => number {
    if (delay === undefined) {
      return (attempt) => exponentialBackoff(attempt)
    }
    if (typeof delay === "number") {
      return () => delay
    }
    return delay
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Helper to determine if an error is retryable based on common patterns
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Network errors
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnreset") ||
      message.includes("econnrefused") ||
      message.includes("socket hang up")
    ) {
      return true
    }

    // Rate limiting (usually retryable after delay)
    if (
      message.includes("rate limit") ||
      message.includes("too many requests")
    ) {
      return true
    }
  }

  // HTTP status codes in error
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: number }).status
    // Retry on 429 (rate limit), 502, 503, 504 (server errors)
    return status === 429 || status === 502 || status === 503 || status === 504
  }

  return true // Default to retryable
}
