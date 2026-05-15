Create a new module for this bot.ts project.

A module is a self-contained feature folder under `src/modules/<name>/` that can contain any combination of bot.ts elements. Only modules enabled in `modules.json` (project root) are loaded at boot.

The user will provide: module name, description, and which element types to include.

If the user hasn't provided details, ask for:
1. Module name (kebab-case, e.g. `leveling`, `moderation`, `economy`)
2. Short description of the module's purpose
3. Which element types to include (commands, slash, buttons, listeners, cron, tables, namespaces)
4. Any npm dependencies needed

Then create the module directory structure at `src/modules/<name>/` with only the requested element subdirectories.

### Module structure

```
src/modules/<name>/
├── module.json       # Dependencies and metadata
├── README.md         # Documentation (optional)
├── *.ts              # Root files — exports auto-dispatched by element type
├── commands/         # Textual commands (optional)
├── slash/            # Slash commands (optional)
├── buttons/          # Button handlers (optional)
├── listeners/        # Event listeners (optional)
├── cron/             # Cron jobs (optional)
├── tables/           # Database tables (optional)
└── namespaces/       # Shared utilities (optional)
```

### Rules

- Module name must be kebab-case
- Only create subdirectories the user actually needs
- Files inside follow the **exact same patterns** as their top-level counterparts
- Each element file uses `export default new X({...})` pattern
- Use `#modules/<name>/namespaces/<file>` to import module-internal utilities
- The module is auto-added as enabled in `modules.json`
- Listener files still follow `category.event.ts` naming convention

### Root files

TypeScript files at the module root are imported and all exports with a `type` property are dispatched to the correct handler. This lets you group related elements in one file instead of using subdirectories:

```typescript
// src/modules/my-module/setup.ts
import { SlashCommand } from "#core/slash"
import { Listener } from "#core/listener"

export const myCommand = new SlashCommand({ ... })
export const myListener = new Listener({ ... })
```

### module.json

Always create a `module.json` with at least name and description:

```json
{
  "name": "my-module",
  "description": "What this module does",
  "dependencies": {}
}
```

### Example: creating a "leveling" module with commands, tables and listeners

```
src/modules/leveling/
├── commands/
│   └── rank.ts
├── tables/
│   └── xp.ts
└── listeners/
    └── xp.messageCreate.ts
```

`src/modules/leveling/tables/xp.ts`:
```typescript
import { Table } from "@ghom/orm"

export default new Table({
  name: "xp",
  description: "User XP and levels",
  columns: (col) => ({
    id: col.increments(),
    user_id: col.string(),
    guild_id: col.string(),
    xp: col.integer().defaultTo(0),
    level: col.integer().defaultTo(0),
  }),
})
```

`src/modules/leveling/commands/rank.ts`:
```typescript
import { Command } from "#core/command"

export default new Command({
  name: "rank",
  description: "Show your current level",
  channelType: "guild",
  async run(message) {
    await message.channel.send(`Rank for ${message.author}`)
  },
})
```

`src/modules/leveling/listeners/xp.messageCreate.ts`:
```typescript
import { Listener } from "#core/listener"

export default new Listener({
  event: "messageCreate",
  description: "Grant XP on message",
  async run(message) {
    if (message.author.bot) return
    // todo: add XP logic
  },
})
```

After creating the module, remind the user that:
- The module is auto-added to `modules.json` under `modules` as enabled
- They can run `bun run format` to format all files
- Use `bot module disable` to disable or `bot module remove` to delete
- See `src/modules/example/` for a reference module, `src/modules/ai-assistant/` for a full-featured one
