---
description: How to develop with bot.ts?
---

# Development

This page explains how to configure your local environment for developing with bot.ts.

## Local configuration

### Creating the .env file

Copy the `.env.example` file to `.env` at the root of your project:

```bash
cp .env.example .env
```

Then fill in the required values.

## Environment variables

### Required variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BOT_TOKEN` | Your Discord bot token. Found in the [Discord Developer Portal](https://discord.com/developers/applications) under the "Bot" tab. | `"MTIzNDU2Nzg5MDEy..."` |
| `BOT_PREFIX` | The prefix used for text commands. | `"!"` |
| `BOT_OWNER` | Your Discord user ID. | `"123456789012345678"` |
| `BOT_ID` | Your bot's application ID. Found in the Developer Portal under "General Information". | `"123456789012345678"` |
| `BOT_NAME` | The name of your bot. | `"my-discord-bot"` |
| `BOT_MODE` | The current running mode. | `"development"` |
| `RUNTIME` | The JavaScript runtime to use. | `"bun"` |
| `PACKAGE_MANAGER` | The package manager to use. | `"bun"` |

### BOT_MODE values

| Mode         | Description |
|--------------|-------------|
| `factory`    | Reserved for framework developers, mainly for open source contributors and the lead developer (GhomKrosmonaute). If you are developing a bot, you should usually choose `development` mode instead. |
| `test`       | Used for running tests. Skips some validations. |
| `development`| Development mode with verbose logging. |
| `production` | Production mode with optimized settings. |

### RUNTIME values

| Runtime | Description |
|---------|-------------|
| `node` | Node.js runtime (v22+) |
| `bun` | Bun runtime (recommended) |
| `deno` | Deno runtime |

### PACKAGE_MANAGER values

| Package Manager | Description |
|-----------------|-------------|
| `npm` | Node Package Manager |
| `yarn` | Yarn package manager |
| `pnpm` | pnpm package manager |
| `bun` | Bun package manager (recommended) |
| `deno` | Deno package manager |

### Optional variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BOT_GUILD` | Discord guild ID. If set, slash commands are registered to this guild only. | `"123456789012345678"` |
| `BOT_LOCALE` | Day.js locale for date formatting. Must be a valid Day.js locale key. | `"en"`, `"fr"`, `"de"` |
| `BOT_TIMEZONE` | IANA timezone for date/time operations. | `"Europe/Paris"`, `"America/New_York"` |

### Database variables (optional)

If you want to use the database feature, configure these variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host address. | `"localhost"` |
| `DB_PORT` | Database port number (0-65535). | `5432` |
| `DB_USER` | Database username. | - |
| `DB_PASSWORD` | Database password. | - |
| `DB_DATABASE` | Database name. | - |

{% hint style="info" %}
You should configure the database using the CLI: `bot config database`
{% endhint %}

## Example .env file

```env
# Required
BOT_TOKEN="your-bot-token-here"
BOT_PREFIX="!"
BOT_OWNER="123456789012345678"
BOT_ID="123456789012345678"
BOT_NAME="my-bot"
BOT_MODE="development"
RUNTIME="bun"
PACKAGE_MANAGER="bun"

# Optional - Development guild (for instant slash command updates)
BOT_GUILD="123456789012345678"

# Optional - Localization
BOT_LOCALE="en"
BOT_TIMEZONE="Europe/Paris"

# Optional - Database (PostgreSQL)
DB_HOST="localhost"
DB_PORT=5432
DB_USER="postgres"
DB_PASSWORD="your-password"
DB_DATABASE="my_bot_db"
```

## Custom environment variables

You can add custom environment variables by extending the schema in your `src/config.ts` file:

```typescript
import { z } from "zod"
import { Config } from "#all"

export const config = new Config({
  envSchema: z.object({
    MY_API_KEY: z.string(),
    MY_CUSTOM_VAR: z.string().optional(),
  }),
  // ... other config options
})
```

Your custom variables will then be type-safe and accessible via `env.MY_API_KEY` from `import env from "#core/env"`.

## Development workflow

### Starting the bot in development mode

```bash
# Using bun (recommended)
bun run start

# Or with watch mode (auto-restart on file changes)
bun run watch
```

### Hot reload

Use the watch command for automatic restarts when you modify source files:

```bash
bun run watch
```

This runs `bun run --watch src/index.ts` which watches for file changes and restarts the bot automatically.

### Testing

Run the test mode to validate your code:

```bash
bun run test
```

This command:
1. Formats the code with Biome
2. Type-checks with TypeScript (`tsc --noEmit`)
3. Runs the test entry point (`src/index.test.ts`)
