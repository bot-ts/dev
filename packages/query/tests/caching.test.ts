import { describe, expect, test } from "bun:test"
import { CachedQuery } from "../src/app/caching"

describe("CachedQuery", () => {
  test("should return cached value within TTL", async () => {
    let callCount = 0
    const query = new CachedQuery(async () => ++callCount, 1000)

    const first = await query.get("test")
    const second = await query.get("test")

    expect(first).toBe(1)
    expect(second).toBe(1)
    expect(callCount).toBe(1)
  })

  test("should refresh after TTL expires", async () => {
    let callCount = 0
    const query = new CachedQuery(async () => ++callCount, 50)

    await query.get("test")
    await Bun.sleep(60)
    const result = await query.get("test")

    expect(result).toBe(2)
  })

  test("should cache different keys separately", async () => {
    let callCount = 0
    const query = new CachedQuery(async (id: string) => {
      callCount++
      return id
    }, 1000)

    const a = await query.get("a", "a")
    const b = await query.get("b", "b")
    const a2 = await query.get("a", "a")

    expect(a).toBe("a")
    expect(b).toBe("b")
    expect(a2).toBe("a")
    expect(callCount).toBe(2)
  })

  test("should invalidate specific key", async () => {
    let callCount = 0
    const query = new CachedQuery(async () => ++callCount, 1000)

    await query.get("a")
    await query.get("b")
    query.invalidate("a")

    const a = await query.get("a")
    const b = await query.get("b")

    expect(a).toBe(3)
    expect(b).toBe(2)
  })

  test("should invalidate all keys", async () => {
    let callCount = 0
    const query = new CachedQuery(async () => ++callCount, 1000)

    await query.get("a")
    await query.get("b")
    query.invalidate()

    const a = await query.get("a")
    const b = await query.get("b")

    expect(a).toBe(3)
    expect(b).toBe(4)
  })

  test("should force fetch with fetch()", async () => {
    let callCount = 0
    const query = new CachedQuery(async () => ++callCount, 1000)

    await query.get("test")
    const forced = await query.fetch("test")

    expect(forced).toBe(2)
  })

  test("should check if key exists with has()", async () => {
    const query = new CachedQuery(async () => "value", 1000)

    expect(query.has("test")).toBe(false)
    await query.get("test")
    expect(query.has("test")).toBe(true)
  })

  test("should peek without fetching", async () => {
    const query = new CachedQuery(async () => "value", 1000)

    expect(query.peek("test")).toBe(undefined)
    await query.get("test")
    expect(query.peek("test")).toBe("value")
  })

  test("should manually set cache entry", () => {
    const query = new CachedQuery(async () => "default", 1000)

    query.set("test", "manual")
    expect(query.peek("test")).toBe("manual")
  })

  test("should return stale value with staleWhileRevalidate", async () => {
    let callCount = 0
    const query = new CachedQuery(
      async () => {
        callCount++
        return callCount
      },
      50,
      { staleWhileRevalidate: true },
    )

    const first = await query.get("test")
    expect(first).toBe(1)

    await Bun.sleep(60)

    // Should return stale value immediately
    const stale = await query.get("test")
    expect(stale).toBe(1)

    // Wait for background revalidation
    await Bun.sleep(10)
    const fresh = query.peek("test")
    expect(fresh).toBe(2)
  })

  test("should cleanup expired entries", async () => {
    const query = new CachedQuery(async () => "value", 50)

    await query.get("a")
    await query.get("b")
    expect(query.size).toBe(2)

    await Bun.sleep(60)
    const removed = query.cleanup()

    expect(removed).toBe(2)
    expect(query.size).toBe(0)
  })

  test("should return all keys", async () => {
    const query = new CachedQuery(async () => "value", 1000)

    await query.get("a")
    await query.get("b")
    await query.get("c")

    const keys = query.keys()
    expect(keys).toEqual(["a", "b", "c"])
  })
})
