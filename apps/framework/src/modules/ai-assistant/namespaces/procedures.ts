import { execSync } from "node:child_process"
import type OpenAI from "openai"

import client from "#core/client"
import database from "#core/database"

export const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "bash",
      description:
        "Execute a shell command on the deployment server. Returns stdout, stderr and exit code. Use for system administration, package management, file operations, etc.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The shell command to execute",
          },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sql",
      description:
        "Execute a raw SQL query on the bot's database. Use for data inspection, modifications, or schema exploration.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The SQL query to execute",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_guild_info",
      description: "Get information about a Discord guild the bot is in.",
      parameters: {
        type: "object",
        properties: {
          guild_id: {
            type: "string",
            description: "The guild ID. If omitted, lists all guilds.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_send",
      description: "Send a message to a Discord channel.",
      parameters: {
        type: "object",
        properties: {
          channel_id: {
            type: "string",
            description: "The channel ID to send the message to",
          },
          content: {
            type: "string",
            description: "The message content",
          },
        },
        required: ["channel_id", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ask_user",
      description:
        "Ask the bot owner a question and wait for their text response. Use when you need clarification or additional information.",
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "The question to ask the user",
          },
        },
        required: ["question"],
      },
    },
  },
]

export type PendingAction = {
  name: string
  args: Record<string, unknown>
  resolve: (result: string) => void
}

export const pendingActions = new Map<string, PendingAction>()

let actionCounter = 0

export function createPendingAction(
  name: string,
  args: Record<string, unknown>,
): { actionId: string; promise: Promise<string> } {
  const actionId = `ai-action-${++actionCounter}`
  let resolve!: (result: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  pendingActions.set(actionId, { name, args, resolve })
  return { actionId, promise }
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "bash":
      return executeBash(args.command as string)
    case "sql":
      return executeSql(args.query as string)
    case "discord_guild_info":
      return getGuildInfo(args.guild_id as string | undefined)
    case "discord_send":
      return sendMessage(args.channel_id as string, args.content as string)
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}

function executeBash(command: string): string {
  try {
    const stdout = execSync(command, {
      timeout: 30_000,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    })
    return JSON.stringify({
      stdout: stdout.slice(0, 4000),
      exitCode: 0,
    })
  } catch (error: any) {
    return JSON.stringify({
      stdout: (error.stdout ?? "").slice(0, 2000),
      stderr: (error.stderr ?? "").slice(0, 2000),
      exitCode: error.status ?? 1,
    })
  }
}

async function executeSql(query: string): Promise<string> {
  if (!database.client) {
    return JSON.stringify({ error: "No database configured" })
  }
  try {
    const result = await database.client.raw(query)
    const rows = Array.isArray(result) ? result.slice(0, 50) : result
    return JSON.stringify({ rows }).slice(0, 4000)
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}

async function getGuildInfo(guildId?: string): Promise<string> {
  if (!guildId) {
    const guilds = client.guilds.cache.map((g) => ({
      id: g.id,
      name: g.name,
      memberCount: g.memberCount,
    }))
    return JSON.stringify({ guilds })
  }
  const guild = client.guilds.cache.get(guildId)
  if (!guild) return JSON.stringify({ error: "Guild not found" })
  const channels = guild.channels.cache.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
  }))
  const roles = guild.roles.cache.map((r) => ({
    id: r.id,
    name: r.name,
    memberCount: r.members.size,
  }))
  return JSON.stringify({
    id: guild.id,
    name: guild.name,
    memberCount: guild.memberCount,
    channels: channels.slice(0, 50),
    roles: roles.slice(0, 50),
  })
}

async function sendMessage(
  channelId: string,
  content: string,
): Promise<string> {
  try {
    const channel = await client.channels.fetch(channelId)
    if (!channel?.isSendable())
      return JSON.stringify({ error: "Channel not found or not sendable" })
    const msg = await channel.send(content)
    return JSON.stringify({ success: true, messageId: msg.id })
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}
