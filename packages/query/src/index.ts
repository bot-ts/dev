// Main Query class
export { Query, createQuery } from "./app/query.js"

// Types
export type {
  QueryFn,
  QueryOptions,
  QueryStats,
  CacheOptions,
  ThrottleOptions,
  RetryOptions,
  DebounceOptions,
  CircuitBreakerOptions,
  BatchOptions,
} from "./app/types.js"
export { CircuitState, defaultKeyFn } from "./app/types.js"

// Individual handlers for advanced usage
export { CachedQuery, type CacheEntry, type CachedQueryOptions } from "./app/caching.js"
export { ThrottledQuery } from "./app/throttle.js"
export {
  RetryHandler,
  exponentialBackoff,
  linearBackoff,
  constantDelay,
  jitteredBackoff,
  isRetryableError,
} from "./app/retry.js"
export { DebounceHandler } from "./app/debounce.js"
export { DedupHandler } from "./app/dedup.js"
export { CircuitBreaker } from "./app/circuit-breaker.js"
export {
  TimeoutHandler,
  withTimeout,
  createTimeoutController,
  fetchWithTimeout,
} from "./app/timeout.js"
export { BatchHandler, createDataLoader } from "./app/batching.js"

// Errors
export {
  QueryError,
  QueryTimeoutError,
  CircuitOpenError,
  MaxRetriesExceededError,
  QueryAbortedError,
} from "./app/errors.js"
