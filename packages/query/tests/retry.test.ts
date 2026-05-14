import { describe, test, expect } from "bun:test"
import {
  RetryHandler,
  exponentialBackoff,
  linearBackoff,
  jitteredBackoff,
  isRetryableError,
} from "../src/app/retry"
import { MaxRetriesExceededError } from "../src/app/errors"

describe("RetryHandler", () => {
  test("should succeed on first try", async () => {
    let attempts = 0
    const retry = new RetryHandler(
      async () => {
        attempts++
        return "success"
      },
      { attempts: 3 }
    )

    const result = await retry.execute()
    expect(result).toBe("success")
    expect(attempts).toBe(1)
  })

  test("should retry on failure", async () => {
    let attempts = 0
    const retry = new RetryHandler(
      async () => {
        attempts++
        if (attempts < 3) throw new Error("fail")
        return "success"
      },
      { attempts: 3, delay: 10 }
    )

    const result = await retry.execute()
    expect(result).toBe("success")
    expect(attempts).toBe(3)
  })

  test("should throw MaxRetriesExceededError after all attempts", async () => {
    let attempts = 0
    const retry = new RetryHandler(
      async () => {
        attempts++
        throw new Error("always fails")
      },
      { attempts: 3, delay: 10 }
    )

    try {
      await retry.execute()
      expect(true).toBe(false) // Should not reach
    } catch (error) {
      expect(error).toBeInstanceOf(MaxRetriesExceededError)
      expect((error as MaxRetriesExceededError).attempts).toBe(3)
      expect(attempts).toBe(3)
    }
  })

  test("should respect retryIf condition", async () => {
    let attempts = 0
    const retry = new RetryHandler(
      async () => {
        attempts++
        throw new Error("non-retryable")
      },
      {
        attempts: 3,
        delay: 10,
        retryIf: (error) => (error as Error).message !== "non-retryable",
      }
    )

    try {
      await retry.execute()
    } catch (error) {
      expect((error as Error).message).toBe("non-retryable")
      expect(attempts).toBe(1) // Should not retry
    }
  })

  test("should use constant delay", async () => {
    const start = Date.now()
    let attempts = 0
    const retry = new RetryHandler(
      async () => {
        attempts++
        if (attempts < 3) throw new Error("fail")
        return "success"
      },
      { attempts: 3, delay: 50 }
    )

    await retry.execute()
    const elapsed = Date.now() - start

    // Should have waited ~100ms (2 retries * 50ms)
    expect(elapsed).toBeGreaterThanOrEqual(90)
  })

  test("should use custom delay function", async () => {
    const delays: number[] = []
    let attempts = 0

    const retry = new RetryHandler(
      async () => {
        attempts++
        if (attempts < 3) throw new Error("fail")
        return "success"
      },
      {
        attempts: 3,
        delay: (attempt) => {
          const d = (attempt + 1) * 10
          delays.push(d)
          return d
        },
      }
    )

    await retry.execute()
    expect(delays).toEqual([10, 20])
  })

  test("should call onRetry callback", async () => {
    const retryInfo: Array<{ attempt: number; delay: number }> = []
    let attempts = 0

    const retry = new RetryHandler(
      async () => {
        attempts++
        if (attempts < 3) throw new Error("fail")
        return "success"
      },
      { attempts: 3, delay: 10 }
    )

    await retry.executeWithCallback([], (attempt, _error, delay) => {
      retryInfo.push({ attempt, delay })
    })

    expect(retryInfo).toEqual([
      { attempt: 0, delay: 10 },
      { attempt: 1, delay: 10 },
    ])
  })
})

describe("Backoff functions", () => {
  test("exponentialBackoff should double each time", () => {
    expect(exponentialBackoff(0, 1000)).toBe(1000)
    expect(exponentialBackoff(1, 1000)).toBe(2000)
    expect(exponentialBackoff(2, 1000)).toBe(4000)
    expect(exponentialBackoff(3, 1000)).toBe(8000)
  })

  test("linearBackoff should increase linearly", () => {
    expect(linearBackoff(0, 1000)).toBe(1000)
    expect(linearBackoff(1, 1000)).toBe(2000)
    expect(linearBackoff(2, 1000)).toBe(3000)
  })

  test("jitteredBackoff should add randomness", () => {
    const base = exponentialBackoff(2, 1000) // 4000
    const jittered = jitteredBackoff(2, 1000, 0.5)

    // Should be between base and base * 1.5
    expect(jittered).toBeGreaterThanOrEqual(base)
    expect(jittered).toBeLessThanOrEqual(base * 1.5)
  })
})

describe("isRetryableError", () => {
  test("should return true for network errors", () => {
    expect(isRetryableError(new Error("network error"))).toBe(true)
    expect(isRetryableError(new Error("timeout"))).toBe(true)
    expect(isRetryableError(new Error("ECONNRESET"))).toBe(true)
  })

  test("should return true for rate limit errors", () => {
    expect(isRetryableError(new Error("rate limit exceeded"))).toBe(true)
    expect(isRetryableError(new Error("too many requests"))).toBe(true)
  })

  test("should return true for retryable status codes", () => {
    expect(isRetryableError({ status: 429 })).toBe(true)
    expect(isRetryableError({ status: 503 })).toBe(true)
    expect(isRetryableError({ status: 504 })).toBe(true)
  })

  test("should return true by default", () => {
    expect(isRetryableError(new Error("unknown"))).toBe(true)
    expect(isRetryableError("string error")).toBe(true)
  })
})
