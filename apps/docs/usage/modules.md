# Modules

A module is a self-contained feature folder that groups related bot elements together. Modules are auto-discovered at boot and their elements are loaded alongside the top-level ones.

## Structure

```
src/modules/<name>/
├── module.json         # Module metadata and dependencies
├── README.md           # Module documentation (optional)
├── *.ts                # Root files — exports dispatched by element type
├── commands/           # Textual commands
├── slash/              # Slash commands
├── buttons/            # Button handlers
├── listeners/          # Event listeners (category.event.ts)
├── cron/               # Cron jobs
├── tables/             # Database tables
└── namespaces/         # Shared utilities
```

Every subdirectory is optional — only include what the module needs.

## Managing modules

Modules are toggled in `modules.json` at the project root:

```json
{
  "keepDependencies": [],
  "modules": {
    "my-module": true,
    "disabled-module": false
  }
}
```

Use the CLI to manage them:

```bash
bot module install   # install from npm, git, or local path
bot module enable    # enable a disabled module
bot module disable   # disable without deleting
bot module remove    # permanently delete a module
```

## Creating a module

### 1. Create the folder

```
src/modules/my-module/
```

### 2. Add a `module.json`

```json
{
  "name": "my-module",
  "description": "What this module does",
  "dependencies": {
    "some-package": "^1.0.0"
  }
}
```

The CLI reads this when enabling the module and installs any missing dependencies automatically.

### 3. Add elements

Elements inside a module follow the exact same patterns as their top-level counterparts.

{% tabs %}
{% tab title="Command" %}

```typescript
// src/modules/my-module/commands/greet.ts
import { Command } from "#core/command"

export default new Command({
  name: "greet",
  description: "Greet someone",
  channelType: "all",
  async run(message) {
    await message.channel.send("Hello from my-module!")
  },
})
```

{% endtab %}
{% tab title="Slash" %}

```typescript
// src/modules/my-module/slash/greet.ts
import { SlashCommand } from "#core/slash"

export default new SlashCommand({
  name: "greet",
  description: "Greet someone",
  async run(interaction) {
    await interaction.reply("Hello from my-module!")
  },
})
```

{% endtab %}
{% tab title="Listener" %}

```typescript
// src/modules/my-module/listeners/greet.messageCreate.ts
import { Listener } from "#core/listener"

export default new Listener({
  event: "messageCreate",
  description: "React to a specific message",
  async run(message) {
    if (message.content === "!ping") {
      await message.reply("pong!")
    }
  },
})
```

{% endtab %}
{% tab title="Cron" %}

```typescript
// src/modules/my-module/cron/reminder.ts
import { Cron } from "#core/cron"

export default new Cron({
  name: "reminder",
  description: "Daily reminder",
  schedule: "daily",
  async run() {
    // scheduled task
  },
})
```

{% endtab %}
{% endtabs %}

## Root files

TypeScript files placed directly in the module root (not in subdirectories) are automatically imported. All their exports are inspected and dispatched to the correct handler based on each element's `type` property. This lets you group related elements in a single file:

```typescript
// src/modules/my-module/index.ts
import { SlashCommand } from "#core/slash"
import { Listener } from "#core/listener"

export const greetCommand = new SlashCommand({
  name: "greet",
  description: "Greet someone",
  async run(interaction) {
    await interaction.reply("Hello!")
  },
})

export const joinListener = new Listener({
  event: "guildMemberAdd",
  description: "Welcome new members",
  async run(member) {
    await member.guild.systemChannel?.send(`Welcome ${member}!`)
  },
})
```

Non-element exports (plain objects, functions, types) are silently ignored.

## Namespaces in modules

Namespaces inside a module are accessible via the `#modules/*` path alias:

```typescript
import { myHelper } from "#modules/my-module/namespaces/helpers"
```

{% hint style="info" %}
Unlike top-level namespaces, module namespaces do not need to be registered manually in `package.json`. The `#modules/*` alias covers them automatically.
{% endhint %}

## Installing a module from npm

Modules can be published to npm and installed via the CLI:

```bash
bot module install
```

The CLI will ask for the source (npm package name, git URL, or local path), copy the module into `src/modules/`, and install its dependencies.
