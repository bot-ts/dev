import type { QueryFn } from "./types.js"

/**
 * Cache entry data structure
 */
export interface CacheEntry<Value> {
  value: Value
  expires: number
  stale?: boolean
}

/**
 * Options for CachedQuery
 */
export interface CachedQueryOptions {
  /** Return stale data while revalidating in background */
  staleWhileRevalidate?: boolean
}

/**
 * Advanced cache wrapper for async queries
 */
export class CachedQuery<Params extends unknown[], Value> {
  private _cache = new Map<string, CacheEntry<Value>>()
  private _pendingRevalidations = new Set<string>()

  constructor(
    private _request: QueryFn<Params, Value>,
    private _ttl: number,
    private _options: CachedQueryOptions = {},
  ) {}

  /**
   * Get a value from cache or fetch it
   */
  async get(key: string, ...params: Params): Promise<Value> {
    const cached = this._cache.get(key)
    const now = Date.now()

    if (cached) {
      // Cache hit and still valid
      if (cached.expires > now) {
        return cached.value
      }

      // Cache expired but stale-while-revalidate enabled
      if (this._options.staleWhileRevalidate) {
        // Trigger background revalidation if not already pending
        if (!this._pendingRevalidations.has(key)) {
          this._revalidateInBackground(key, ...params)
        }
        return cached.value
      }
    }

    // Cache miss or expired without stale-while-revalidate
    return this._fetchAndCache(key, ...params)
  }

  /**
   * Force fetch and update cache
   */
  async fetch(key: string, ...params: Params): Promise<Value> {
    return this._fetchAndCache(key, ...params)
  }

  /**
   * Check if a key exists and is valid in cache
   */
  has(key: string): boolean {
    const cached = this._cache.get(key)
    if (!cached) return false
    return cached.expires > Date.now()
  }

  /**
   * Get cached value without fetching (returns undefined if not cached or expired)
   */
  peek(key: string): Value | undefined {
    const cached = this._cache.get(key)
    if (!cached) return undefined
    if (cached.expires < Date.now() && !this._options.staleWhileRevalidate) {
      return undefined
    }
    return cached.value
  }

  /**
   * Manually set a cache entry
   */
  set(key: string, value: Value, ttl?: number): void {
    this._cache.set(key, {
      value,
      expires: Date.now() + (ttl ?? this._ttl),
    })
  }

  /**
   * Invalidate cache entries
   */
  invalidate(): void
  invalidate(key: string): void
  invalidate(key?: string): void {
    if (key === undefined) {
      this._cache.clear()
      this._pendingRevalidations.clear()
      return
    }
    this._cache.delete(key)
    this._pendingRevalidations.delete(key)
  }

  /**
   * Get the number of cached entries
   */
  get size(): number {
    return this._cache.size
  }

  /**
   * Get all cached keys
   */
  keys(): string[] {
    return Array.from(this._cache.keys())
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now()
    let removed = 0
    for (const [key, entry] of this._cache) {
      if (entry.expires < now) {
        this._cache.delete(key)
        removed++
      }
    }
    return removed
  }

  private async _fetchAndCache(key: string, ...params: Params): Promise<Value> {
    const value = await this._request(...params)
    this._cache.set(key, {
      value,
      expires: Date.now() + this._ttl,
    })
    return value
  }

  private _revalidateInBackground(key: string, ...params: Params): void {
    this._pendingRevalidations.add(key)

    // Mark current cache as stale
    const cached = this._cache.get(key)
    if (cached) {
      cached.stale = true
    }

    // Fetch in background
    Promise.resolve(this._request(...params))
      .then((value) => {
        this._cache.set(key, {
          value,
          expires: Date.now() + this._ttl,
        })
      })
      .catch(() => {
        // On error, keep the stale value
      })
      .finally(() => {
        this._pendingRevalidations.delete(key)
      })
  }
}
