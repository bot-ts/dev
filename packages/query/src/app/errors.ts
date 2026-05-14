/**
 * Base error class for all Query errors
 */
export class QueryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = "QueryError"
  }
}

/**
 * Error thrown when a query times out
 */
export class QueryTimeoutError extends QueryError {
  constructor(
    public readonly timeoutMs: number,
    message?: string,
  ) {
    super(message ?? `Query timed out after ${timeoutMs}ms`, "TIMEOUT")
    this.name = "QueryTimeoutError"
  }
}

/**
 * Error thrown when the circuit breaker is open
 */
export class CircuitOpenError extends QueryError {
  constructor(
    public readonly resetTimeout: number,
    message?: string,
  ) {
    super(
      message ?? `Circuit breaker is open, will retry in ${resetTimeout}ms`,
      "CIRCUIT_OPEN",
    )
    this.name = "CircuitOpenError"
  }
}

/**
 * Error thrown when max retries are exceeded
 */
export class MaxRetriesExceededError extends QueryError {
  constructor(
    public readonly attempts: number,
    public readonly lastError: unknown,
    message?: string,
  ) {
    super(
      message ?? `Max retries (${attempts}) exceeded`,
      "MAX_RETRIES_EXCEEDED",
    )
    this.name = "MaxRetriesExceededError"
  }
}

/**
 * Error thrown when a query is aborted
 */
export class QueryAbortedError extends QueryError {
  constructor(message?: string) {
    super(message ?? "Query was aborted", "ABORTED")
    this.name = "QueryAbortedError"
  }
}
