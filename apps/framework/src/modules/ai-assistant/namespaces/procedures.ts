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
      name: "discord_get_user_info",
      description: "Get detailed information about a Discord user by ID.",
      parameters: {
        type: "object",
        properties: {
          user_id: {
            type: "string",
            description: "The unique Discord User ID to retrieve info for.",
          },
        },
        required: ["user_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_list_channels",
      description: "List all channels (text, voice, categories) in a guild.",
      parameters: {
        type: "object",
        properties: {
          guild_id: {
            type: "string",
            description:
              "The guild ID to list channels for. If omitted, lists channels across all guilds.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_list_roles",
      description:
        "List all roles in a specified guild, including permissions.",
      parameters: {
        type: "object",
        properties: {
          guild_id: {
            type: "string",
            description: "The guild ID to list roles for.",
          },
        },
        required: ["guild_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_list_members",
      description:
        "List or search members in a guild with their usernames, nicknames, and roles.",
      parameters: {
        type: "object",
        properties: {
          guild_id: {
            type: "string",
            description: "The guild ID to list members for.",
          },
          query: {
            type: "string",
            description:
              "Optional query to search for members by username or nickname.",
          },
          limit: {
            type: "number",
            description: "Maximum number of members to return (default: 50).",
          },
        },
        required: ["guild_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_create_channel",
      description:
        "Create a new text, voice, or category channel in a guild (requires confirmation).",
      parameters: {
        type: "object",
        properties: {
          guild_id: {
            type: "string",
            description: "The guild ID where the channel will be created.",
          },
          name: {
            type: "string",
            description: "The name of the new channel.",
          },
          type: {
            type: "string",
            enum: ["text", "voice", "category"],
            description: "The type of the channel (default: text).",
          },
          parent_id: {
            type: "string",
            description:
              "The parent category ID (if creating inside a category).",
          },
        },
        required: ["guild_id", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_delete_channel",
      description: "Delete a specified channel by ID (requires confirmation).",
      parameters: {
        type: "object",
        properties: {
          channel_id: {
            type: "string",
            description: "The ID of the channel to delete.",
          },
        },
        required: ["channel_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_manage_role",
      description:
        "Manage roles: create, delete, assign, or remove a role in a guild (requires confirmation).",
      parameters: {
        type: "object",
        properties: {
          guild_id: {
            type: "string",
            description: "The guild ID.",
          },
          action: {
            type: "string",
            enum: ["create", "delete", "assign", "remove"],
            description: "The action to perform.",
          },
          role_id: {
            type: "string",
            description:
              "The role ID (required for delete, assign, and remove actions).",
          },
          name: {
            type: "string",
            description: "The role name (used for create action).",
          },
          color: {
            type: "string",
            description:
              "Role hex color code, e.g. '#FF0000' (used for create action).",
          },
          user_id: {
            type: "string",
            description:
              "The user ID (required for assign and remove actions).",
          },
        },
        required: ["guild_id", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_kick_member",
      description: "Kick a member from a guild (requires confirmation).",
      parameters: {
        type: "object",
        properties: {
          guild_id: {
            type: "string",
            description: "The guild ID.",
          },
          user_id: {
            type: "string",
            description: "The user ID of the member to kick.",
          },
          reason: {
            type: "string",
            description: "Optional audit log reason for the kick.",
          },
        },
        required: ["guild_id", "user_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_ban_member",
      description: "Ban a member from a guild (requires confirmation).",
      parameters: {
        type: "object",
        properties: {
          guild_id: {
            type: "string",
            description: "The guild ID.",
          },
          user_id: {
            type: "string",
            description: "The user ID of the user to ban.",
          },
          reason: {
            type: "string",
            description: "Optional audit log reason for the ban.",
          },
          delete_message_seconds: {
            type: "number",
            description:
              "Optional duration of messages to delete from this user in seconds.",
          },
        },
        required: ["guild_id", "user_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_unban_member",
      description: "Unban a user from a guild (requires confirmation).",
      parameters: {
        type: "object",
        properties: {
          guild_id: {
            type: "string",
            description: "The guild ID.",
          },
          user_id: {
            type: "string",
            description: "The user ID of the user to unban.",
          },
        },
        required: ["guild_id", "user_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_get_channel_info",
      description:
        "Get detailed settings, permissions, topic, and type of a Discord channel by ID.",
      parameters: {
        type: "object",
        properties: {
          channel_id: {
            type: "string",
            description: "The unique Discord Channel ID.",
          },
        },
        required: ["channel_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_get_role_info",
      description:
        "Get detailed settings, permissions, and metadata of a Discord role by ID.",
      parameters: {
        type: "object",
        properties: {
          guild_id: {
            type: "string",
            description: "The guild ID.",
          },
          role_id: {
            type: "string",
            description: "The role ID to fetch info for.",
          },
        },
        required: ["guild_id", "role_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_edit_channel",
      description:
        "Edit channel settings like name, topic, slowmode, parent category, or permission overwrites (requires confirmation).",
      parameters: {
        type: "object",
        properties: {
          channel_id: {
            type: "string",
            description: "The unique Discord Channel ID.",
          },
          name: {
            type: "string",
            description: "New name of the channel.",
          },
          topic: {
            type: "string",
            description: "New topic of the channel.",
          },
          nsfw: {
            type: "boolean",
            description: "Whether the channel should be NSFW.",
          },
          slowmode: {
            type: "number",
            description: "The slowmode in seconds (0 to disable).",
          },
          parent_id: {
            type: "string",
            description: "The parent category channel ID.",
          },
          permission_overwrites: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description:
                    "The Role or User ID to set permission overwrites for.",
                },
                allow: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "Array of permission string names to allow (e.g. ['SendMessages', 'ViewChannel']).",
                },
                deny: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "Array of permission string names to deny (e.g. ['SendMessages', 'ViewChannel']).",
                },
              },
              required: ["id"],
            },
            description:
              "Optional array of permission overwrites to apply to the channel.",
          },
        },
        required: ["channel_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_edit_role",
      description:
        "Edit role settings like name, color, hoist status, mentionable status, or global permissions (requires confirmation).",
      parameters: {
        type: "object",
        properties: {
          guild_id: {
            type: "string",
            description: "The guild ID.",
          },
          role_id: {
            type: "string",
            description: "The role ID to edit.",
          },
          name: {
            type: "string",
            description: "New name of the role.",
          },
          color: {
            type: "string",
            description: "Hex color code, e.g. '#FF0000'.",
          },
          hoist: {
            type: "boolean",
            description:
              "Whether the role should be displayed separately in the member list.",
          },
          mentionable: {
            type: "boolean",
            description: "Whether the role should be mentionable by anyone.",
          },
          permissions: {
            type: "array",
            items: { type: "string" },
            description:
              "Array of permission string names to grant (e.g. ['SendMessages', 'ManageChannels', 'Administrator']). Other permissions will be disabled.",
          },
        },
        required: ["guild_id", "role_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_edit_guild",
      description:
        "Edit general Discord server/guild settings (requires confirmation).",
      parameters: {
        type: "object",
        properties: {
          guild_id: {
            type: "string",
            description: "The guild ID to edit.",
          },
          name: {
            type: "string",
            description: "New name of the server.",
          },
          verification_level: {
            type: "number",
            enum: [0, 1, 2, 3, 4],
            description:
              "Verification level (0: None, 1: Low, 2: Medium, 3: High, 4: Very High).",
          },
          default_notifications: {
            type: "number",
            enum: [0, 1],
            description:
              "Default message notification setting (0: All Messages, 1: Only @mentions).",
          },
          explicit_content_filter: {
            type: "number",
            enum: [0, 1, 2],
            description:
              "Explicit content filter (0: Disabled, 1: Members Without Roles, 2: All Members).",
          },
          system_channel_id: {
            type: "string",
            description:
              "ID of the channel where system messages are sent (e.g., welcome messages, boosts).",
          },
        },
        required: ["guild_id"],
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
    case "discord_get_user_info":
      return getUserInfo(args.user_id as string)
    case "discord_list_channels":
      return listChannels(args.guild_id as string | undefined)
    case "discord_list_roles":
      return listRoles(args.guild_id as string)
    case "discord_list_members":
      return listMembers(
        args.guild_id as string,
        args.query as string | undefined,
        args.limit as number | undefined,
      )
    case "discord_create_channel":
      return createChannel(
        args.guild_id as string,
        args.name as string,
        args.type as string | undefined,
        args.parent_id as string | undefined,
      )
    case "discord_delete_channel":
      return deleteChannel(args.channel_id as string)
    case "discord_manage_role":
      return manageRole(
        args.guild_id as string,
        args.action as string,
        args.role_id as string | undefined,
        args.name as string | undefined,
        args.color as string | undefined,
        args.user_id as string | undefined,
      )
    case "discord_kick_member":
      return kickMember(
        args.guild_id as string,
        args.user_id as string,
        args.reason as string | undefined,
      )
    case "discord_ban_member":
      return banMember(
        args.guild_id as string,
        args.user_id as string,
        args.reason as string | undefined,
        args.delete_message_seconds as number | undefined,
      )
    case "discord_unban_member":
      return unbanMember(args.guild_id as string, args.user_id as string)
    case "discord_get_channel_info":
      return getChannelInfo(args.channel_id as string)
    case "discord_get_role_info":
      return getRoleInfo(args.guild_id as string, args.role_id as string)
    case "discord_edit_channel":
      return editChannel(args.channel_id as string, args)
    case "discord_edit_role":
      return editRole(args.guild_id as string, args.role_id as string, args)
    case "discord_edit_guild":
      return editGuild(args.guild_id as string, args)
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

async function getUserInfo(userId: string): Promise<string> {
  try {
    const user = await client.users.fetch(userId)
    return JSON.stringify({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      tag: user.tag,
      bot: user.bot,
      avatarURL: user.displayAvatarURL(),
      createdAt: user.createdAt,
    })
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}

async function listChannels(guildId?: string): Promise<string> {
  try {
    const guilds = guildId
      ? [
          client.guilds.cache.get(guildId) ||
            (await client.guilds.fetch(guildId)),
        ]
      : Array.from(client.guilds.cache.values())
    const result: Record<string, any[]> = {}

    for (const guild of guilds) {
      if (!guild) continue
      const channels = await guild.channels.fetch()
      result[guild.name] = Array.from(channels.values()).map((c) => ({
        id: c?.id,
        name: c?.name,
        type: c?.type,
        parentId: c?.parentId || null,
      }))
    }
    return JSON.stringify(result).slice(0, 4000)
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}

async function listRoles(guildId: string): Promise<string> {
  try {
    const guild =
      client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId))
    if (!guild) return JSON.stringify({ error: "Guild not found" })
    const roles = await guild.roles.fetch()
    return JSON.stringify(
      Array.from(roles.values()).map((r) => ({
        id: r.id,
        name: r.name,
        color: r.hexColor,
        position: r.position,
        permissions: r.permissions.toArray(),
      })),
    ).slice(0, 4000)
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}

async function listMembers(
  guildId: string,
  query?: string,
  limit = 50,
): Promise<string> {
  try {
    const guild =
      client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId))
    if (!guild) return JSON.stringify({ error: "Guild not found" })
    const members = await guild.members.fetch({ query, limit })
    return JSON.stringify(
      Array.from(members.values()).map((m) => ({
        id: m.id,
        username: m.user.username,
        nickname: m.nickname,
        roles: m.roles.cache.map((r) => r.name),
        joinedAt: m.joinedAt,
      })),
    ).slice(0, 4000)
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}

async function createChannel(
  guildId: string,
  name: string,
  type?: string,
  parentId?: string,
): Promise<string> {
  try {
    const guild =
      client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId))
    if (!guild) return JSON.stringify({ error: "Guild not found" })

    let channelType = 0 // text
    if (type === "voice") channelType = 2
    else if (type === "category") channelType = 4

    const channel = (await guild.channels.create({
      name,
      type: channelType,
      parent: parentId,
    })) as any
    return JSON.stringify({
      success: true,
      channelId: channel.id,
      name: channel.name,
    })
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}

async function deleteChannel(channelId: string): Promise<string> {
  try {
    const channel = (client.channels.cache.get(channelId) ||
      (await client.channels.fetch(channelId))) as any
    if (!channel) return JSON.stringify({ error: "Channel not found" })
    await channel.delete()
    return JSON.stringify({
      success: true,
      message: `Channel ${channelId} deleted successfully`,
    })
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}

async function manageRole(
  guildId: string,
  action: string,
  roleId?: string,
  name?: string,
  color?: string,
  userId?: string,
): Promise<string> {
  try {
    const guild =
      client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId))
    if (!guild) return JSON.stringify({ error: "Guild not found" })

    switch (action) {
      case "create": {
        const role = await guild.roles.create({
          name: name || "new-role",
          color: (color as any) || undefined,
        })
        return JSON.stringify({
          success: true,
          roleId: role.id,
          name: role.name,
        })
      }
      case "delete": {
        if (!roleId)
          return JSON.stringify({ error: "role_id is required to delete" })
        const role = await guild.roles.fetch(roleId)
        if (!role) return JSON.stringify({ error: "Role not found" })
        await role.delete()
        return JSON.stringify({
          success: true,
          message: `Role ${roleId} deleted`,
        })
      }
      case "assign": {
        if (!roleId || !userId)
          return JSON.stringify({ error: "role_id and user_id are required" })
        const member = await guild.members.fetch(userId)
        await member.roles.add(roleId)
        return JSON.stringify({
          success: true,
          message: `Role ${roleId} assigned to user ${userId}`,
        })
      }
      case "remove": {
        if (!roleId || !userId)
          return JSON.stringify({ error: "role_id and user_id are required" })
        const member = await guild.members.fetch(userId)
        await member.roles.remove(roleId)
        return JSON.stringify({
          success: true,
          message: `Role ${roleId} removed from user ${userId}`,
        })
      }
      default:
        return JSON.stringify({ error: `Invalid action: ${action}` })
    }
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}

async function kickMember(
  guildId: string,
  userId: string,
  reason?: string,
): Promise<string> {
  try {
    const guild =
      client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId))
    if (!guild) return JSON.stringify({ error: "Guild not found" })
    const member = await guild.members.fetch(userId)
    await member.kick(reason)
    return JSON.stringify({ success: true, message: `Kicked user ${userId}` })
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}

async function banMember(
  guildId: string,
  userId: string,
  reason?: string,
  deleteMessageSeconds?: number,
): Promise<string> {
  try {
    const guild =
      client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId))
    if (!guild) return JSON.stringify({ error: "Guild not found" })
    const member = await guild.members.fetch(userId)
    await member.ban({ reason, deleteMessageSeconds })
    return JSON.stringify({ success: true, message: `Banned user ${userId}` })
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}

async function unbanMember(guildId: string, userId: string): Promise<string> {
  try {
    const guild =
      client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId))
    if (!guild) return JSON.stringify({ error: "Guild not found" })
    await guild.members.unban(userId)
    return JSON.stringify({ success: true, message: `Unbanned user ${userId}` })
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}

async function getChannelInfo(channelId: string): Promise<string> {
  try {
    const channel =
      client.channels.cache.get(channelId) ||
      (await client.channels.fetch(channelId))
    if (!channel) return JSON.stringify({ error: "Channel not found" })
    return JSON.stringify({
      id: channel.id,
      name: (channel as any).name,
      type: channel.type,
      topic: (channel as any).topic || null,
      nsfw: (channel as any).nsfw || false,
      slowmode: (channel as any).rateLimitPerUser || 0,
      parentId: (channel as any).parentId || null,
      permissionOverwrites:
        (channel as any).permissionOverwrites?.cache.map((o: any) => ({
          id: o.id,
          type: o.type, // 0 for role, 1 for member
          allow: o.allow.toArray(),
          deny: o.deny.toArray(),
        })) || [],
    })
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}

async function getRoleInfo(guildId: string, roleId: string): Promise<string> {
  try {
    const guild =
      client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId))
    if (!guild) return JSON.stringify({ error: "Guild not found" })
    const role = await guild.roles.fetch(roleId)
    if (!role) return JSON.stringify({ error: "Role not found" })
    return JSON.stringify({
      id: role.id,
      name: role.name,
      color: role.hexColor,
      hoist: role.hoist,
      mentionable: role.mentionable,
      position: role.position,
      permissions: role.permissions.toArray(),
    })
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}

async function editChannel(
  channelId: string,
  options: {
    name?: string
    topic?: string
    nsfw?: boolean
    slowmode?: number
    parent_id?: string
    permission_overwrites?: Array<{
      id: string
      allow?: string[]
      deny?: string[]
    }>
  },
): Promise<string> {
  try {
    const channel = (client.channels.cache.get(channelId) ||
      (await client.channels.fetch(channelId))) as any
    if (!channel) return JSON.stringify({ error: "Channel not found" })

    const updateObj: any = {}
    if (options.name !== undefined) updateObj.name = options.name
    if (options.topic !== undefined) updateObj.topic = options.topic
    if (options.nsfw !== undefined) updateObj.nsfw = options.nsfw
    if (options.slowmode !== undefined)
      updateObj.rateLimitPerUser = options.slowmode
    if (options.parent_id !== undefined) updateObj.parent = options.parent_id

    if (Object.keys(updateObj).length > 0) {
      await channel.edit(updateObj)
    }

    if (options.permission_overwrites) {
      for (const overwrite of options.permission_overwrites) {
        const allowObj: Record<string, boolean> = {}
        if (overwrite.allow) {
          for (const perm of overwrite.allow) {
            allowObj[perm] = true
          }
        }
        if (overwrite.deny) {
          for (const perm of overwrite.deny) {
            allowObj[perm] = false
          }
        }
        await channel.permissionOverwrites.edit(overwrite.id, allowObj)
      }
    }

    return JSON.stringify({
      success: true,
      message: `Channel ${channelId} updated successfully`,
    })
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}

async function editRole(
  guildId: string,
  roleId: string,
  options: {
    name?: string
    color?: string
    hoist?: boolean
    mentionable?: boolean
    permissions?: string[]
  },
): Promise<string> {
  try {
    const guild =
      client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId))
    if (!guild) return JSON.stringify({ error: "Guild not found" })
    const role = await guild.roles.fetch(roleId)
    if (!role) return JSON.stringify({ error: "Role not found" })

    const updateObj: any = {}
    if (options.name !== undefined) updateObj.name = options.name
    if (options.color !== undefined) updateObj.color = options.color
    if (options.hoist !== undefined) updateObj.hoist = options.hoist
    if (options.mentionable !== undefined)
      updateObj.mentionable = options.mentionable
    if (options.permissions !== undefined)
      updateObj.permissions = options.permissions

    await role.edit(updateObj)
    return JSON.stringify({
      success: true,
      message: `Role ${roleId} updated successfully`,
    })
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}

async function editGuild(
  guildId: string,
  options: {
    name?: string
    verification_level?: number
    default_notifications?: number
    explicit_content_filter?: number
    system_channel_id?: string
  },
): Promise<string> {
  try {
    const guild =
      client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId))
    if (!guild) return JSON.stringify({ error: "Guild not found" })

    const updateObj: any = {}
    if (options.name !== undefined) updateObj.name = options.name
    if (options.verification_level !== undefined)
      updateObj.verificationLevel = options.verification_level
    if (options.default_notifications !== undefined)
      updateObj.defaultMessageNotifications = options.default_notifications
    if (options.explicit_content_filter !== undefined)
      updateObj.explicitContentFilter = options.explicit_content_filter
    if (options.system_channel_id !== undefined)
      updateObj.systemChannelId = options.system_channel_id

    await guild.edit(updateObj)
    return JSON.stringify({
      success: true,
      message: `Guild ${guildId} updated successfully`,
    })
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}
