import { describe, expect, test } from "bun:test"
import { ThrottledQuery } from "../src/app/throttle"

describe("ThrottledQuery", () => {
  test("should execute immediately on first call (leading edge)", async () => {
    let callCount = 0
    const throttled = new ThrottledQuery(async () => ++callCount, 100, {
      leading: true,
      trailing: true,
    })

    const result = await throttled.execute("test")
    expect(result).toBe(1)
  })

  test("should throttle rapid calls", async () => {
    let callCount = 0
    const throttled = new ThrottledQuery(async () => ++callCount, 100, {
      leading: true,
      trailing: true,
    })

    // First call executes immediately
    const p1 = throttled.execute("test")
    // Second call is throttled
    const p2 = throttled.execute("test")
    // Third call is throttled
    const p3 = throttled.execute("test")

    const results = await Promise.all([p1, p2, p3])

    // First executes immediately, others wait for trailing
    expect(results[0]).toBe(1)
    // p2 and p3 share the trailing execution
    expect(callCount).toBeLessThanOrEqual(2)
  })

  test("should execute after interval passes", async () => {
    let callCount = 0
    const throttled = new ThrottledQuery(async () => ++callCount, 50, {
      leading: true,
      trailing: true,
    })

    await throttled.execute("test")
    await Bun.sleep(60)
    await throttled.execute("test")

    expect(callCount).toBe(2)
  })

  test("should cancel pending calls", async () => {
    let callCount = 0
    const throttled = new ThrottledQuery(async () => ++callCount, 100, {
      leading: false,
      trailing: true,
    })

    const promise = throttled.execute("test")
    throttled.cancel("test")

    await expect(promise).rejects.toThrow("cancelled")
    expect(callCount).toBe(0)
  })

  test("should flush pending calls", async () => {
    let callCount = 0
    const throttled = new ThrottledQuery(async () => ++callCount, 1000, {
      leading: false,
      trailing: true,
    })

    const _promise = throttled.execute("test")
    await throttled.flush("test")

    expect(callCount).toBe(1)
  })

  test("should track different keys separately", async () => {
    const results: string[] = []
    const throttled = new ThrottledQuery(
      async (id: string) => {
        results.push(id)
        return id
      },
      100,
      { leading: true, trailing: true },
    )

    const [a, b] = await Promise.all([
      throttled.execute("a", "a"),
      throttled.execute("b", "b"),
    ])

    expect(a).toBe("a")
    expect(b).toBe("b")
    expect(results).toContain("a")
    expect(results).toContain("b")
  })

  test("should return last result", async () => {
    const throttled = new ThrottledQuery(async (val: number) => val * 2, 100, {
      leading: true,
    })

    await throttled.execute("test", 5)
    expect(throttled.getLastResult("test")).toBe(10)
  })

  test("should check for pending calls", async () => {
    const throttled = new ThrottledQuery(async () => "result", 100, {
      leading: false,
      trailing: true,
    })

    expect(throttled.hasPending("test")).toBe(false)

    const promise = throttled.execute("test")
    expect(throttled.hasPending("test")).toBe(true)

    throttled.cancel("test")
    await promise.catch(() => {})
    expect(throttled.hasPending("test")).toBe(false)
  })

  test("should reset all state", async () => {
    const throttled = new ThrottledQuery(async () => "result", 100, {
      leading: false,
      trailing: true,
    })

    const p1 = throttled.execute("a")
    const p2 = throttled.execute("b")

    throttled.reset()

    await expect(p1).rejects.toThrow()
    await expect(p2).rejects.toThrow()
  })
})
