import { QueryTimeoutError } from "./errors.js"
import type { QueryFn } from "./types.js"

/**
 * Timeout handler for query execution
 */
export class TimeoutHandler<Params extends unknown[], Result> {
  constructor(
    private _request: QueryFn<Params, Result>,
    private _timeout: number,
  ) {}

  /**
   * Execute with timeout
   */
  async execute(...params: Params): Promise<Result> {
    return withTimeout(this._request(...params), this._timeout)
  }

  /**
   * Get the configured timeout
   */
  get timeout(): number {
    return this._timeout
  }

  /**
   * Create a new handler with a different timeout
   */
  withTimeout(timeout: number): TimeoutHandler<Params, Result> {
    return new TimeoutHandler(this._request, timeout)
  }
}

/**
 * Wrap a promise with a timeout
 * @param promise The promise to wrap
 * @param timeoutMs Timeout in milliseconds
 * @returns Promise that rejects with QueryTimeoutError if timeout is exceeded
 */
export async function withTimeout<T>(
  promise: Promise<T> | T,
  timeoutMs: number,
): Promise<T> {
  // If not a promise, return immediately
  if (!(promise instanceof Promise)) {
    return promise
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new QueryTimeoutError(timeoutMs))
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    return result
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * Create an AbortController that automatically aborts after a timeout
 */
export function createTimeoutController(timeoutMs: number): {
  controller: AbortController
  cleanup: () => void
} {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort(new QueryTimeoutError(timeoutMs))
  }, timeoutMs)

  return {
    controller,
    cleanup: () => clearTimeout(timeoutId),
  }
}

/**
 * Wrap a fetch-like function with timeout support using AbortController
 */
export async function fetchWithTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const { controller, cleanup } = createTimeoutController(timeoutMs)

  try {
    const result = await fn(controller.signal)
    return result
  } finally {
    cleanup()
  }
}
