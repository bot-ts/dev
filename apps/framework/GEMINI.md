# Gemini AI Assistant Instructions — bot.ts Client Bot Framework

Welcome to the **bot.ts** client bot skeleton! This project was generated from the `apps/framework/` template and is the standard runtime environment for bot.ts bots.

---

## 1. Project Creation & Setup Flow

When a developer runs `bot new`, the CLI executes a structured process to copy, configure, and initialize the project:

```
[User runs "bot new"]
        │
        ▼
[CLI copies apps/framework template folder]
        │
        ▼
[CLI prompts for setup selections] (Prefix, databaseAgent, runtime, packageManager...)
        │
        ▼
[CLI compiles EJS templates]
        ├──> tsconfig.json        (Tailored compiler rules and path mappings)
        ├──> package.json         (Tailored project scripts and package managers)
        └──> src/core/database.ts (Tailored connection parameters via database.ejs)
        │
        ▼
[CLI injects custom variables into local .env]
```

---

## 2. Runtime Bootstrapping Flow

The following diagram represents how a bot.ts project boots up, validating the environment, configuring the ORM via late-binding, and loading elements:

```
[Start the bot] (e.g., bun run src/index.ts)
        │
        ▼
[Evaluates src/index.ts]
        │
        ▼
[Evaluates static imports] ──> Loads `@ghom/bot.ts-core` from node_modules
                                   │
                                   ▼
                           [Evaluates core/env.ts]
                                   │
                                   ├── If BOT_MODE !== "test" ──> Validates .env via Zod
                                   └── If BOT_MODE === "test" ──> Bypasses environment checks
                                   │
                                   ▼
                           [Evaluates src/core/database.ts] (User-land)
                                   │
                                   ▼
                           [Executes database.connect(config)] (Late-binds ORM connection)
                                   │
                                   ▼
                           [Evaluates src/index.ts body]
                                   ├── Loads moduleHandler.init()
                                   │       └── Discovers modules in src/modules/
                                   │       └── Scans flat local directories
                                   │       └── Registers components dynamically
                                   └── Logs in to Discord client
```

---

## 3. Project File Structure

```
src/
├── index.ts              # Bootstrap — initializes all handlers then logs in
├── config.ts             # Discord.js client config + env schema (Zod)
├── types.ts              # Custom type resolvers for textual commands
├── core/                 # User-land core configurations (EJS generated)
│   └── database.ts       # Connected ORM client (late-binds connection on boot)
├── commands/             # Textual (prefix) commands  — *.ts or *.native.ts
├── slash/                # Slash commands             — *.ts or *.native.ts
├── listeners/            # Discord event listeners    — category.event.ts
├── buttons/              # Button interaction handlers
├── cron/                 # Scheduled cron jobs
├── tables/               # Database table definitions
├── namespaces/           # Shared utilities / middlewares
└── modules/              # Self-contained feature modules (see Modules section)
```

### Path aliases (tsconfig + package.json `imports`)

| Alias | Resolves to |
|---|---|
| `#core/database`| `src/core/database.ts` (in user-land!) |
| `#core/*` | `node_modules/@ghom/bot.ts-core/src/*` (in @ghom/bot.ts-core!) |
| `#config` | `src/config.ts` |
| `#types` | `src/types.ts` |
| `#tables/*` | `src/tables/*` |
| `#buttons/*` | `src/buttons/*` |
| `#namespaces/*` | `src/namespaces/*` |
| `#modules/*` | `src/modules/*` |
| `#all` | re-exports everything from `@ghom/bot.ts-core` |

---

## 4. Code Style & Rules

This project uses **Biome** for formatting and linting. Always follow these rules:

- **Indentation**: tabs (not spaces)
- **Semicolons**: none (no-semi)
- **Quotes**: double quotes `""`
- **Import order**: organized by Biome (run `bun run format`)
- **No `any`**: `no-explicit-any` is strictly enforced.
- **No `ignoreDeprecations` / `baseUrl`**: Use modern TypeScript 5.0+ relative path resolutions without deprecated options.
- **Bypass strict generic construct signatures**: When using `createHandler` factory, pass the target element interface as the explicit generic (e.g., `createHandler<ISlashCommand>`) to avoid type mismatches with discord.js.

Run `bun run format` after any edits.

---

## 5. Custom Modules: Publishing & Installation Conventions

To keep development clean while ensuring perfect compatibility with the framework's simple module scanner, we enforce a **dual-layout** convention for custom modules.

### Development & Publishing Layout (Clean package)
When a custom module is developed or published to NPM, it follows a standard compile-safe package structure. All code/component folders (`commands/`, `slash/`, etc.) reside inside a `src/` directory, and it contains its own `tsconfig.json` extending the main project configuration:

```
packages/modules/my-module/ (published npm package root)
├── package.json         # Package configuration for NPM publishing
├── module.json          # Module metadata for the bot.ts framework
├── tsconfig.json        # TypeScript configuration extending ../../../tsconfig.json
├── README.md            # Documentation
└── src/                 # Development source folder
    ├── commands/        # Module commands (optional)
    ├── slash/           # Module slash commands (optional)
    └── namespaces/      # Module namespaces/helpers (optional)
```

### Installation Layout (Flat local directory)
When a developer runs `bot module install <packageName>`, the CLI automatically **unpacks the published `src/` directory directly into the local module root** (`src/modules/<name>/`). 

This keeps the local installed module flat and fully compliant with the framework's simple module scanner:

```
src/modules/my-module/ (local installed module root)
├── package.json         # Copied to local root (contains version and dependencies)
├── module.json          # Copied to local root (contains manifest metadata)
├── README.md            # Copied to local root (documentation)
├── commands/            # Extracted directly from package/src/commands/
├── slash/               # Extracted directly from package/src/slash/
└── namespaces/          # Extracted directly from package/src/namespaces/
```

**Crucial Rule**: When writing code inside `bot.ts-cli`'s module installer or updater, always use the unified `unpackNpmModule` helper function to automate this mapping cleanly!

---

## 6. Late-Binding Database Connection

* The database configuration file `src/core/database.ts` is in user-land and is dynamically generated by the CLI using `database.ejs`.
* To support modular, npm-installable core designs, the database client is declared as a static instance in the `@ghom/bot.ts-core` package, but its real SQL client is bound dynamically at runtime:
  ```typescript
  import { database } from "@ghom/bot.ts-core"

  database.connect({
    tableLocation: util.srcPath("tables"),
    database: {
      client: "sqlite3",
      connection: { filename: "./data/sqlite3.db" }
    }
  })
  ```
* This late-binding connect mechanism allows system handlers to safely register tables during bootstrapping even before the database connection is active.
