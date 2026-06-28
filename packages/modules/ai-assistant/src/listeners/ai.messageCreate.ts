import env from "#core/env"
import { Listener } from "#core/listener"
import * as llm from "#modules/ai-assistant/namespaces/llm"
import * as procedures from "#modules/ai-assistant/namespaces/procedures"

const conversations = new Map<string, Parameters<typeof llm.chat>[0]>()

const SYSTEM_PROMPT = `You are an AI assistant embedded in a Discord bot built with bot.ts.
The bot owner is messaging you directly. Help them manage their bot and server.
Be concise. You can use tools to execute actions.`

export default new Listener({
  event: "messageCreate",
  description: "Handle DM-based AI conversation with bot owner",
  async run(message) {
    if (message.author.bot) return
    if (message.author.id !== env.BOT_OWNER) return
    if (!message.channel.isDMBased()) return

    if (!process.env.AI_API_KEY) return

    const userId = message.author.id

    if (message.content.toLowerCase() === "ai reset") {
      conversations.delete(userId)
      await message.reply("Conversation reset.")
      return
    }

    if (!conversations.has(userId)) {
      conversations.set(userId, [{ role: "system", content: SYSTEM_PROMPT }])
    }

    const messages = conversations.get(userId)!
    messages.push({ role: "user", content: message.content })

    await message.channel.sendTyping()

    try {
      const response = await llm.chatWithTools(
        messages,
        procedures.tools.filter((t) => t.function.name !== "ask_user"),
        async (name, args) => {
          await message.channel.send(
            `**Executing ${name}:** \`${JSON.stringify(args).slice(0, 200)}\``,
          )
          return await procedures.executeTool(name, args)
        },
      )

      messages.push({ role: "assistant", content: response })

      if (messages.length > 40) {
        messages.splice(1, 2)
      }

      if (response.length > 2000) {
        for (let i = 0; i < response.length; i += 2000) {
          await message.channel.send(response.slice(i, i + 2000))
        }
      } else {
        await message.reply(response)
      }
    } catch (error: any) {
      await message.reply(`Error: ${error.message}`)
    }
  },
})
