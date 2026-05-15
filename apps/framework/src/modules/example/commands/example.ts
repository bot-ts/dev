import { Command } from "#core/command"

export default new Command({
  name: "example",
  description: "Example command from the example module",
  channelType: "all",
  async run(message) {
    await message.channel.send("Hello from the example module!")
  },
})
