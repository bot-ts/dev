---
description: >-
  Namespaces are simply files in which you can export stuff that you will use in
  your commands, like utils.
---

# Namespace

Namespaces are utility modules that allow you to organize and share code across your bot. They are TypeScript files where you can export functions, classes, constants, middlewares, and any other reusable code.

## Why use namespaces?

- **Code organization**: Keep related utilities together
- **Reusability**: Share code between commands, listeners, and other components
- **Type safety**: Full TypeScript support with auto-imports
- **Clean imports**: Access via the `#namespaces/*` alias

## Create a namespace

You must use the [CLI](https://www.npmjs.com/package/@ghom/bot.ts-cli) to create your namespaces. The CLI automatically registers the namespace in `package.json` imports.

### CLI pattern

```bash
bot add namespace
```

The CLI will prompt you for:
1. The namespace name (e.g., `utils`, `middlewares`, `constants`)
2. Whether to import the core module

## Namespace structure

A namespace file is a standard TypeScript module. Here's a basic example:

```typescript
// src/namespaces/utils.ts

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export const BOT_COLOR = 0x5865f2
```

## Using namespaces

Import your namespace using the `#namespaces/*` alias:

```typescript
import { formatDate, randomNumber, BOT_COLOR } from "#namespaces/utils"

// Or import everything
import * as utils from "#namespaces/utils"
```

### In a command

```typescript
import { Command } from "#core/command"
import { formatDate } from "#namespaces/utils"

export default new Command({
  name: "today",
  description: "Show today's date",
  channelType: "all",
  async run(message) {
    const today = formatDate(new Date())
    await message.channel.send(`Today is ${today}`)
  },
})
```

### In a listener

```typescript
import { Listener } from "#core/listener"
import { BOT_COLOR } from "#namespaces/utils"
import discord from "discord.js"

export default new Listener({
  event: "guildMemberAdd",
  description: "Welcome new members",
  async run(member) {
    const embed = new discord.EmbedBuilder()
      .setColor(BOT_COLOR)
      .setTitle("Welcome!")
      .setDescription(`Welcome to the server, ${member}!`)
    
    member.guild.systemChannel?.send({ embeds: [embed] })
  },
})
```

## Common use cases

### 1. Middlewares

Create reusable command middlewares:

```typescript
// src/namespaces/middlewares.ts

import { Middleware } from "#core/command"

export const requirePremium = new Middleware(
  "requirePremium",
  async (context, data) => {
    const isPremium = await checkPremiumStatus(context.message.author.id)
    
    if (!isPremium) {
      return {
        result: "This command requires a premium subscription!",
        data: null,
      }
    }
    
    return { result: true, data }
  }
)

export const requireLevel = (minLevel: number) => new Middleware(
  "requireLevel",
  async (context, data) => {
    const level = await getUserLevel(context.message.author.id)
    
    if (level < minLevel) {
      return {
        result: `You need to be level ${minLevel} to use this command!`,
        data: null,
      }
    }
    
    return { result: true, data: { ...data, level } }
  }
)
```

Usage in a command:

```typescript
import { Command } from "#core/command"
import { requirePremium, requireLevel } from "#namespaces/middlewares"

export default new Command({
  name: "exclusive",
  description: "Premium-only command",
  middlewares: [requirePremium, requireLevel(10)],
  async run(message) {
    await message.reply("Welcome, premium user!")
  },
})
```

### 2. Constants and configuration

```typescript
// src/namespaces/constants.ts

export const COLORS = {
  primary: 0x5865f2,
  success: 0x57f287,
  warning: 0xfee75c,
  error: 0xed4245,
  info: 0x5865f2,
} as const

export const EMOJIS = {
  success: "✅",
  error: "❌",
  warning: "⚠️",
  loading: "⏳",
  arrow: "➜",
} as const

export const LIMITS = {
  maxCommandsPerPage: 10,
  maxEmbedFields: 25,
  cooldownDefault: 3000,
} as const
```

### 3. API wrappers

```typescript
// src/namespaces/api.ts

const API_BASE = "https://api.example.com"

export async function fetchUserData(userId: string) {
  const response = await fetch(`${API_BASE}/users/${userId}`)
  if (!response.ok) throw new Error("Failed to fetch user data")
  return response.json()
}

export async function postAnalytics(event: string, data: object) {
  await fetch(`${API_BASE}/analytics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, data, timestamp: Date.now() }),
  })
}
```

### 4. Database helpers

```typescript
// src/namespaces/database.ts

import { users, guilds } from "#tables"

export async function getOrCreateUser(userId: string) {
  let user = await users.query.where("id", userId).first()
  
  if (!user) {
    await users.query.insert({ id: userId, createdAt: new Date() })
    user = await users.query.where("id", userId).first()
  }
  
  return user!
}

export async function updateUserBalance(userId: string, amount: number) {
  await users.query
    .where("id", userId)
    .increment("balance", amount)
}
```

## File location

Namespaces are stored in the `src/namespaces/` directory:

```
src/
├── namespaces/
│   ├── utils.ts
│   ├── middlewares.ts
│   ├── constants.ts
│   ├── api.ts
│   └── embeds.ts
├── commands/
├── listeners/
└── ...
```

## Best practices

1. **Single responsibility**: Each namespace should have a clear purpose
2. **Descriptive names**: Use clear, descriptive namespace names
3. **Export explicitly**: Export only what needs to be shared
4. **Type everything**: Add proper TypeScript types to all exports
5. **Document complex functions**: Add JSDoc comments for complex utilities
6. **Avoid circular dependencies**: Be careful not to create circular imports between namespaces

```typescript
// Good: Well-documented namespace
// src/namespaces/time.ts

/**
 * Format a duration in milliseconds to a human-readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted string like "2h 30m 15s"
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000) % 60
  const minutes = Math.floor(ms / (1000 * 60)) % 60
  const hours = Math.floor(ms / (1000 * 60 * 60))
  
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0) parts.push(`${seconds}s`)
  
  return parts.join(" ") || "0s"
}
```
