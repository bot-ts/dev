import * as discord from "discord.js"

import { Button } from "#core/button"
import * as procedures from "#modules/ai-assistant/namespaces/procedures"

export type AiCancelParams = { actionId: string }

export default new Button<AiCancelParams>({
  name: "ai-cancel",
  description: "Cancel a dangerous AI action",
  builder: (builder) =>
    builder.setLabel("Cancel").setStyle(discord.ButtonStyle.Danger),
  async run(interaction, { actionId }) {
    const action = procedures.pendingActions.get(actionId)

    if (!action) {
      await interaction.reply({
        content: "This action has already been handled.",
        ephemeral: true,
      })
      return
    }

    procedures.pendingActions.delete(actionId)

    await interaction.update({
      content: `**${action.name} cancelled by user.**`,
      components: [],
    })

    action.resolve(
      JSON.stringify({ cancelled: true, reason: "User cancelled the action" }),
    )
  },
})
