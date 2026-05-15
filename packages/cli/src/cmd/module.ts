import { select } from "@inquirer/prompts"
import { Command } from "commander"
import * as disable from "#src/cmd/module/disable"
import * as enable from "#src/cmd/module/enable"
import * as install from "#src/cmd/module/install"
import * as remove from "#src/cmd/module/remove"

export const command = new Command("module")
  .description("Manage bot.ts modules")
  .usage("[command] [--options]")
  .addCommand(install.command)
  .addCommand(enable.command)
  .addCommand(disable.command)
  .addCommand(remove.command)
  .action(async () => {
    const action = await select({
      message: "Select a module action",
      choices: [
        { name: "Install a module", value: "install" },
        { name: "Enable a module", value: "enable" },
        { name: "Disable a module", value: "disable" },
        { name: "Remove a module", value: "remove" },
      ],
    })

    switch (action) {
      case "install":
        return install.handler()
      case "enable":
        return enable.handler()
      case "disable":
        return disable.handler()
      case "remove":
        return remove.handler()
    }
  })
