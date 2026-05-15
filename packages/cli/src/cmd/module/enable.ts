import fs from "node:fs"
import { styleText } from "node:util"
import { select } from "@inquirer/prompts"
import { Command } from "commander"
import {
  enableModule,
  getModuleNames,
  isBotTsProject,
  modulesConfigPath,
} from "#src/util"

export const handler = async () => {
  if (!isBotTsProject()) return process.exit(1)

  if (!fs.existsSync(modulesConfigPath())) {
    console.error(styleText("red", "No modules.json found"))
    return process.exit(1)
  }

  const disabled = getModuleNames("disabled")

  if (disabled.length === 0) {
    console.log(styleText("grey", "All modules are already enabled"))
    return
  }

  const name = await select({
    message: "Select a module to enable",
    choices: disabled.map((n) => ({ name: n, value: n })),
  })

  enableModule(name)
}

export const command = new Command("enable")
  .description("Enable a disabled module")
  .usage("[--options]")
  .action(handler)
