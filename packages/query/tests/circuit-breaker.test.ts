import { describe, expect, test } from "bun:test"
import { CircuitBreaker } from "../src/app/circuit-breaker"
import { CircuitOpenError } from "../src/app/errors"
import { CircuitState } from "../src/app/types"

describe("CircuitBreaker", () => {
  test("should start in closed state", () => {
    const breaker = new CircuitBreaker({ threshold: 3, resetTimeout: 100 })

    expect(breaker.state).toBe(CircuitState.CLOSED)
    expect(breaker.isClosed()).toBe(true)
    expect(breaker.isOpen()).toBe(false)
    expect(breaker.isHalfOpen()).toBe(false)
  })

  test("should open after threshold failures", () => {
    const breaker = new CircuitBreaker({ threshold: 3, resetTimeout: 100 })

    breaker.recordFailure()
    expect(breaker.isOpen()).toBe(false)

    breaker.recordFailure()
    expect(breaker.isOpen()).toBe(false)

    breaker.recordFailure()
    expect(breaker.isOpen()).toBe(true)
  })

  test("should throw CircuitOpenError when open", () => {
    const breaker = new CircuitBreaker({ threshold: 1, resetTimeout: 100 })

    breaker.recordFailure()

    expect(() => breaker.allowRequest()).toThrow(CircuitOpenError)
  })

  test("should transition to half-open after reset timeout", async () => {
    const breaker = new CircuitBreaker({ threshold: 1, resetTimeout: 50 })

    breaker.recordFailure()
    expect(breaker.isOpen()).toBe(true)

    await Bun.sleep(60)

    expect(breaker.isHalfOpen()).toBe(true)
    expect(breaker.isOpen()).toBe(false)
  })

  test("should close after successful call in half-open state", async () => {
    const breaker = new CircuitBreaker({ threshold: 1, resetTimeout: 50 })

    breaker.recordFailure()
    await Bun.sleep(60)

    expect(breaker.isHalfOpen()).toBe(true)

    breaker.recordSuccess()

    expect(breaker.isClosed()).toBe(true)
  })

  test("should re-open after failure in half-open state", async () => {
    const breaker = new CircuitBreaker({ threshold: 1, resetTimeout: 50 })

    breaker.recordFailure()
    await Bun.sleep(60)

    expect(breaker.isHalfOpen()).toBe(true)

    breaker.recordFailure()

    expect(breaker.isOpen()).toBe(true)
  })

  test("should reset failure count on success", () => {
    const breaker = new CircuitBreaker({ threshold: 3, resetTimeout: 100 })

    breaker.recordFailure()
    breaker.recordFailure()
    breaker.recordSuccess()
    breaker.recordFailure()
    breaker.recordFailure()

    // Should not be open because success reset the count
    expect(breaker.isOpen()).toBe(false)
  })

  test("should allow request when closed", () => {
    const breaker = new CircuitBreaker({ threshold: 3, resetTimeout: 100 })

    expect(() => breaker.allowRequest()).not.toThrow()
  })

  test("should allow request in half-open state", async () => {
    const breaker = new CircuitBreaker({ threshold: 1, resetTimeout: 50 })

    breaker.recordFailure()
    await Bun.sleep(60)

    expect(() => breaker.allowRequest()).not.toThrow()
  })

  test("should execute function with circuit breaker logic", async () => {
    const breaker = new CircuitBreaker({ threshold: 2, resetTimeout: 100 })

    const result = await breaker.execute(async () => "success")
    expect(result).toBe("success")

    // Fail twice to open
    await breaker
      .execute(async () => {
        throw new Error("fail")
      })
      .catch(() => {})
    await breaker
      .execute(async () => {
        throw new Error("fail")
      })
      .catch(() => {})

    // Should be open now
    await expect(breaker.execute(async () => "success")).rejects.toThrow(
      CircuitOpenError,
    )
  })

  test("should manually reset the circuit", () => {
    const breaker = new CircuitBreaker({ threshold: 1, resetTimeout: 100 })

    breaker.recordFailure()
    expect(breaker.isOpen()).toBe(true)

    breaker.reset()
    expect(breaker.isClosed()).toBe(true)
  })

  test("should manually trip the circuit", () => {
    const breaker = new CircuitBreaker({ threshold: 5, resetTimeout: 100 })

    expect(breaker.isClosed()).toBe(true)

    breaker.trip()
    expect(breaker.isOpen()).toBe(true)
  })

  test("should return stats", () => {
    const breaker = new CircuitBreaker({ threshold: 3, resetTimeout: 100 })

    breaker.recordSuccess()
    breaker.recordSuccess()
    breaker.recordFailure()

    const stats = breaker.getStats()

    expect(stats.state).toBe(CircuitState.CLOSED)
    expect(stats.successCount).toBe(2)
    expect(stats.failureCount).toBe(1)
    expect(stats.threshold).toBe(3)
    expect(stats.resetTimeout).toBe(100)
  })
})
