# @ghom/query

[![npm version](https://badge.fury.io/js/%40ghom%2Fquery.svg)](https://www.npmjs.com/package/@ghom/query)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, zero-dependency, technology-agnostic query manager for JavaScript/TypeScript. Optimize your API calls with caching, throttling, retry, debounce, deduplication, circuit breaker, timeout, and batching.

## Features

- **Caching** - TTL-based caching with stale-while-revalidate support
- **Throttling** - Limit call frequency with leading/trailing edge options
- **Retry** - Automatic retry with exponential backoff, linear, or custom delay
- **Debouncing** - Wait for calls to settle before executing
- **Deduplication** - Prevent concurrent duplicate calls
- **Circuit Breaker** - Fail fast when a service is down
- **Timeout** - Limit execution time with automatic cancellation
- **Batching** - Group multiple calls into a single execution
- **Zero dependencies** - No external runtime dependencies
- **Works everywhere** - Node.js, Bun, Deno, browsers

## Installation

```bash
# npm
npm install @ghom/query

# yarn
yarn add @ghom/query

# pnpm
pnpm add @ghom/query

# bun
bun add @ghom/query
```

## Quick Start

```typescript
import { Query } from "@ghom/query"

// Create a query with multiple features
const fetchUser = new Query(
  async (userId: string) => {
    const res = await fetch(`https://api.example.com/users/${userId}`)
    return res.json()
  },
  {
    cache: { ttl: 60_000 },           // Cache for 1 minute
    retry: { attempts: 3 },            // Retry up to 3 times
    timeout: 10_000,                   // 10 second timeout
    dedup: true,                       // Deduplicate concurrent calls
  }
)

// Execute the query
const user = await fetchUser.execute("123")
```

## API Reference

### Query Class

The main class that orchestrates all features.

```typescript
import { Query } from "@ghom/query"

const query = new Query(fn, options)
```

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `cache` | `{ ttl: number, staleWhileRevalidate?: boolean }` | Enable caching with TTL in ms |
| `throttle` | `{ interval: number, leading?: boolean, trailing?: boolean }` | Throttle calls |
| `retry` | `{ attempts: number, delay?: number \| Function, retryIf?: Function }` | Retry on failure |
| `debounce` | `{ wait: number, maxWait?: number }` | Debounce calls |
| `dedup` | `boolean` | Deduplicate concurrent calls |
| `circuitBreaker` | `{ threshold: number, resetTimeout: number }` | Circuit breaker |
| `timeout` | `number` | Timeout in ms |
| `batch` | `{ maxSize: number, maxWait: number, batchFn: Function }` | Batch calls |
| `onSuccess` | `(result, params) => void` | Success callback |
| `onError` | `(error, params) => void` | Error callback |
| `keyFn` | `(...params) => string` | Custom key generator |

#### Methods

```typescript
// Execute the query
await query.execute(...params)

// Force fetch (bypass cache)
await query.fetch(...params)

// Invalidate cache
query.invalidateCache()        // All entries
query.invalidateCache("key")   // Specific key

// Get statistics
const stats = query.getStats()

// Reset everything
query.reset()

// Cancel pending calls
query.cancel()
query.cancel("key")

// Flush pending throttled/debounced calls
await query.flush()
```

### Individual Handlers

Each feature is available as a standalone class for advanced usage.

#### CachedQuery

```typescript
import { CachedQuery } from "@ghom/query"

const cache = new CachedQuery(
  async (id: string) => fetchData(id),
  60_000, // TTL
  { staleWhileRevalidate: true }
)

const data = await cache.get("key", "param1")
cache.invalidate("key")
```

#### ThrottledQuery

```typescript
import { ThrottledQuery } from "@ghom/query"

const throttled = new ThrottledQuery(
  async (id: string) => fetchData(id),
  1000, // 1 second interval
  { leading: true, trailing: true }
)

await throttled.execute("key", "param1")
```

#### RetryHandler

```typescript
import { RetryHandler, exponentialBackoff } from "@ghom/query"

const retry = new RetryHandler(
  async () => fetchData(),
  {
    attempts: 3,
    delay: exponentialBackoff, // or a number, or custom function
    retryIf: (error) => error.status === 503
  }
)

await retry.execute()
```

#### DebounceHandler

```typescript
import { DebounceHandler } from "@ghom/query"

const debounced = new DebounceHandler(
  async (query: string) => search(query),
  { wait: 300, maxWait: 1000 }
)

await debounced.execute("key", "search term")
```

#### DedupHandler

```typescript
import { DedupHandler } from "@ghom/query"

const dedup = new DedupHandler(
  async (id: string) => fetchData(id)
)

// These will share the same request
const [r1, r2, r3] = await Promise.all([
  dedup.execute("same-key", "id"),
  dedup.execute("same-key", "id"),
  dedup.execute("same-key", "id"),
])
```

#### CircuitBreaker

```typescript
import { CircuitBreaker, CircuitState } from "@ghom/query"

