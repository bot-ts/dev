/**
 * Generic query function type that can be sync or async
 */
export type QueryFn<Params extends unknown[], Result> = (
  ...params: Params
) => Promise<Result> | Result

/**
 * Caching options
 */
export interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttl: number
  /** Return stale cache while revalidating in background */
  staleWhileRevalidate?: boolean
}

/**
 * Throttling options
 */
export interface ThrottleOptions {
  /** Minimum interval between calls in milliseconds */
  interval: number
  /** Execute on the leading edge (default: true) */
  leading?: boolean
  /** Execute on the trailing edge (default: true) */
  trailing?: boolean
}

/**
 * Retry options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  attempts: number
  /** Delay in ms, or function for exponential backoff */
  delay?: number | ((attempt: number) => number)
  /** Condition to determine if retry should happen */
  retryIf?: (error: unknown) => boolean
}

/**
 * Debounce options
 */
export interface DebounceOptions {
  /** Wait time in milliseconds */
  wait: number
  /** Maximum wait time before forced execution */
  maxWait?: number
}

/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
  /** Number of failures before opening the circuit */
  threshold: number
  /** Time in ms before attempting to close the circuit */
  resetTimeout: number
}

/**
 * Batching options
 */
export interface BatchOptions<Params extends unknown[], Result> {
  /** Maximum batch size */
  maxSize: number
  /** Maximum wait time before flushing in ms */
  maxWait: number
  /** Function to process batched params */
  batchFn: (params: Params[]) => Promise<Result[]>
}

/**
 * Main Query options
 */
export interface QueryOptions<Params extends unknown[], Result> {
  /** Caching configuration */
  cache?: CacheOptions

  /** Throttling configuration */
  throttle?: ThrottleOptions

  /** Retry configuration */
  retry?: RetryOptions

  /** Debounce configuration */
  debounce?: DebounceOptions

  /** Enable request deduplication */
  dedup?: boolean

  /** Circuit breaker configuration */
  circuitBreaker?: CircuitBreakerOptions

  /** Request timeout in milliseconds */
  timeout?: number

  /** Batching configuration */
  batch?: BatchOptions<Params, Result>

  /** Callback on successful execution */
  onSuccess?: (result: Result, params: Params) => void

  /** Callback on error */
  onError?: (error: unknown, params: Params) => void

  /** Custom key generator for cache/dedup identification */
  keyFn?: (...params: Params) => string
}

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

/**
 * Query statistics
 */
export interface QueryStats {
  /** Total number of executions */
  totalCalls: number
  /** Number of cache hits */
  cacheHits: number
  /** Number of cache misses */
  cacheMisses: number
  /** Number of successful calls */
  successes: number
  /** Number of failed calls */
  failures: number
  /** Number of retries performed */
  retries: number
  /** Number of deduplicated calls */
  deduped: number
  /** Number of throttled calls */
  throttled: number
  /** Number of debounced calls */
  debounced: number
  /** Number of timeouts */
  timeouts: number
  /** Number of circuit breaker trips */
  circuitBreaks: number
  /** Current circuit breaker state */
  circuitState?: CircuitState
}

/**
 * Default key generator using JSON.stringify
 */
export function defaultKeyFn<Params extends unknown[]>(
  ...params: Params
): string {
  if (params.length === 0) return "__default__"
  if (params.length === 1) {
    const p = params[0]
    if (typeof p === "string" || typeof p === "number") return String(p)
  }
  return JSON.stringify(params)
}
