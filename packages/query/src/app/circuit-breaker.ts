import { CircuitOpenError } from "./errors.js"
import { type CircuitBreakerOptions, CircuitState } from "./types.js"

/**
 * Circuit breaker implementation for fault tolerance
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is tripped, requests fail immediately
 * - HALF_OPEN: Testing if service recovered, allows one request through
 */
export class CircuitBreaker {
  private _state: CircuitState = CircuitState.CLOSED
  private _failureCount = 0
  private _successCount = 0
  private _lastFailureTime = 0
  private _threshold: number
  private _resetTimeout: number

  constructor(options: CircuitBreakerOptions) {
    this._threshold = options.threshold
    this._resetTimeout = options.resetTimeout
  }

  /**
   * Get current circuit state
   */
  get state(): CircuitState {
    this._updateState()
    return this._state
  }

  /**
   * Check if circuit is open (blocking requests)
   */
  isOpen(): boolean {
    this._updateState()
    return this._state === CircuitState.OPEN
  }

  /**
   * Check if circuit is closed (allowing requests)
   */
  isClosed(): boolean {
    this._updateState()
    return this._state === CircuitState.CLOSED
  }

  /**
   * Check if circuit is half-open (testing recovery)
   */
  isHalfOpen(): boolean {
    this._updateState()
    return this._state === CircuitState.HALF_OPEN
  }

  /**
   * Record a successful call
   */
  recordSuccess(): void {
    this._successCount++
    if (this._state === CircuitState.HALF_OPEN) {
      // Successful call in half-open state closes the circuit
      this._close()
    }
    this._failureCount = 0
  }

  /**
   * Record a failed call
   */
  recordFailure(): void {
    this._failureCount++
    this._lastFailureTime = Date.now()

    if (this._state === CircuitState.HALF_OPEN) {
      // Failed call in half-open state opens the circuit again
      this._open()
    } else if (this._failureCount >= this._threshold) {
      this._open()
    }
  }

  /**
   * Check if a request can proceed
   * Throws CircuitOpenError if circuit is open
   */
  allowRequest(): void {
    this._updateState()

    if (this._state === CircuitState.OPEN) {
      throw new CircuitOpenError(this._resetTimeout)
    }
  }

  /**
   * Wrap a function with circuit breaker logic
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.allowRequest()

    try {
      const result = await fn()
      this.recordSuccess()
      return result
    } catch (error) {
      this.recordFailure()
      throw error
    }
  }

  /**
   * Manually reset the circuit breaker to closed state
   */
  reset(): void {
    this._close()
  }

  /**
   * Force the circuit to open
   */
  trip(): void {
    this._open()
  }

  /**
   * Get statistics about the circuit breaker
   */
  getStats(): {
    state: CircuitState
    failureCount: number
    successCount: number
    lastFailureTime: number
    threshold: number
    resetTimeout: number
  } {
    this._updateState()
    return {
      state: this._state,
      failureCount: this._failureCount,
      successCount: this._successCount,
      lastFailureTime: this._lastFailureTime,
      threshold: this._threshold,
      resetTimeout: this._resetTimeout,
    }
  }

  private _updateState(): void {
    if (this._state === CircuitState.OPEN) {
      const timeSinceFailure = Date.now() - this._lastFailureTime
      if (timeSinceFailure >= this._resetTimeout) {
        this._state = CircuitState.HALF_OPEN
      }
    }
  }

  private _open(): void {
    this._state = CircuitState.OPEN
    this._lastFailureTime = Date.now()
  }

  private _close(): void {
    this._state = CircuitState.CLOSED
    this._failureCount = 0
  }
}