const breaker = new CircuitBreaker({
  threshold: 5,      // Open after 5 failures
  resetTimeout: 30_000 // Try again after 30 seconds
})

try {
  breaker.allowRequest()
  const result = await fetchData()
  breaker.recordSuccess()
} catch (error) {
  breaker.recordFailure()
}

// Or use the wrapper
const result = await breaker.execute(() => fetchData())
```

#### TimeoutHandler

```typescript
import { TimeoutHandler, withTimeout } from "@ghom/query"

// Using the class
const timeout = new TimeoutHandler(
  async () => fetchData(),
  5000
)
await timeout.execute()

// Using the utility function
const result = await withTimeout(fetchData(), 5000)
```

#### BatchHandler

```typescript
import { BatchHandler, createDataLoader } from "@ghom/query"

// Low-level batching
const batcher = new BatchHandler({
  maxSize: 100,
  maxWait: 16, // ~1 frame
  batchFn: async (params) => {
    const ids = params.map(([id]) => id)
    return fetchMany(ids)
  }
})

// DataLoader pattern
const loadUser = createDataLoader(
  async (ids: string[]) => fetchUsers(ids),
  { maxSize: 100, maxWait: 16 }
)

const user = await loadUser("123")
```

## Examples

### Discord API

```typescript
import { Query } from "@ghom/query"

const fetchGuildMember = new Query(
  async (guildId: string, userId: string) => {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
      { headers: { Authorization: `Bot ${token}` } }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  {
    cache: { ttl: 60_000, staleWhileRevalidate: true },
    retry: { 
      attempts: 3, 
      delay: (n) => Math.pow(2, n) * 1000,
      retryIf: (err) => err.message.includes("429") || err.message.includes("5")
    },
    throttle: { interval: 50 }, // Respect rate limits
    dedup: true,
    circuitBreaker: { threshold: 10, resetTimeout: 60_000 },
    timeout: 15_000,
    onError: (err, [guildId, userId]) => {
      console.error(`Failed to fetch member ${userId} from ${guildId}:`, err)
    }
  }
)

const member = await fetchGuildMember.execute("guild-id", "user-id")
```

### Database Queries

```typescript
import { Query } from "@ghom/query"

const findUserById = new Query(
  async (id: number) => {
    return db.query("SELECT * FROM users WHERE id = $1", [id])
  },
  {
    cache: { ttl: 30_000 },
    dedup: true,
    retry: { attempts: 2, delay: 100 },
    timeout: 5_000,
  }
)

// Batch loading with DataLoader pattern
import { createDataLoader } from "@ghom/query"

const loadUser = createDataLoader(
  async (ids: number[]) => {
    const result = await db.query(
      "SELECT * FROM users WHERE id = ANY($1)",
      [ids]
    )
    // Ensure order matches input
    return ids.map(id => result.find(u => u.id === id))
  }
)

const user = await loadUser(123)
```

### Search with Debounce

```typescript
import { Query } from "@ghom/query"

const searchProducts = new Query(
  async (query: string) => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
    return res.json()
  },
  {
    debounce: { wait: 300, maxWait: 1000 },
    cache: { ttl: 60_000 },
    timeout: 5_000,
  }
)

// In your UI
input.addEventListener("input", async (e) => {
  const results = await searchProducts.execute(e.target.value)
  renderResults(results)
})
```

## Error Handling

```typescript
import { 
  Query, 
  QueryTimeoutError, 
  CircuitOpenError, 
  MaxRetriesExceededError 
} from "@ghom/query"

try {
  await query.execute("param")
} catch (error) {
  if (error instanceof QueryTimeoutError) {
    console.error(`Request timed out after ${error.timeoutMs}ms`)
  } else if (error instanceof CircuitOpenError) {
    console.error(`Circuit is open, retry in ${error.resetTimeout}ms`)
  } else if (error instanceof MaxRetriesExceededError) {
    console.error(`Failed after ${error.attempts} attempts:`, error.lastError)
  }
}
```

## Statistics

```typescript
const query = new Query(fn, options)

// After some executions
const stats = query.getStats()

console.log(stats)
// {
//   totalCalls: 100,
//   cacheHits: 75,
//   cacheMisses: 25,
//   successes: 95,
//   failures: 5,
//   retries: 10,
//   deduped: 15,
//   throttled: 5,
//   debounced: 0,
//   timeouts: 2,
//   circuitBreaks: 1,
//   circuitState: "CLOSED"
// }
```

## TypeScript

Full TypeScript support with generic types:

```typescript
interface User {
  id: string
  name: string
  email: string
}

const fetchUser = new Query<[string], User>(
  async (id: string) => {
    const res = await fetch(`/api/users/${id}`)
    return res.json()
  },
  { cache: { ttl: 60_000 } }
)

// Type-safe execution
const user: User = await fetchUser.execute("123")
```

## License

MIT
