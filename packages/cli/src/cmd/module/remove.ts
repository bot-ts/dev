import { styleText } from "node:util"
import { confirm, select } from "@inquirer/prompts"
import { Command } from "commander"
import {
  getInstalledModuleNames,
  isBotTsProject,
  removeModule,
} from "#src/util"

export const handler = async () => {
  if (!isBotTsProject()) return process.exit(1)

  const modules = getInstalledModuleNames()

  if (modules.length === 0) {
    console.log(styleText("grey", "No modules installed"))
    return
  }

  const name = await select({
    message: "Select a module to remove",
    choices: modules.map((n) => ({ name: n, value: n })),
  })

  const shouldRemove = await confirm({
    message: `Are you sure you want to permanently delete the "${name}" module?`,
    default: false,
  })

  if (!shouldRemove) {
    console.log(styleText("grey", "Aborted"))
    return
  }

  removeModule(name)
}

export const command = new Command("remove")
  .description("Remove a module permanently")
  .usage("[--options]")
  .action(handler)
