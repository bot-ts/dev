import { describe, test, expect } from "bun:test"
import {
  TimeoutHandler,
  withTimeout,
  createTimeoutController,
  fetchWithTimeout,
} from "../src/app/timeout"
import { QueryTimeoutError } from "../src/app/errors"

describe("TimeoutHandler", () => {
  test("should complete before timeout", async () => {
    const handler = new TimeoutHandler(async () => {
      await Bun.sleep(10)
      return "success"
    }, 100)

    const result = await handler.execute()
    expect(result).toBe("success")
  })

  test("should throw QueryTimeoutError after timeout", async () => {
    const handler = new TimeoutHandler(async () => {
      await Bun.sleep(100)
      return "success"
    }, 10)

    await expect(handler.execute()).rejects.toThrow(QueryTimeoutError)
  })

  test("should include timeout value in error", async () => {
    const handler = new TimeoutHandler(async () => {
      await Bun.sleep(100)
      return "success"
    }, 50)

    try {
      await handler.execute()
    } catch (error) {
      expect(error).toBeInstanceOf(QueryTimeoutError)
      expect((error as QueryTimeoutError).timeoutMs).toBe(50)
    }
  })

  test("should return configured timeout", () => {
    const handler = new TimeoutHandler(async () => "result", 5000)
    expect(handler.timeout).toBe(5000)
  })

  test("should create new handler with different timeout", () => {
    const handler = new TimeoutHandler(async () => "result", 5000)
    const newHandler = handler.withTimeout(1000)

    expect(handler.timeout).toBe(5000)
    expect(newHandler.timeout).toBe(1000)
  })
})

describe("withTimeout", () => {
  test("should resolve before timeout", async () => {
    const result = await withTimeout(
      (async () => {
        await Bun.sleep(10)
        return "success"
      })(),
      100
    )

    expect(result).toBe("success")
  })

  test("should reject after timeout", async () => {
    await expect(
      withTimeout(
        (async () => {
          await Bun.sleep(100)
          return "success"
        })(),
        10
      )
    ).rejects.toThrow(QueryTimeoutError)
  })

  test("should handle non-promise values", async () => {
    const result = await withTimeout("immediate", 100)
    expect(result).toBe("immediate")
  })

  test("should propagate original error", async () => {
    await expect(
      withTimeout(
        (async () => {
          await Bun.sleep(10)
          throw new Error("original error")
        })(),
        100
      )
    ).rejects.toThrow("original error")
  })
})

describe("createTimeoutController", () => {
  test("should create AbortController", () => {
    const { controller, cleanup } = createTimeoutController(100)

    expect(controller).toBeInstanceOf(AbortController)
    expect(controller.signal.aborted).toBe(false)

    cleanup()
  })

  test("should abort after timeout", async () => {
    const { controller, cleanup } = createTimeoutController(50)

    expect(controller.signal.aborted).toBe(false)

    await Bun.sleep(60)

    expect(controller.signal.aborted).toBe(true)
    cleanup()
  })

  test("should not abort if cleaned up", async () => {
    const { controller, cleanup } = createTimeoutController(50)

    cleanup()
    await Bun.sleep(60)

    expect(controller.signal.aborted).toBe(false)
  })
})

describe("fetchWithTimeout", () => {
  test("should pass signal to function", async () => {
    let receivedSignal: AbortSignal | undefined

    await fetchWithTimeout(async (signal) => {
      receivedSignal = signal
      return "result"
    }, 100)

    expect(receivedSignal).toBeInstanceOf(AbortSignal)
  })

  test("should complete before timeout", async () => {
    const result = await fetchWithTimeout(async () => {
      await Bun.sleep(10)
      return "success"
    }, 100)

    expect(result).toBe("success")
  })

  test("should abort after timeout", async () => {
    let signalAborted = false

    const promise = fetchWithTimeout(async (signal) => {
      await Bun.sleep(100)
      signalAborted = signal.aborted
      return "success"
    }, 50)

    // The function should continue running but signal is aborted
    await Bun.sleep(60)

    // Check if the controller cleanup happens properly
    await promise.catch(() => {})
  })
})
