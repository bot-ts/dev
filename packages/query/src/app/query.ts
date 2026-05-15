import { BatchHandler } from "./batching.js"
import { CachedQuery } from "./caching.js"
import { CircuitBreaker } from "./circuit-breaker.js"
import { DebounceHandler } from "./debounce.js"
import { DedupHandler } from "./dedup.js"
import { CircuitOpenError } from "./errors.js"
import { RetryHandler } from "./retry.js"
import { ThrottledQuery } from "./throttle.js"
import { withTimeout } from "./timeout.js"
import {
  defaultKeyFn,
  type QueryFn,
  type QueryOptions,
  type QueryStats,
} from "./types.js"

/**
 * Main Query class that orchestrates all features
 *
 * Pipeline order:
 * 1. Deduplication (avoid duplicate concurrent calls)
 * 2. Cache check (return cached if available)
 * 3. Circuit breaker (fail fast if circuit is open)
 * 4. Debounce/Throttle (rate limiting)
 * 5. Timeout (limit execution time)
 * 6. Retry (handle failures)
 * 7. Execute function
 * 8. Update cache and circuit breaker
 */
export class Query<Params extends unknown[], Result> {
  private _cache?: CachedQuery<Params, Result>
  private _throttle?: ThrottledQuery<Params, Result>
  private _debounce?: DebounceHandler<Params, Result>
  private _dedup?: DedupHandler<Params, Result>
  private _circuitBreaker?: CircuitBreaker
  private _retry?: RetryHandler<Params, Result>
  private _batch?: BatchHandler<Params, Result>
  private _timeout?: number
  private _keyFn: (...params: Params) => string

  private _stats: QueryStats = {
    totalCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    successes: 0,
    failures: 0,
    retries: 0,
    deduped: 0,
    throttled: 0,
    debounced: 0,
    timeouts: 0,
    circuitBreaks: 0,
  }

  constructor(
    private _fn: QueryFn<Params, Result>,
    private _options: QueryOptions<Params, Result> = {},
  ) {
    this._keyFn = _options.keyFn ?? defaultKeyFn

    // Initialize handlers based on options
    if (_options.cache) {
      this._cache = new CachedQuery(_fn, _options.cache.ttl, {
        staleWhileRevalidate: _options.cache.staleWhileRevalidate,
      })
    }

    if (_options.throttle) {
      this._throttle = new ThrottledQuery(
        ((...params: Params) => this._executeCore(...params)) as QueryFn<
          Params,
          Result
        >,
        _options.throttle.interval,
        {
          leading: _options.throttle.leading,
          trailing: _options.throttle.trailing,
        },
      )
    }

    if (_options.debounce) {
      this._debounce = new DebounceHandler(
        ((...params: Params) => this._executeCore(...params)) as QueryFn<
          Params,
          Result
        >,
        _options.debounce,
      )
    }

    if (_options.dedup) {
      this._dedup = new DedupHandler(((...params: Params) =>
        this._executePipeline(...params)) as QueryFn<Params, Result>)
    }

    if (_options.circuitBreaker) {
      this._circuitBreaker = new CircuitBreaker(_options.circuitBreaker)
    }

    if (_options.retry) {
      this._retry = new RetryHandler(_fn, _options.retry)
    }

    if (_options.batch) {
      this._batch = new BatchHandler(_options.batch)
    }

    if (_options.timeout) {
      this._timeout = _options.timeout
    }
  }

  /**
   * Execute the query with all configured features
   */
  async execute(...params: Params): Promise<Result> {
    this._stats.totalCalls++
    const key = this._keyFn(...params)

    try {
      let result: Result

      // Use batching if configured (bypasses other features)
      if (this._batch) {
        result = await this._batch.execute(...params)
      }
      // Use deduplication wrapper if configured
      else if (this._dedup) {
        const wasPending = this._dedup.isPending(key)
        result = await this._dedup.execute(key, ...params)
        if (wasPending) {
          this._stats.deduped++
        }
      } else {
        result = await this._executePipeline(...params)
      }

      this._stats.successes++
      this._options.onSuccess?.(result, params)
      return result
    } catch (error) {
      this._stats.failures++
      this._options.onError?.(error, params)
      throw error
    }
  }

