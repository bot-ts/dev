import type { BatchOptions } from "./types.js"

interface BatchItem<Params, Result> {
  params: Params
  resolve: (value: Result) => void
  reject: (error: unknown) => void
}

/**
 * Batch handler for grouping multiple calls into a single execution
 */
export class BatchHandler<Params extends unknown[], Result> {
  private _queue: BatchItem<Params, Result>[] = []
  private _timer: ReturnType<typeof setTimeout> | null = null
  private _maxSize: number
  private _maxWait: number
  private _batchFn: (params: Params[]) => Promise<Result[]>

  constructor(options: BatchOptions<Params, Result>) {
    this._maxSize = options.maxSize
    this._maxWait = options.maxWait
    this._batchFn = options.batchFn
  }

  /**
   * Add an item to the batch queue
   */
  execute(...params: Params): Promise<Result> {
    return new Promise((resolve, reject) => {
      this._queue.push({ params, resolve, reject })

      // Flush if we've reached max size
      if (this._queue.length >= this._maxSize) {
        this._flush()
        return
      }

      // Start timer if this is the first item
      if (!this._timer) {
        this._timer = setTimeout(() => {
          this._flush()
        }, this._maxWait)
      }
    })
  }

  /**
   * Manually flush the current batch
   */
  async flush(): Promise<void> {
    if (this._queue.length > 0) {
      await this._flush()
    }
  }

  /**
   * Get the current queue size
   */
  get queueSize(): number {
    return this._queue.length
  }

  /**
   * Check if there are items queued
   */
  get hasPending(): boolean {
    return this._queue.length > 0
  }

  /**
   * Cancel all pending items
   */
  cancel(): void {
    if (this._timer) {
      clearTimeout(this._timer)
      this._timer = null
    }

    for (const item of this._queue) {
      item.reject(new Error("BatchHandler cancelled"))
    }
    this._queue = []
  }

  /**
   * Reset the handler
   */
  reset(): void {
    this.cancel()
  }

  private async _flush(): Promise<void> {
    // Clear timer
    if (this._timer) {
      clearTimeout(this._timer)
      this._timer = null
    }

    // Get current batch and clear queue
    const batch = [...this._queue]
    this._queue = []

    if (batch.length === 0) return

    try {
      // Execute batch function
      const params = batch.map((item) => item.params)
      const results = await this._batchFn(params)

      // Validate results length
      if (results.length !== batch.length) {
        const error = new Error(
          `Batch function returned ${results.length} results for ${batch.length} items`,
        )
        for (const item of batch) {
          item.reject(error)
        }
        return
      }

      // Resolve each item with its result
      for (let i = 0; i < batch.length; i++) {
        batch[i].resolve(results[i])
      }
    } catch (error) {
      // Reject all items on error
      for (const item of batch) {
        item.reject(error)
      }
    }
  }
}

/**
 * Create a simple data loader for batching key-based lookups
 */
export function createDataLoader<Key, Value>(
  batchLoad: (keys: Key[]) => Promise<Value[]>,
  options: { maxSize?: number; maxWait?: number } = {},
): (key: Key) => Promise<Value> {
  const handler = new BatchHandler<[Key], Value>({
    maxSize: options.maxSize ?? 100,
    maxWait: options.maxWait ?? 16, // ~1 frame at 60fps
    batchFn: async (params) => {
      const keys = params.map(([key]) => key)
      return batchLoad(keys)
    },
  })

  return (key: Key) => handler.execute(key)
}
