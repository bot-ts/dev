import { describe, expect, test } from "bun:test"
import { CircuitOpenError, QueryTimeoutError } from "../src/app/errors"
import { createQuery, Query } from "../src/app/query"
import { CircuitState } from "../src/app/types"

describe("Query", () => {
  describe("Basic execution", () => {
    test("should execute function", async () => {
      const query = new Query(async (x: number) => x * 2)

      const result = await query.execute(5)
      expect(result).toBe(10)
    })

    test("should track statistics", async () => {
      const query = new Query(async () => "result")

      await query.execute()
      await query.execute()
      await query.execute()

      const stats = query.getStats()
      expect(stats.totalCalls).toBe(3)
      expect(stats.successes).toBe(3)
    })

    test("should call onSuccess callback", async () => {
      let callbackResult: unknown
      let callbackParams: unknown

      const query = new Query(async (x: number) => x * 2, {
        onSuccess: (result, params) => {
          callbackResult = result
          callbackParams = params
        },
      })

      await query.execute(5)

      expect(callbackResult).toBe(10)
      expect(callbackParams).toEqual([5])
    })

    test("should call onError callback", async () => {
      let callbackError: unknown

      const query = new Query(
        async () => {
          throw new Error("test error")
        },
        {
          onError: (error) => {
            callbackError = error
          },
        },
      )

      await query.execute().catch(() => {})

      expect(callbackError).toBeInstanceOf(Error)
      expect((callbackError as Error).message).toBe("test error")
    })
  })

  describe("Caching", () => {
    test("should cache results", async () => {
      let callCount = 0
      const query = new Query(async () => ++callCount, { cache: { ttl: 1000 } })

      const first = await query.execute()
      const second = await query.execute()

      expect(first).toBe(1)
      expect(second).toBe(1)
      expect(callCount).toBe(1)
    })

    test("should track cache hits/misses", async () => {
      const query = new Query(async () => "result", { cache: { ttl: 1000 } })

      await query.execute()
      await query.execute()
      await query.execute()

      const stats = query.getStats()
      expect(stats.cacheHits).toBe(2)
      expect(stats.cacheMisses).toBe(1)
    })

    test("should invalidate cache", async () => {
      let callCount = 0
      const query = new Query(async () => ++callCount, { cache: { ttl: 1000 } })

      await query.execute()
      query.invalidateCache()
      const result = await query.execute()

      expect(result).toBe(2)
    })

    test("should force fetch bypassing cache", async () => {
      let callCount = 0
      const query = new Query(async () => ++callCount, { cache: { ttl: 1000 } })

      await query.execute()
      const forced = await query.fetch()

      expect(forced).toBe(2)
    })

    test("should expose cache instance", () => {
      const query = new Query(async () => "result", { cache: { ttl: 1000 } })
      expect(query.cache).toBeDefined()
    })
  })

  describe("Deduplication", () => {
    test("should deduplicate concurrent calls", async () => {
      let callCount = 0
      const query = new Query(
        async () => {
          callCount++
          await Bun.sleep(50)
          return "result"
        },
        { dedup: true },
      )

      const [r1, r2, r3] = await Promise.all([
        query.execute(),
        query.execute(),
        query.execute(),
      ])

      expect(r1).toBe("result")
      expect(r2).toBe("result")
      expect(r3).toBe("result")
      expect(callCount).toBe(1)
    })

    test("should track deduped calls", async () => {
      const query = new Query(
        async () => {
          await Bun.sleep(20)
          return "result"
        },
        { dedup: true },
      )

      await Promise.all([query.execute(), query.execute(), query.execute()])

      const stats = query.getStats()
      expect(stats.deduped).toBe(2)
    })
  })

  describe("Retry", () => {
    test("should retry on failure", async () => {
      let attempts = 0
      const query = new Query(
        async () => {
          attempts++
          if (attempts < 3) throw new Error("fail")
          return "success"
        },
        { retry: { attempts: 3, delay: 10 } },
      )

      const result = await query.execute()

      expect(result).toBe("success")
      expect(attempts).toBe(3)
    })

    test("should combine cache and retry", async () => {
      let attempts = 0
      const query = new Query(
        async () => {
          attempts++
          if (attempts < 3) throw new Error("fail")
          return "success"
        },
        {
          cache: { ttl: 1000 },
          retry: { attempts: 3, delay: 10 },
        },
      )

      const result = await query.execute()
      expect(result).toBe("success")
      expect(attempts).toBe(3)

      // Second call should use cache
      const cached = await query.execute()
      expect(cached).toBe("success")
      expect(attempts).toBe(3)
    })
  })

  describe("Timeout", () => {
    test("should timeout slow requests", async () => {
      const query = new Query(
        async () => {
          await Bun.sleep(100)
          return "done"
        },
        { timeout: 10 },
      )

      await expect(query.execute()).rejects.toThrow(QueryTimeoutError)
    })

    test("should track timeouts in stats", async () => {
      const query = new Query(
        async () => {
          await Bun.sleep(100)
          return "done"
        },
        { timeout: 10 },
      )

      await query.execute().catch(() => {})

      const stats = query.getStats()
      expect(stats.timeouts).toBe(1)
    })

    test("should complete before timeout", async () => {
      const query = new Query(
        async () => {
          await Bun.sleep(10)
          return "done"
        },
        { timeout: 100 },
      )

      const result = await query.execute()
      expect(result).toBe("done")
    })
  })

  describe("Circuit Breaker", () => {
    test("should open circuit after failures", async () => {
      const query = new Query(
        async () => {
          throw new Error("fail")
        },
        { circuitBreaker: { threshold: 2, resetTimeout: 100 } },
      )

      await query.execute().catch(() => {})
      await query.execute().catch(() => {})

      expect(query.isCircuitOpen).toBe(true)
    })

    test("should throw CircuitOpenError when open", async () => {
      const query = new Query(
        async () => {
          throw new Error("fail")
        },
        { circuitBreaker: { threshold: 1, resetTimeout: 100 } },
      )

      await query.execute().catch(() => {})

      await expect(query.execute()).rejects.toThrow(CircuitOpenError)
    })

    test("should track circuit breaks in stats", async () => {
      const query = new Query(
        async () => {
          throw new Error("fail")
        },
        { circuitBreaker: { threshold: 1, resetTimeout: 100 } },
      )

      await query.execute().catch(() => {})
      await query.execute().catch(() => {})

      const stats = query.getStats()
      expect(stats.circuitBreaks).toBeGreaterThan(0)
    })

    test("should expose circuit state in stats", async () => {
      const query = new Query(
        async () => {
          throw new Error("fail")
        },
        { circuitBreaker: { threshold: 1, resetTimeout: 100 } },
      )

      await query.execute().catch(() => {})

      const stats = query.getStats()
      expect(stats.circuitState).toBe(CircuitState.OPEN)
    })

    test("should expose circuit breaker instance", () => {
      const query = new Query(async () => "result", {
        circuitBreaker: { threshold: 5, resetTimeout: 1000 },
      })

      expect(query.circuitBreaker).toBeDefined()
    })
  })

  describe("Throttle", () => {
    test("should throttle rapid calls", async () => {
      let callCount = 0
      const query = new Query(async () => ++callCount, {
        throttle: { interval: 100, leading: true, trailing: false },
      })

      const p1 = query.execute()
      const p2 = query.execute()

      await p1
      await Bun.sleep(10)

      // Second call should be throttled (no trailing)
      expect(callCount).toBe(1)

      query.cancel()

      // Catch any pending rejections
      await p2.catch(() => {})
    })
  })

  describe("Debounce", () => {
    test("should debounce rapid calls", async () => {
      let callCount = 0
      const query = new Query(async () => ++callCount, {
        debounce: { wait: 50 },
      })

      const p1 = query.execute()
      const p2 = query.execute()
      const p3 = query.execute()

      const results = await Promise.all([p1, p2, p3])

      expect(callCount).toBe(1)
      expect(results).toEqual([1, 1, 1])
    })
  })

  describe("Custom key function", () => {
    test("should use custom key function", async () => {
      let callCount = 0
      const query = new Query(
        async (user: { id: number; name: string }) => {
          callCount++
          return user
        },
        {
          cache: { ttl: 1000 },
          keyFn: (user) => String(user.id),
        },
      )

      await query.execute({ id: 1, name: "Alice" })
      await query.execute({ id: 1, name: "Alice Updated" }) // Same key

      expect(callCount).toBe(1)
    })
  })

  describe("Reset", () => {
    test("should reset all state", async () => {
      let callCount = 0
      const query = new Query(async () => ++callCount, {
        cache: { ttl: 1000 },
        circuitBreaker: { threshold: 5, resetTimeout: 1000 },
      })

      await query.execute()
      await query.execute()

      expect(callCount).toBe(1) // Second call used cache

      query.reset()

      const stats = query.getStats()
      expect(stats.totalCalls).toBe(0)
      expect(stats.successes).toBe(0)

      // Cache should be cleared, so new call happens
      const result = await query.execute()
      expect(result).toBe(2) // New call after cache clear
    })
  })

  describe("Flush", () => {
    test("should flush pending debounced operations", async () => {
      let callCount = 0
      const query = new Query(async () => ++callCount, {
        debounce: { wait: 1000 },
      })

      const promise = query.execute()

      // Flush with a specific key (default key for no params)
      await query.flush("__default__")

      const result = await promise
      expect(callCount).toBe(1)
      expect(result).toBe(1)
    })
  })
})

describe("createQuery helper", () => {
  test("should create Query instance", async () => {
    const query = createQuery(async (x: number) => x * 2)

    const result = await query.execute(5)
    expect(result).toBe(10)
  })

  test("should accept options", async () => {
    const query = createQuery(async () => "result", { cache: { ttl: 1000 } })

    expect(query.cache).toBeDefined()
  })
})
