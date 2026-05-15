import { describe, expect, test } from "bun:test"
import { DebounceHandler } from "../src/app/debounce"

describe("DebounceHandler", () => {
  test("should debounce rapid calls", async () => {
    let callCount = 0
    const values: number[] = []

    const debounced = new DebounceHandler(
      async (val: number) => {
        callCount++
        values.push(val)
        return val
      },
      { wait: 50 },
    )

    // Rapid calls - only the last should execute
    const p1 = debounced.execute("test", 1)
    const p2 = debounced.execute("test", 2)
    const p3 = debounced.execute("test", 3)

    const results = await Promise.all([p1, p2, p3])

    expect(callCount).toBe(1)
    expect(values).toEqual([3]) // Only last value
    expect(results).toEqual([3, 3, 3]) // All get same result
  })

  test("should execute after wait time", async () => {
    let executed = false
    const debounced = new DebounceHandler(
      async () => {
        executed = true
        return "done"
      },
      { wait: 50 },
    )

    const promise = debounced.execute("test")

    // Not executed yet
    expect(executed).toBe(false)

    const result = await promise
    expect(executed).toBe(true)
    expect(result).toBe("done")
  })

  test("should respect maxWait", async () => {
    let callCount = 0
    const debounced = new DebounceHandler(async () => ++callCount, {
      wait: 100,
      maxWait: 50,
    })

    const start = Date.now()
    const promise = debounced.execute("test")

    await promise
    const elapsed = Date.now() - start

    // Should execute after maxWait, not wait
    expect(elapsed).toBeLessThan(100)
    expect(elapsed).toBeGreaterThanOrEqual(40)
  })

  test("should cancel pending calls", async () => {
    let executed = false
    const debounced = new DebounceHandler(
      async () => {
        executed = true
        return "done"
      },
      { wait: 100 },
    )

    const promise = debounced.execute("test")
    debounced.cancel("test")

    await expect(promise).rejects.toThrow("cancelled")
    expect(executed).toBe(false)
  })

  test("should flush pending calls immediately", async () => {
    let executed = false
    const debounced = new DebounceHandler(
      async () => {
        executed = true
        return "done"
      },
      { wait: 1000 },
    )

    const _promise = debounced.execute("test")
    const flushed = await debounced.flush("test")

    expect(executed).toBe(true)
    expect(flushed).toBe("done")
  })

  test("should track different keys separately", async () => {
    const results: string[] = []
    const debounced = new DebounceHandler(
      async (val: string) => {
        results.push(val)
        return val
      },
      { wait: 50 },
    )

    const [a, b] = await Promise.all([
      debounced.execute("a", "a"),
      debounced.execute("b", "b"),
    ])

    expect(a).toBe("a")
    expect(b).toBe("b")
    expect(results.sort()).toEqual(["a", "b"])
  })

  test("should check for pending calls", async () => {
    const debounced = new DebounceHandler(async () => "result", { wait: 100 })

    expect(debounced.hasPending("test")).toBe(false)

    const p = debounced.execute("test")
    expect(debounced.hasPending("test")).toBe(true)

    debounced.cancel("test")
    expect(debounced.hasPending("test")).toBe(false)

    // Catch the rejection
    await p.catch(() => {})
  })

  test("should return pending count", async () => {
    const debounced = new DebounceHandler(async () => "result", { wait: 100 })

    expect(debounced.pendingCount("test")).toBe(0)

    const p1 = debounced.execute("test")
    const p2 = debounced.execute("test")
    const p3 = debounced.execute("test")

    expect(debounced.pendingCount("test")).toBe(3)

    debounced.cancel("test")

    // Catch the rejections
    await Promise.allSettled([p1, p2, p3])
  })

  test("should reset all state", async () => {
    const debounced = new DebounceHandler(async () => "result", { wait: 100 })

    const p1 = debounced.execute("a")
    const p2 = debounced.execute("b")

    debounced.reset()

    await expect(p1).rejects.toThrow()
    await expect(p2).rejects.toThrow()
  })
})
