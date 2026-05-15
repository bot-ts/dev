import * as discord from "discord.js"

import { Button } from "#core/button"

export default new Button({
  name: "example",
  description: "Example button from the example module",
  builder: (button) => {
    button.setLabel("Example").setStyle(discord.ButtonStyle.Secondary)
  },
  async run(interaction) {
    await interaction.reply({
      content: "Example button clicked!",
      flags: discord.MessageFlags.Ephemeral,
    })
  },
})
