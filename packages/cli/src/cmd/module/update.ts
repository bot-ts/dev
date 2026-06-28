import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { styleText } from "node:util"
import { select } from "@inquirer/prompts"
import { Command } from "commander"
import {
  getInstalledModuleNames,
  installModuleDeps,
  isBotTsProject,
  loader,
  modulePath,
  unpackNpmModule,
} from "#src/util"

export const handler = async () => {
  if (!isBotTsProject()) return process.exit(1)

  const modules = getInstalledModuleNames()
  if (modules.length === 0) {
    console.log(styleText("yellow", "No modules installed."))
    return process.exit(0)
  }

  const npmModules: Array<{
    name: string
    packageName: string
    version: string
    path: string
  }> = []

  for (const name of modules) {
    const modDir = modulePath(name)
    const pkgPath = path.join(modDir, "package.json")
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
        if (pkg.name && pkg.version) {
          npmModules.push({
            name,
            packageName: pkg.name,
            version: pkg.version,
            path: modDir,
          })
        }
      } catch (_e) {
        // Skip invalid packages
      }
    }
  }

  if (npmModules.length === 0) {
    console.log(styleText("yellow", "No npm-installed modules found."))
    return process.exit(0)
  }

  const selectedModule = await select({
    message: "Select a module to update",
    choices: npmModules.map((m) => ({
      name: `${m.name} (${styleText("grey", `${m.packageName} v${m.version}`)})`,
      value: m,
    })),
  })

  const { name, packageName, version, path: dest } = selectedModule

  let latestVersion = ""
  try {
    latestVersion = execSync(`npm view ${packageName} version`, {
      encoding: "utf8",
    }).trim()
  } catch (e: any) {
    console.error(
      styleText(
        "red",
        `Failed to fetch latest version for ${packageName}: ${e.message}`,
      ),
    )
    return process.exit(1)
  }

  if (latestVersion === version) {
    console.log(
      styleText(
        "green",
        `Module "${name}" is already up-to-date (v${version}).`,
      ),
    )
    return process.exit(0)
  }

  await loader(
    `Updating "${name}" from v${version} to v${latestVersion}...`,
    () => {
      unpackNpmModule(packageName, latestVersion, dest)
    },
    `Module "${name}" updated to v${latestVersion}`,
  )

  installModuleDeps(name)
}

export const command = new Command("update")
  .description("Update an installed NPM module by checking the registry")
  .action(handler)
