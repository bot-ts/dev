import fs from "node:fs"
import { styleText } from "node:util"
import { confirm, select } from "@inquirer/prompts"
import { Command } from "commander"
import {
  disableModule,
  getModuleNames,
  isBotTsProject,
  modulesConfigPath,
  removeModule,
} from "#src/util"

export const handler = async () => {
  if (!isBotTsProject()) return process.exit(1)

  if (!fs.existsSync(modulesConfigPath())) {
    console.error(styleText("red", "No modules.json found"))
    return process.exit(1)
  }

  const enabled = getModuleNames("enabled")

  if (enabled.length === 0) {
    console.log(styleText("grey", "No modules are currently enabled"))
    return
  }

  const name = await select({
    message: "Select a module to disable",
    choices: enabled.map((n) => ({ name: n, value: n })),
  })

  disableModule(name)

  const shouldRemove = await confirm({
    message: "Do you also want to delete the module files?",
    default: false,
  })

  if (shouldRemove) {
    removeModule(name, { skipDeps: true })
  }
}

export const command = new Command("disable")
  .description("Disable an active module")
  .usage("[--options]")
  .action(handler)
