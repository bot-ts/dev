import type { QueryFn } from "./types.js"

/**
 * Deduplication handler that prevents concurrent duplicate calls
 * If a call is already in progress for a key, subsequent calls will
 * wait for and share the same result
 */
export class DedupHandler<Params extends unknown[], Result> {
  private _pending = new Map<string, Promise<Result>>()

  constructor(private _request: QueryFn<Params, Result>) {}

  /**
   * Execute with deduplication
   * If a request with the same key is already in progress, returns the same promise
   */
  async execute(key: string, ...params: Params): Promise<Result> {
    // Check if there's already a pending request for this key
    const existing = this._pending.get(key)
    if (existing) {
      return existing
    }

    // Create new request and store it
    const promise = this._executeAndCleanup(key, ...params)
    this._pending.set(key, promise)

    return promise
  }

  /**
   * Check if there's a pending request for a key
   */
  isPending(key: string): boolean {
    return this._pending.has(key)
  }

  /**
   * Get the number of pending requests
   */
  get pendingCount(): number {
    return this._pending.size
  }

  /**
   * Get all pending keys
   */
  get pendingKeys(): string[] {
    return Array.from(this._pending.keys())
  }

  /**
   * Cancel all pending requests by clearing the map
   * Note: This doesn't actually cancel the underlying requests,
   * but new calls won't wait for the old ones
   */
  reset(): void {
    this._pending.clear()
  }

  private async _executeAndCleanup(
    key: string,
    ...params: Params
  ): Promise<Result> {
    try {
      const result = await this._request(...params)
      return result
    } finally {
      // Always clean up the pending map
      this._pending.delete(key)
    }
  }
}
