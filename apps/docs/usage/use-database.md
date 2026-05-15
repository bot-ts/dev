---
description: Everything he needs to know about the database
---

# Database

## Set up the database

To configure the database for your application, it is recommended to use the [CLI](https://www.npmjs.com/package/make-bot.ts) command to set the desired database type. You can do cela by executing the following command:

### CLI pattern

```bash
bot config database
```

## Create a table

To create a new table, you can use the following command, which will generate a new file in the `src/tables/{name}` directory:

### CLI pattern

```bash
bot add table
```

### Example of table configuration

Here’s an example of how to configure a table. Welcome to the `src/tables/users.ts` file:

```typescript
import { Table } from "@ghom/orm"

export default new Table({
  name: "users",
  description: "Table of users",
  columns: (col) => ({
    id: col.increments(),
    name: col.string().nullable(),
    email: col.string(),
  }),
})
```

Types are auto-inferred from column definitions — no manual TypeScript interface needed. Nullable columns (`col.x().nullable()`) produce `T | null`.

## About Knex and ORM usage

This framework's ORM uses Knex.js as its query builder to facilitate database interactions. You can import your table configurations easily in your command files and use very simple queries as method chains.

Access to the Knex documentation here: [https://knexjs.org/guide/](https://knexjs.org/guide/)

### Example of using a table in a command

To use your newly created table in a command, you can launch a typed Knex query with the `<Table>.query` property.

```typescript
import { SlashCommand } from "#core/slash"
import usersTable from "#tables/users"

export default new SlashCommand({
  name: "test",
  description: "A test command to query the users table",
  async run(interaction) {
    // equivalent of sql`SELECT * FROM users WHERE name = "John" LIMIT 1`[0]
    const user = await usersTable.query.where("name", "John").first()

    return interaction.reply({ content: JSON.stringify(user) })
  },
})
```

## Migrations

Migrations are automatically managed by the ORM. You can create migrations by adding keys to the `TableOption.migrations` object.&#x20;

Use the typed `migrate.*` helpers (`migrate.addColumn()`, `migrate.dropColumn()`, `migrate.renameColumn()`, etc.) to define each migration step.

Migrations are automatically run at each bot launch and in ascending order based on their versions.

### Example of defining migrations

Here’s an example of how to define migrations for a table using typed migration helpers:

```typescript
import { Table, col, migrate } from "@ghom/orm"

export default new Table({
  name: "users",
  columns: (col) => ({
    id: col.increments(),
    name: col.string().nullable(),
    email: col.string(),
  }),
  migrations: {
    1: migrate.addColumn("profile_picture", col.string().nullable()),
    2: migrate.dropColumn("profile_picture"),
  },
})
```

## Table loading priorities

You can specify the loading order of tables and their migrations using the `priority: number` property. This property influences the order in which the tables are loaded and their migrations are executed.

### Example of setting priority

```typescript
import { Table } from "@ghom/orm"

export default new Table({
  name: "users",
  priority: 1, // Higher priority means it will load before others
  columns: (col) => ({
    id: col.increments(),
    name: col.string().nullable(),
    email: col.string(),
  }),
})
```

## Interacting with your tables

You can interact with your tables using the `<Table>.query` property. This property is a [Knex](https://knexjs.org/guide/) query builder that you can use to create complex queries.

### Example of using the query builder

```typescript
// src/slash/me.ts

import { SlashCommand } from "#core/slash"
import usersTable from "#tables/users"

export default new SlashCommand({
  name: "me",
  description: "Get your user data",
  async run(interaction) {
    const user = await usersTable.query.where("id", interaction.user.id).first()

    if (!user) {
      return interaction.reply({
        content: "You are not registered in the database",
      })
    }

    return interaction.reply({ content: JSON.stringify(user) })
  },
})
```

## Caching

The ORM provides a built-in caching system that can be used to optimize slow queries. You can use the `<Table>.cache` property to cache the results of a query.

### Setup the expiration time

You can set up a global cache expiration time in the `src/config.ts` file and independently for each table in the table's `caching` option.

```typescript
import { Table } from "@ghom/orm"

export default new Table({
  name: "users",
  caching: 600_000, // cache data for 10 minutes
  columns: (col) => ({
    id: col.increments(),
    name: col.string().nullable(),
    email: col.string(),
  }),
})
```

### Example of using the built-in cache

Here’s an example of how to use the built-in cache

```typescript
import usersTable from "#tables/users"

/**
 * Get the list of users with a specific name (using the cache to optimize queries).
 */
export async function getUsersByName(name: string) {
  return await usersTable.cache.get(`name:${name}`, async (query) => {
    return query.where("name", name)
  })
}

/**
 * Update the name of a user (and refresh the table's cache).
 */
export async function setUserName(id: number, name: string) {
  await usersTable.cache.set((query) => query.where("id", id).update({ name }))
}
```
