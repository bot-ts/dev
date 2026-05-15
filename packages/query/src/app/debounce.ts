import type { DebounceOptions, QueryFn } from "./types.js"

interface DebounceState<Result> {
  timer: ReturnType<typeof setTimeout> | null
  maxWaitTimer: ReturnType<typeof setTimeout> | null
  pendingResolvers: Array<{
    resolve: (value: Result) => void
    reject: (error: unknown) => void
  }>
  pendingParams?: unknown[]
  startTime: number
}

/**
 * Debounced query wrapper that waits for calls to settle
 */
export class DebounceHandler<Params extends unknown[], Result> {
  private _state = new Map<string, DebounceState<Result>>()
  private _wait: number
  private _maxWait?: number

  constructor(
    private _request: QueryFn<Params, Result>,
    options: DebounceOptions,
  ) {
    this._wait = options.wait
    this._maxWait = options.maxWait
  }

  /**
   * Execute the debounced query
   */
  execute(key: string, ...params: Params): Promise<Result> {
    return new Promise((resolve, reject) => {
      const now = Date.now()
      let state = this._state.get(key)

      if (!state) {
        state = {
          timer: null,
          maxWaitTimer: null,
          pendingResolvers: [],
          startTime: now,
        }
        this._state.set(key, state)
      }

      // Clear existing debounce timer
      if (state.timer) {
        clearTimeout(state.timer)
      }

      // Store resolver and params
      state.pendingResolvers.push({ resolve, reject })
      state.pendingParams = params

      // Set up maxWait timer if configured and not already set
      if (this._maxWait && !state.maxWaitTimer) {
        state.startTime = now
        state.maxWaitTimer = setTimeout(() => {
          this._flush(key)
        }, this._maxWait)
      }

      // Set up debounce timer
      state.timer = setTimeout(() => {
        this._flush(key)
      }, this._wait)
    })
  }

  /**
   * Cancel pending debounced calls
   */
  cancel(key?: string): void {
    if (key === undefined) {
      for (const [k] of this._state) {
        this._cancelKey(k)
      }
      return
    }
    this._cancelKey(key)
  }

  /**
   * Immediately execute any pending call
   */
  async flush(key: string): Promise<Result | undefined> {
    const state = this._state.get(key)
    if (!state || state.pendingResolvers.length === 0) {
      return undefined
    }

    return new Promise((resolve, reject) => {
      state.pendingResolvers.push({ resolve, reject })
      this._flush(key)
    })
  }

  /**
   * Check if there are pending calls for a key
   */
  hasPending(key: string): boolean {
    const state = this._state.get(key)
    return state ? state.pendingResolvers.length > 0 : false
  }

  /**
   * Get the number of pending calls for a key
   */
  pendingCount(key: string): number {
    const state = this._state.get(key)
    return state?.pendingResolvers.length ?? 0
  }

  /**
   * Reset all state
   */
  reset(): void {
    for (const [_key, state] of this._state) {
      if (state.timer) clearTimeout(state.timer)
      if (state.maxWaitTimer) clearTimeout(state.maxWaitTimer)
      for (const { reject } of state.pendingResolvers) {
        reject(new Error("DebounceHandler reset"))
      }
    }
    this._state.clear()
  }

  private _cancelKey(key: string): void {
    const state = this._state.get(key)
    if (!state) return

    if (state.timer) {
      clearTimeout(state.timer)
      state.timer = null
    }
    if (state.maxWaitTimer) {
      clearTimeout(state.maxWaitTimer)
      state.maxWaitTimer = null
    }

    for (const { reject } of state.pendingResolvers) {
      reject(new Error("DebounceHandler cancelled"))
    }
    state.pendingResolvers = []
    state.pendingParams = undefined
  }

  private async _flush(key: string): Promise<void> {
    const state = this._state.get(key)
    if (!state) return

    // Clear timers
    if (state.timer) {
      clearTimeout(state.timer)
      state.timer = null
    }
    if (state.maxWaitTimer) {
      clearTimeout(state.maxWaitTimer)
      state.maxWaitTimer = null
    }

    const resolvers = [...state.pendingResolvers]
    const params = state.pendingParams as Params

    state.pendingResolvers = []
    state.pendingParams = undefined

    if (resolvers.length === 0) return

    try {
      const result = await this._request(...params)
      for (const { resolve } of resolvers) {
        resolve(result)
      }
    } catch (error) {
      for (const { reject } of resolvers) {
        reject(error)
      }
    }
  }
}
