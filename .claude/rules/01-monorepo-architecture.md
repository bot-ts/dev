# Domain 1: Monorepo Architecture

This project is structured as a Monorepo containing several distinct projects managed as Bun Workspaces.

## 1. Workspaces Configuration

Workspace packages are registered in the root `package.json`:
```json
  "workspaces": [
    "apps/*",
    "packages/*",
    "packages/modules/*"
  ]
```

### Directives & Dependencies Linking:
- Inter-package dependencies inside the monorepo **MUST** be defined using the `"workspace:*"` version protocol (e.g. `"@ghom/bot.ts-core": "workspace:*"`).
- After adding or modifying packages or dependency declarations, always execute `bun install` at the monorepo root to link packages and regenerate lockfiles.

## 2. Directory Layout & Roles

- **`apps/framework`** (`@ghom/bot.ts`):
  - **Role**: Client bot template skeleton copied by `bot new` to initialize user bots. It contains user-land configs (`src/config.ts`), custom types, and element directories (`src/commands/`, `src/listeners/`, etc.).
  * **Constraints**: Must never contain `src/core` anymore. All core system files reside in `@ghom/bot.ts-core`.
  
- **`packages/core`** (`@ghom/bot.ts-core`):
  - **Role**: The foundational bootstrap code, lifecycle handlers, and base classes (Command, Listener, etc.) extracted from the framework.
  
- **`packages/cli`** (`@ghom/bot.ts-cli`):
  - **Role**: Scaffolder and modules manager.
  
- **`packages/orm`** (`@ghom/orm`):
  - **Role**: Custom database Knex wrapper supporting late-binding connection (`connect(config)`).

- **`packages/modules/`**:
  - **Role**: Official, publishable NPM-ready feature modules (like `ai-assistant`).
