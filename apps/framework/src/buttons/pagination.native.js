// system file, please don't modify it
import * as discord from "discord.js"
import { Button } from "#core/button"
export default new Button({
  name: "pagination",
  description: "The pagination button",
  async run(interaction, { key }) {
    const app = await import("#core/pagination")
    const paginator = app.Paginator.getByMessage(interaction.message)
    if (paginator) return paginator.handleInteraction(interaction, key)
    return interaction.reply({
      content: "This paginator is no longer available",
      flags: discord.MessageFlags.Ephemeral,
    })
  },
})
