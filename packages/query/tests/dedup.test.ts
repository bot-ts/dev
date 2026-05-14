import { describe, test, expect } from "bun:test"
import { DedupHandler } from "../src/app/dedup"

describe("DedupHandler", () => {
  test("should deduplicate concurrent calls", async () => {
    let callCount = 0
    const dedup = new DedupHandler(async () => {
      callCount++
      await Bun.sleep(50)
      return "result"
    })

    const [r1, r2, r3] = await Promise.all([
      dedup.execute("same-key"),
      dedup.execute("same-key"),
      dedup.execute("same-key"),
    ])

    expect(r1).toBe("result")
    expect(r2).toBe("result")
    expect(r3).toBe("result")
    expect(callCount).toBe(1)
  })

  test("should not deduplicate different keys", async () => {
    let callCount = 0
    const dedup = new DedupHandler(async (id: string) => {
      callCount++
      await Bun.sleep(10)
      return id
    })

    const [a, b, c] = await Promise.all([
      dedup.execute("a", "a"),
      dedup.execute("b", "b"),
      dedup.execute("c", "c"),
    ])

    expect(a).toBe("a")
    expect(b).toBe("b")
    expect(c).toBe("c")
    expect(callCount).toBe(3)
  })

  test("should not deduplicate sequential calls", async () => {
    let callCount = 0
    const dedup = new DedupHandler(async () => {
      callCount++
      return "result"
    })

    await dedup.execute("key")
    await dedup.execute("key")
    await dedup.execute("key")

    expect(callCount).toBe(3)
  })

  test("should track pending requests", async () => {
    const dedup = new DedupHandler(async () => {
      await Bun.sleep(50)
      return "result"
    })

    expect(dedup.isPending("key")).toBe(false)

    const promise = dedup.execute("key")
    expect(dedup.isPending("key")).toBe(true)

    await promise
    expect(dedup.isPending("key")).toBe(false)
  })

  test("should return pending count", async () => {
    const dedup = new DedupHandler(async () => {
      await Bun.sleep(50)
      return "result"
    })

    expect(dedup.pendingCount).toBe(0)

    const p1 = dedup.execute("a")
    const p2 = dedup.execute("b")
    const p3 = dedup.execute("c")

    expect(dedup.pendingCount).toBe(3)

    await Promise.all([p1, p2, p3])
    expect(dedup.pendingCount).toBe(0)
  })

  test("should return pending keys", async () => {
    const dedup = new DedupHandler(async () => {
      await Bun.sleep(50)
      return "result"
    })

    const p1 = dedup.execute("a")
    const p2 = dedup.execute("b")

    expect(dedup.pendingKeys.sort()).toEqual(["a", "b"])

    await Promise.all([p1, p2])
  })

  test("should propagate errors to all waiters", async () => {
    let callCount = 0
    const dedup = new DedupHandler(async () => {
      callCount++
      await Bun.sleep(10)
      throw new Error("fail")
    })

    const promises = [
      dedup.execute("key"),
      dedup.execute("key"),
      dedup.execute("key"),
    ]

    const results = await Promise.allSettled(promises)

    for (const result of results) {
      expect(result.status).toBe("rejected")
      expect((result as PromiseRejectedResult).reason.message).toBe("fail")
    }

    expect(callCount).toBe(1)
  })

  test("should reset pending map", async () => {
    const dedup = new DedupHandler(async () => {
      await Bun.sleep(100)
      return "result"
    })

    const promise = dedup.execute("key")
    expect(dedup.isPending("key")).toBe(true)

    dedup.reset()
    expect(dedup.isPending("key")).toBe(false)

    // Original promise still completes (we can't cancel it)
    await promise
  })
})
