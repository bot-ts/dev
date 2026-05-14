import { describe, test, expect } from "bun:test"
import { BatchHandler, createDataLoader } from "../src/app/batching"

describe("BatchHandler", () => {
  test("should batch multiple calls", async () => {
    let batchCalls = 0
    const batcher = new BatchHandler<[number], number>({
      maxSize: 10,
      maxWait: 50,
      batchFn: async (params) => {
        batchCalls++
        return params.map(([n]) => n * 2)
      },
    })

    const results = await Promise.all([
      batcher.execute(1),
      batcher.execute(2),
      batcher.execute(3),
    ])

    expect(results).toEqual([2, 4, 6])
    expect(batchCalls).toBe(1)
  })

  test("should flush when reaching maxSize", async () => {
    let batchCalls = 0
    const receivedSizes: number[] = []

    const batcher = new BatchHandler<[number], number>({
      maxSize: 3,
      maxWait: 1000,
      batchFn: async (params) => {
        batchCalls++
        receivedSizes.push(params.length)
        return params.map(([n]) => n)
      },
    })

    const results = await Promise.all([
      batcher.execute(1),
      batcher.execute(2),
      batcher.execute(3),
    ])

    expect(results).toEqual([1, 2, 3])
    expect(batchCalls).toBe(1)
    expect(receivedSizes).toEqual([3])
  })

  test("should flush after maxWait", async () => {
    let batchCalls = 0
    const batcher = new BatchHandler<[number], number>({
      maxSize: 100,
      maxWait: 50,
      batchFn: async (params) => {
        batchCalls++
        return params.map(([n]) => n)
      },
    })

    const promise = batcher.execute(1)
    expect(batchCalls).toBe(0)

    await promise
    expect(batchCalls).toBe(1)
  })

  test("should manually flush", async () => {
    let batchCalls = 0
    const batcher = new BatchHandler<[number], number>({
      maxSize: 100,
      maxWait: 1000,
      batchFn: async (params) => {
        batchCalls++
        return params.map(([n]) => n)
      },
    })

    const promise = batcher.execute(1)
    expect(batchCalls).toBe(0)

    await batcher.flush()
    expect(batchCalls).toBe(1)

    await promise
  })

  test("should track queue size", async () => {
    const batcher = new BatchHandler<[number], number>({
      maxSize: 100,
      maxWait: 1000,
      batchFn: async (params) => params.map(([n]) => n),
    })

    expect(batcher.queueSize).toBe(0)

    const p1 = batcher.execute(1)
    const p2 = batcher.execute(2)
    const p3 = batcher.execute(3)

    expect(batcher.queueSize).toBe(3)

    batcher.cancel()

    // Catch the rejection errors
    await Promise.allSettled([p1, p2, p3])
  })

  test("should check hasPending", async () => {
    const batcher = new BatchHandler<[number], number>({
      maxSize: 100,
      maxWait: 1000,
      batchFn: async (params) => params.map(([n]) => n),
    })

    expect(batcher.hasPending).toBe(false)

    const p = batcher.execute(1)
    expect(batcher.hasPending).toBe(true)

    batcher.cancel()
    expect(batcher.hasPending).toBe(false)

    // Catch the rejection
    await p.catch(() => {})
  })

  test("should cancel pending items", async () => {
    const batcher = new BatchHandler<[number], number>({
      maxSize: 100,
      maxWait: 1000,
      batchFn: async (params) => params.map(([n]) => n),
    })

    const promise = batcher.execute(1)
    batcher.cancel()

    await expect(promise).rejects.toThrow("cancelled")
  })

  test("should propagate batch function errors", async () => {
    const batcher = new BatchHandler<[number], number>({
      maxSize: 10,
      maxWait: 50,
      batchFn: async () => {
        throw new Error("batch failed")
      },
    })

    const p1 = batcher.execute(1)
    const p2 = batcher.execute(2)

    const results = await Promise.allSettled([p1, p2])

    expect(results[0].status).toBe("rejected")
    expect(results[1].status).toBe("rejected")
    expect((results[0] as PromiseRejectedResult).reason.message).toBe("batch failed")
    expect((results[1] as PromiseRejectedResult).reason.message).toBe("batch failed")
  })

  test("should reject if batch function returns wrong count", async () => {
    const batcher = new BatchHandler<[number], number>({
      maxSize: 10,
      maxWait: 50,
      batchFn: async () => [1], // Returns 1 result for 3 items
    })

    const p1 = batcher.execute(1)
    const p2 = batcher.execute(2)
    const p3 = batcher.execute(3)

    const results = await Promise.allSettled([p1, p2, p3])

    for (const result of results) {
      expect(result.status).toBe("rejected")
      expect((result as PromiseRejectedResult).reason.message).toContain("returned 1 results for 3 items")
    }
  })
})

describe("createDataLoader", () => {
  test("should create a data loader function", async () => {
    let batchCalls = 0
    const loadUser = createDataLoader(
      async (ids: number[]) => {
        batchCalls++
        return ids.map((id) => ({ id, name: `User ${id}` }))
      },
      { maxSize: 10, maxWait: 50 }
    )

    const [user1, user2, user3] = await Promise.all([
      loadUser(1),
      loadUser(2),
      loadUser(3),
    ])

    expect(user1).toEqual({ id: 1, name: "User 1" })
    expect(user2).toEqual({ id: 2, name: "User 2" })
    expect(user3).toEqual({ id: 3, name: "User 3" })
    expect(batchCalls).toBe(1)
  })

  test("should use default options", async () => {
    const loadUser = createDataLoader(async (ids: string[]) =>
      ids.map((id) => id.toUpperCase())
    )

    const result = await loadUser("test")
    expect(result).toBe("TEST")
  })
})
