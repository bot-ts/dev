# Help

The `help` command is a native command that displays the list of available commands or the details of a specific command.

## Usage

```
!help
!help <command>
```

## Aliases

The help command can be invoked using any of these aliases:

- `help`
- `h`
- `usage`
- `detail`
- `details`

## Behavior

### Without arguments

When called without arguments, the help command displays a **paginated list** of all available commands. The paginator shows 10 commands per page and allows navigation using reaction buttons.

Only commands that the user has permission to use are displayed.

```
!help
```

### With a command name

When called with a command name as argument, the help command displays **detailed information** about that specific command, including:

- Command name and description
- Aliases
- Required permissions
- Cooldown information
- Available arguments (positional, options, flags, rest)
- Usage examples

```
!help ping
!h eval
```

## Example output

### Command list

```
Command list
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
!help - Help menu
!ping - Check bot latency
!info - Display bot information
...

!help <command>
```

### Command details

```
!ping
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Check bot latency

Aliases: p, pong
Cooldown: 5s (per user)
Channel: Guild only

No arguments required.
```

## Customization

You can customize the command details display by providing a `detailCommand` function in your `src/config.ts`:

```typescript
import { Config } from "#all"
import * as util from "#core/util"

export const config = new Config({
  detailCommand: async (message, command) => {
    // Return a custom SystemMessage
    return util.getSystemMessage("default", {
      header: `Command: ${command.options.name}`,
      body: command.options.description,
      footer: `Use ${message.usedPrefix}help for more commands`,
    })
  },
  // ... other options
})
```

The `detailCommand` function receives:
- `message`: The message that triggered the help command
- `command`: The command object being displayed

It must return a `SystemMessage` or `Promise<SystemMessage>`.

## Source code visibility

If the `openSource` option is enabled in your config, the help command will include a link to the command's source code on GitHub:

```typescript
export const config = new Config({
  openSource: true,
  // ... other options
})
```

## Native file

The help command is defined in `src/commands/help.native.ts`. If you want to modify it, remove the `.native` suffix from the filename to prevent it from being overwritten during framework updates.

{% hint style="info" %}
Native commands have the `.native.ts` suffix. To customize them, rename the file to remove `.native` (e.g., `help.ts`).
{% endhint %}
