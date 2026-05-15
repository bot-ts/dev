import type { QueryFn, ThrottleOptions } from "./types.js"

interface ThrottleState<Result> {
  timer: ReturnType<typeof setTimeout> | null
  lastCall: number
  lastResult?: Result
  pendingResolvers: Array<{
    resolve: (value: Result) => void
    reject: (error: unknown) => void
  }>
  pendingParams?: unknown[]
}

/**
 * Throttled query wrapper that limits execution frequency
 */
export class ThrottledQuery<Params extends unknown[], Result> {
  private _state = new Map<string, ThrottleState<Result>>()
  private _leading: boolean
  private _trailing: boolean

  constructor(
    private _request: QueryFn<Params, Result>,
    private _interval: number,
    options: Omit<ThrottleOptions, "interval"> = {},
  ) {
    this._leading = options.leading ?? true
    this._trailing = options.trailing ?? true
  }

  /**
   * Execute the throttled query
   */
  execute(key: string, ...params: Params): Promise<Result> {
    return new Promise((resolve, reject) => {
      const now = Date.now()
      let state = this._state.get(key)

      if (!state) {
        state = {
          timer: null,
          lastCall: 0,
          pendingResolvers: [],
        }
        this._state.set(key, state)
      }

      const timeSinceLastCall = now - state.lastCall

      // Leading edge: execute immediately if enough time has passed
      if (this._leading && timeSinceLastCall >= this._interval) {
        state.lastCall = now
        this._executeRequest(key, state, params, resolve, reject)
        return
      }

      // Store pending call for trailing edge
      state.pendingResolvers.push({ resolve, reject })
      state.pendingParams = params

      // Schedule trailing edge execution
      if (this._trailing && !state.timer) {
        const delay = Math.max(0, this._interval - timeSinceLastCall)
        state.timer = setTimeout(() => {
          this._executeTrailing(key)
        }, delay)
      }
    })
  }

  /**
   * Cancel pending throttled calls
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
      return state?.lastResult
    }

    if (state.timer) {
      clearTimeout(state.timer)
      state.timer = null
    }

    return new Promise((resolve, reject) => {
      state.pendingResolvers.push({ resolve, reject })
      this._executeTrailing(key)
    })
  }

  /**
   * Get the last result for a key
   */
  getLastResult(key: string): Result | undefined {
    return this._state.get(key)?.lastResult
  }

  /**
   * Check if there are pending calls for a key
   */
  hasPending(key: string): boolean {
    const state = this._state.get(key)
    return state ? state.pendingResolvers.length > 0 : false
  }

  /**
   * Reset all state
   */
  reset(): void {
    for (const [_key, state] of this._state) {
      if (state.timer) {
        clearTimeout(state.timer)
      }
      // Reject all pending
      for (const { reject } of state.pendingResolvers) {
        reject(new Error("ThrottledQuery reset"))
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

    // Reject all pending resolvers
    for (const { reject } of state.pendingResolvers) {
      reject(new Error("ThrottledQuery cancelled"))
    }
    state.pendingResolvers = []
    state.pendingParams = undefined
  }

  private async _executeRequest(
    _key: string,
    state: ThrottleState<Result>,
    params: Params,
    resolve: (value: Result) => void,
    reject: (error: unknown) => void,
  ): Promise<void> {
    try {
      const result = await this._request(...params)
      state.lastResult = result
      resolve(result)
    } catch (error) {
      reject(error)
    }
  }

  private async _executeTrailing(key: string): Promise<void> {
    const state = this._state.get(key)
    if (!state) return

    state.timer = null
    state.lastCall = Date.now()

    const resolvers = [...state.pendingResolvers]
    const params = state.pendingParams as Params

    state.pendingResolvers = []
    state.pendingParams = undefined

    try {
      const result = await this._request(...params)
      state.lastResult = result
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
