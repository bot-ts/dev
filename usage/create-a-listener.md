# Listener

Listeners allow you to react to Discord events such as messages, reactions, member joins, and more. bot.ts provides a simple and type-safe way to create event listeners.

## Create a listener

Like commands, it is recommended to use the [CLI](https://www.npmjs.com/package/@ghom/bot.ts-cli) to correctly generate the body of the listener.

### CLI pattern

```bash
bot add listener
```

The CLI will prompt you for:
1. The event name (e.g., `messageCreate`, `guildMemberAdd`)
2. A category/name for the listener
3. A description

## Listener structure

A listener file exports a default instance of `Listener`. Here's the complete structure:

```typescript
import { Listener } from "#core/listener"

export default new Listener({
  event: "messageCreate",        // Required: Discord.js event name
  description: "Log all messages", // Required: Description for logging
  once: false,                   // Optional: Run only once (default: false)
  async run(message) {           // Required: Handler function
    console.log(`${message.author.tag}: ${message.content}`)
  },
})
```

### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `event` | `string` | Yes | The Discord.js event name to listen to |
| `description` | `string` | Yes | A description of what the listener does (used in logs) |
| `once` | `boolean` | No | If `true`, the listener is removed after the first trigger. Default: `false` |
| `run` | `function` | Yes | The async function to execute when the event fires |

## File naming convention

Listeners follow a specific naming convention:

```
category.eventName.ts
category.eventName.native.ts
```

Examples:
- `log.afterReady.native.ts` - Native listener for the `afterReady` event
- `welcome.guildMemberAdd.ts` - Custom listener for member joins
- `moderation.messageDelete.ts` - Custom listener for deleted messages

{% hint style="info" %}
The **category** is extracted from the filename and displayed in the logs for easier debugging.
{% endhint %}

## Examples

### Basic listener - Log when bot is ready

```typescript
import { Listener } from "#core/listener"
import logger from "#core/logger"

export default new Listener({
  event: "afterReady",
  description: "Log that the bot is ready",
  once: true,
  async run(client) {
    logger.success(`Logged in as ${client.user.tag}!`)
  },
})
```

### Welcome new members

```typescript
import { Listener } from "#core/listener"

export default new Listener({
  event: "guildMemberAdd",
  description: "Welcome new members",
  async run(member) {
    const channel = member.guild.systemChannel
    if (channel) {
      await channel.send(`Welcome to the server, ${member}!`)
    }
  },
})
```

### Log deleted messages

```typescript
import { Listener } from "#core/listener"
import logger from "#core/logger"

export default new Listener({
  event: "messageDelete",
  description: "Log deleted messages",
  async run(message) {
    if (message.author?.bot) return
    
    logger.log(
      `Message deleted in #${message.channel}: "${message.content}"`
    )
  },
})
```

### Handle raw gateway events

```typescript
import { Listener } from "#core/listener"

export default new Listener({
  event: "raw",
  description: "Handle raw gateway packets",
  async run(packet) {
    // packet is of type GatewayDispatchPayload
    if (packet.t === "MESSAGE_REACTION_ADD") {
      console.log("Raw reaction received:", packet.d)
    }
  },
})
```

## Additional events

For the proper functioning of the framework, some additional events have been added beyond the standard Discord.js events:

```typescript
interface MoreClientEvents {
  /** Raw gateway packets with proper typing */
  raw: [packet: GatewayDispatchPayload]

  /** Called after ALL "ready" listeners have completed */
  afterReady: [Client<true>]
}
```

### afterReady event

The `afterReady` event is particularly useful because it fires **after** all `clientReady` listeners have finished executing. This ensures that any initialization in other ready listeners is complete before your code runs.

```typescript
import { Listener } from "#core/listener"

export default new Listener({
  event: "afterReady",
  description: "Run after all ready listeners",
  once: true,
  async run(client) {
    // All other ready listeners have completed
    // Safe to perform post-initialization tasks
  },
})
```

## Error handling

Errors thrown inside listeners are automatically caught and logged by the framework. You don't need to wrap your code in try-catch blocks unless you want custom error handling:

```typescript
import { Listener } from "#core/listener"

export default new Listener({
  event: "messageCreate",
  description: "Process messages",
  async run(message) {
    // If this throws, the error is caught and logged automatically
    await processMessage(message)
  },
})
```

## Native vs Custom listeners

### Native listeners (`.native.ts`)

Native listeners are part of the framework core and handle essential functionality:

| File | Event | Purpose |
|------|-------|---------|
| `command.messageCreate.native.ts` | `messageCreate` | Process text commands |
| `slash.interactionCreate.native.ts` | `interactionCreate` | Process slash commands |
| `button.interactionCreate.native.ts` | `interactionCreate` | Process button clicks |
| `slash.ready.native.ts` | `clientReady` | Register slash commands |
| `slash.guildCreate.native.ts` | `guildCreate` | Register slash commands on new guilds |
| `cron.ready.native.ts` | `clientReady` | Start cron jobs |
| `log.afterReady.native.ts` | `afterReady` | Log bot ready status |
| `pagination.messageDelete.native.ts` | `messageDelete` | Clean up paginators |
| `pagination.messageReactionAdd.native.ts` | `messageReactionAdd` | Handle paginator reactions |

{% hint style="warning" %}
Do not modify native listener files directly. To customize them, copy the file and remove the `.native` suffix.
{% endhint %}

### Custom listeners

Create your own listeners in `src/listeners/` with any category name:

```
src/listeners/
├── command.messageCreate.native.ts   # Native (don't modify)
├── welcome.guildMemberAdd.ts         # Custom
├── modlog.messageDelete.ts           # Custom
└── stats.voiceStateUpdate.ts         # Custom
```

## Common Discord.js events

| Event | Description | Arguments |
|-------|-------------|-----------|
| `messageCreate` | A message was sent | `message` |
| `messageDelete` | A message was deleted | `message` |
| `messageUpdate` | A message was edited | `oldMessage, newMessage` |
| `guildMemberAdd` | A member joined a guild | `member` |
| `guildMemberRemove` | A member left a guild | `member` |
| `interactionCreate` | An interaction was created | `interaction` |
| `voiceStateUpdate` | Voice state changed | `oldState, newState` |
| `guildCreate` | Bot joined a guild | `guild` |
| `guildDelete` | Bot left a guild | `guild` |
| `clientReady` | Bot is ready | `client` |

For a complete list of events, see the [Discord.js documentation](https://discord.js.org/docs/packages/discord.js/main/Client:Class#events).
