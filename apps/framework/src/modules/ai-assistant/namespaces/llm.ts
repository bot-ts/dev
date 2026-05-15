import OpenAI from "openai"

let _client: OpenAI | null = null

export function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.AI_API_KEY
    if (!apiKey) {
      throw new Error(
        "AI_API_KEY is not set. Configure it in your .env file to use the ai-assistant module.",
      )
    }
    _client = new OpenAI({
      apiKey,
      baseURL: process.env.AI_BASE_URL || undefined,
    })
  }
  return _client
}

export function getModel(): string {
  return process.env.AI_MODEL ?? "gpt-4o"
}

export async function chat(
  messages: OpenAI.ChatCompletionMessageParam[],
  options?: {
    model?: string
    tools?: OpenAI.ChatCompletionTool[]
    temperature?: number
  },
): Promise<OpenAI.ChatCompletion> {
  return getClient().chat.completions.create({
    model: options?.model ?? getModel(),
    messages,
    tools: options?.tools,
    temperature: options?.temperature ?? 0.7,
  })
}

export async function chatWithTools(
  messages: OpenAI.ChatCompletionMessageParam[],
  tools: OpenAI.ChatCompletionTool[],
  executeTool: (name: string, args: Record<string, unknown>) => Promise<string>,
  options?: {
    model?: string
    maxIterations?: number
  },
): Promise<string> {
  const maxIterations = options?.maxIterations ?? 10
  const conversation = [...messages]

  for (let i = 0; i < maxIterations; i++) {
    const response = await chat(conversation, {
      model: options?.model,
      tools,
    })

    const choice = response.choices[0]
    if (!choice) return "No response from AI."

    conversation.push(choice.message)

    if (choice.finish_reason === "stop" || !choice.message.tool_calls?.length) {
      return choice.message.content ?? "No response from AI."
    }

    for (const toolCall of choice.message.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments)
      const result = await executeTool(toolCall.function.name, args)
      conversation.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      })
    }
  }

  return "Reached maximum tool call iterations."
}
