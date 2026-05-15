import * as discord from "discord.js"

import { Button } from "#core/button"
import * as procedures from "#modules/ai-assistant/namespaces/procedures"

export type AiConfirmParams = { actionId: string }

export default new Button<AiConfirmParams>({
  name: "ai-confirm",
  description: "Confirm a dangerous AI action",
  builder: (builder) =>
    builder.setLabel("Confirm").setStyle(discord.ButtonStyle.Success),
  async run(interaction, { actionId }) {
    const action = procedures.pendingActions.get(actionId)

    if (!action) {
      await interaction.reply({
        content: "This action has expired.",
        ephemeral: true,
      })
      return
    }

    procedures.pendingActions.delete(actionId)

    await interaction.update({
      content: `**Executing ${action.name}...**`,
      components: [],
    })

    const result = await procedures.executeTool(action.name, action.args)
    action.resolve(result)
  },
})
