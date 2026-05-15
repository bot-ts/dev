import { SlashCommand } from "#core/slash"

export default new SlashCommand({
  name: "example",
  description: "Example slash command from the example module",
  async run(interaction) {
    await interaction.reply("Hello from the example module!")
  },
})
