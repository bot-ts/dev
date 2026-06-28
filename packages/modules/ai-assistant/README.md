# ai-assistant

AI-powered assistant module for bot.ts. Lets the bot owner interact with an LLM that can execute shell commands, run SQL queries, inspect Discord guilds, and send messages — all from within Discord.

## Features

- `/ai <instruction>` slash command (bot owner only)
- DM-based conversational AI (send a DM to the bot)
- Tool calling with confirmation for dangerous actions (bash, SQL)
- Supports any OpenAI-compatible API (OpenAI, Anthropic, Groq, Mistral, Ollama, etc.)

## Setup

### 1. Install dependencies

The module requires the `openai` npm package. Install it with your package manager:

```bash
bun add openai
# or: npm install openai
```

### 2. Configure environment variables

Add these variables to your `.env` file:

```env
# Required: your LLM provider API key
AI_API_KEY="sk-..."

# Optional: model to use (default: gpt-4o)
AI_MODEL="gpt-4o"

# Optional: custom API base URL for alternative providers
# OpenAI (default):   https://api.openai.com/v1
# Anthropic:          https://api.anthropic.com/v1
# Groq:               https://api.groq.com/openai/v1
# Ollama (local):     http://localhost:11434/v1
AI_BASE_URL=""
```

### 3. Enable the module

The module is enabled by default. To toggle it:

```bash
bot module enable    # enable it
bot module disable   # disable it
```

Or edit `modules.json` at the project root:

```json
{
  "ai-assistant": true
}
```

## Usage

### Slash command

Use `/ai` followed by your instruction:

```
/ai list all guilds the bot is in
/ai show me the last 5 rows from the users table
/ai restart the bot process
/ai send a welcome message to channel #general
```

Dangerous actions (bash commands, SQL queries) require confirmation via buttons before execution.

### DM conversation

Send a direct message to the bot. The AI maintains a conversation history per user (bot owner only). Send `ai reset` to clear the conversation.

## Available tools

| Tool | Description | Confirmation required |
|---|---|---|
| `bash` | Execute a shell command on the server | Yes |
| `sql` | Run a raw SQL query on the database | Yes |
| `discord_guild_info` | Get guild/channel/role list information | No |
| `discord_send` | Send a message to a channel | No |
| `discord_get_user_info` | Get detailed user information by ID | No |
| `discord_list_channels` | List all channels (text, voice, category) in a guild | No |
| `discord_list_roles` | List all roles in a guild with permissions | No |
| `discord_list_members` | List or search members in a guild with query support | No |
| `discord_get_channel_info`| Get detailed settings, topic, type, and permission overwrites of a channel | No |
| `discord_get_role_info` | Get detailed settings, hoist, position, and permission names of a role | No |
| `discord_create_channel`| Create a text, voice, or category channel in a guild | Yes |
| `discord_delete_channel`| Delete a channel by ID | Yes |
| `discord_edit_channel` | Edit channel settings, topic, NSFW, slowmode, parent category, or permission overwrites | Yes |
| `discord_manage_role` | Create, delete, assign, or remove roles in a guild | Yes |
| `discord_edit_role` | Edit role settings, color, hoist, mentionable status, or permissions | Yes |
| `discord_kick_member` | Kick a member from a guild | Yes |
| `discord_ban_member` | Ban a member from a guild | Yes |
| `discord_unban_member` | Unban a user from a guild | Yes |
| `discord_edit_guild` | Edit general server name, verification, explicit content filter, system channel | Yes |
| `ask_user` | Ask the bot owner a follow-up question | No |

## Disabling

To disable the module without removing it:

```bash
bot module disable
```

To remove it entirely:

```bash
bot module remove
```
