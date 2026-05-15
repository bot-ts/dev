import * as discord from "discord.js"

import { SlashCommand } from "#core/slash"
import aiCancelButton from "#modules/ai-assistant/buttons/ai-cancel"
import aiConfirmButton from "#modules/ai-assistant/buttons/ai-confirm"
import * as llm from "#modules/ai-assistant/namespaces/llm"
import * as procedures from "#modules/ai-assistant/namespaces/procedures"

const DANGEROUS_TOOLS = new Set(["bash", "sql"])

const SYSTEM_PROMPT = `You are an AI assistant integrated into a Discord bot built with bot.ts framework.
You help the bot owner manage their bot, server, and database.

Available capabilities:
- Execute shell commands on the deployment server (bash)
- Run SQL queries on the bot's database (sql)
- Get Discord guild information (discord_guild_info)
- Send messages to Discord channels (discord_send)
- Ask the user for clarification (ask_user)

Rules:
- Be concise in your responses.
- For dangerous operations (bash, sql), explain what you're about to do.
- Always prefer read operations before write operations.
- Never execute destructive commands without confirming the intent.`

export default new SlashCommand({
  name: "ai",
  description: "Give an instruction to the AI assistant",
  botOwnerOnly: true,
  build(builder) {
    builder.addStringOption((opt) =>
      opt
        .setName("instruction")
        .setDescription("The instruction for the AI")
        .setRequired(true),
    )
  },
  async run(interaction) {
    const instruction = interaction.options.getString("instruction", true)

    await interaction.deferReply()

    const messages: Parameters<typeof llm.chat>[0] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: instruction },
    ]

    try {
      const response = await llm.chatWithTools(
        messages,
        procedures.tools,
        async (name, args) => {
          if (name === "ask_user") {
            return await handleAskUser(interaction, args.question as string)
          }

          if (DANGEROUS_TOOLS.has(name)) {
            return await handleDangerousTool(interaction, name, args)
          }

          return await procedures.executeTool(name, args)
        },
      )

      if (response.length > 2000) {
        await interaction.editReply({
          content: `${response.slice(0, 1997)}...`,
        })
      } else {
        await interaction.editReply({ content: response })
      }
    } catch (error: any) {
      await interaction.editReply({
        content: `Error: ${error.message}`,
      })
    }
  },
})

async function handleDangerousTool(
  interaction: discord.ChatInputCommandInteraction,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const preview =
    name === "bash"
      ? `\`\`\`sh\n${args.command}\n\`\`\``
      : `\`\`\`sql\n${args.query}\n\`\`\``

  const { actionId, promise } = procedures.createPendingAction(name, args)

  const row =
    new discord.ActionRowBuilder<discord.ButtonBuilder>().addComponents(
      aiConfirmButton.create({ actionId }),
      aiCancelButton.create({ actionId }),
    )

  await interaction.followUp({
    content: `**AI wants to execute ${name}:**\n${preview}`,
    components: [row],
  })

  return promise
}

async function handleAskUser(
  interaction: discord.ChatInputCommandInteraction,
  question: string,
): Promise<string> {
  const msg = await interaction.followUp({
    content: `**AI asks:** ${question}`,
  })

  try {
    const channel = msg.channel
    if (!channel || !("awaitMessages" in channel)) {
      return "Cannot await messages in this channel type."
    }

    const collected = await channel.awaitMessages({
      filter: (m: any) => m.author.id === interaction.user.id,
      max: 1,
      time: 120_000,
    })

    const reply = collected.first()
    return reply?.content ?? "No response from user."
  } catch {
    return "User did not respond in time."
  }
}