  /**
   * Force execute bypassing cache
   */
  async fetch(...params: Params): Promise<Result> {
    const key = this._keyFn(...params)

    if (this._cache) {
      return this._cache.fetch(key, ...params)
    }

    return this.execute(...params)
  }

  /**
   * Invalidate cache entries
   */
  invalidateCache(key?: string): void {
    this._cache?.invalidate(key as string)
  }

  /**
   * Get query statistics
   */
  getStats(): QueryStats {
    return {
      ...this._stats,
      circuitState: this._circuitBreaker?.state,
    }
  }

  /**
   * Reset all handlers and statistics
   */
  reset(): void {
    this._cache?.invalidate()
    this._throttle?.reset()
    this._debounce?.reset()
    this._dedup?.reset()
    this._circuitBreaker?.reset()
    this._batch?.reset()

    this._stats = {
      totalCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      successes: 0,
      failures: 0,
      retries: 0,
      deduped: 0,
      throttled: 0,
      debounced: 0,
      timeouts: 0,
      circuitBreaks: 0,
    }
  }

  /**
   * Cancel pending throttled/debounced calls
   */
  cancel(key?: string): void {
    this._throttle?.cancel(key)
    this._debounce?.cancel(key)
  }

  /**
   * Flush pending throttled/debounced calls
   */
  async flush(key?: string): Promise<void> {
    if (key) {
      await this._throttle?.flush(key)
      await this._debounce?.flush(key)
    }
    await this._batch?.flush()
  }

  /**
   * Get the circuit breaker instance for manual control
   */
  get circuitBreaker(): CircuitBreaker | undefined {
    return this._circuitBreaker
  }

  /**
   * Check if the circuit is currently open
   */
  get isCircuitOpen(): boolean {
    return this._circuitBreaker?.isOpen() ?? false
  }

  /**
   * Get the cache instance for manual control
   */
  get cache(): CachedQuery<Params, Result> | undefined {
    return this._cache
  }

  /**
   * Main execution pipeline (without dedup wrapper)
   */
  private async _executePipeline(...params: Params): Promise<Result> {
    const key = this._keyFn(...params)

    // 1. Check cache first
    if (this._cache) {
      const cached = this._cache.peek(key)
      if (cached !== undefined) {
        this._stats.cacheHits++
        return cached
      }
      this._stats.cacheMisses++
    }

    // 2. Check circuit breaker
    if (this._circuitBreaker) {
      try {
        this._circuitBreaker.allowRequest()
      } catch (error) {
        if (error instanceof CircuitOpenError) {
          this._stats.circuitBreaks++
        }
        throw error
      }
    }

    // 3. Use debounce or throttle
    if (this._debounce) {
      this._stats.debounced++
      return this._debounce.execute(key, ...params)
    }

    if (this._throttle) {
      this._stats.throttled++
      return this._throttle.execute(key, ...params)
    }

    // 4. Direct execution
    return this._executeCore(...params)
  }

  /**
   * Core execution with timeout and retry
   */
  private async _executeCore(...params: Params): Promise<Result> {
    const key = this._keyFn(...params)

    const executeWithRetry = async (): Promise<Result> => {
      if (this._retry) {
        return this._retry.execute(...params)
      }
      return this._fn(...params)
    }

    try {
      let result: Result

      // Apply timeout if configured
      if (this._timeout) {
        result = await withTimeout(executeWithRetry(), this._timeout)
      } else {
        result = await executeWithRetry()
      }

      // Update circuit breaker on success
      this._circuitBreaker?.recordSuccess()

      // Update cache
      if (this._cache) {
        this._cache.set(key, result)
      }

      return result
    } catch (error) {
      // Update circuit breaker on failure
      this._circuitBreaker?.recordFailure()

      // Track timeout
      if (error instanceof Error && error.name === "QueryTimeoutError") {
        this._stats.timeouts++
      }

      throw error
    }
  }
}

/**
 * Create a simple query with minimal configuration
 */
export function createQuery<Params extends unknown[], Result>(
  fn: QueryFn<Params, Result>,
  options?: QueryOptions<Params, Result>,
): Query<Params, Result> {
  return new Query(fn, options)
}
