Create a new database table for this bot.ts project.

The framework uses `@ghom/orm` (Knex-based ORM with SQLite3 by default). Types are auto-inferred from column definitions — no manual TypeScript interface needed.

The user will provide: table name, description, and columns.

If the user hasn't provided details, ask for:
1. Table name (snake_case, e.g. `guild_members`)
2. Short description
3. Columns: name, type, nullable/required, unique, default value

Then create the file at `src/tables/<name>.ts` (Biome style: tabs, no semicolons, double quotes).

### Basic example

```typescript
import { Table } from "@ghom/orm"

export default new Table({
  name: "guild_members",
  description: "Members tracked per guild",
  columns: (col) => ({
    id: col.increments(),
    guild_id: col.string(),
    user_id: col.string(),
    score: col.integer().defaultTo(0),
    joined_at: col.timestamp().defaultTo(col.fn.now()),
  }),
})
```

### With migrations (add columns in future versions)

```typescript
import { Table, col, migrate } from "@ghom/orm"

export default new Table({
  name: "guild_members",
  description: "Members tracked per guild",
  columns: (col) => ({
    id: col.increments(),
    guild_id: col.string(),
    user_id: col.string(),
  }),
  migrations: {
    1: migrate.addColumn("score", col.integer().defaultTo(0)),
    2: migrate.addColumn("is_premium", col.boolean().defaultTo(false)),
  },
})
```

### With caching

```typescript
import { Table } from "@ghom/orm"

export default new Table({
  name: "guild_members",
  description: "Members tracked per guild",
  caching: 300_000, // cache for 5 minutes
  columns: (col) => ({
    id: col.increments(),
    guild_id: col.string(),
    user_id: col.string(),
  }),
})
```

### Column types reference (`col.*`)

```typescript
col.increments()       // auto-increment integer PK
col.bigIncrements()    // auto-increment bigint PK
col.string()           // VARCHAR(255)
col.text()             // TEXT
col.integer()          // INTEGER
col.bigInteger()       // BIGINT
col.float()            // FLOAT
col.decimal()          // DECIMAL
col.boolean()          // BOOLEAN
col.timestamp()        // TIMESTAMP
col.date()             // DATE
col.json()             // JSON
col.uuid()             // UUID
col.binary()           // BINARY
col.enum(["a", "b"])   // ENUM

// Modifiers (chainable)
.nullable()            // allows NULL (types as T | null)
.defaultTo(value)      // default value
.unique()              // UNIQUE constraint
.primary()             // PRIMARY KEY
.index()               // adds an index
.references("id").inTable("other").onDelete("cascade")  // foreign key
```

### Migration helpers (`migrate.*`)

```typescript
import { col, migrate } from "@ghom/orm"

migrate.addColumn("email", col.string())
migrate.dropColumn("old_field")
migrate.renameColumn("name", "username")
migrate.raw((builder) => builder.dropColumn("legacy"))
migrate.sequence(
  migrate.addColumn("phone", col.string()),
  migrate.addColumn("address", col.string().nullable()),
)
```

### Using the table in commands/listeners

```typescript
import guildMembersTable from "#tables/guild_members"

// SELECT
const member = await guildMembersTable.query
  .where("guild_id", guildId)
  .where("user_id", userId)
  .first()

// INSERT
await guildMembersTable.query.insert({ guild_id: guildId, user_id: userId })

// UPDATE
await guildMembersTable.query
  .where("user_id", userId)
  .update({ score: newScore })

// DELETE
await guildMembersTable.query.where("id", id).delete()

// With cache:
const cached = await guildMembersTable.cache.get(
  `member:${guildId}:${userId}`,
  (q) => q.where("guild_id", guildId).where("user_id", userId)
)
```

### Rules

- The `name` in `Table()` must match the actual database table name
- Types are auto-inferred from `columns` — nullable columns (`col.x().nullable()`) produce `T | null`
- Migrations run automatically in ascending key order on each bot start
- Higher `priority` number = loads before lower priority tables (useful for foreign keys)
- Configure database engine with `bot config database` — defaults to SQLite3

After creating the file, remind the user to run `bun run format`.
