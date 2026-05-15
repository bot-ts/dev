import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { styleText } from "node:util"
import { input } from "@inquirer/prompts"
import { Command } from "commander"
import {
  cwd,
  enableModule,
  isBotTsProject,
  loader,
  modulePath,
} from "#src/util"

export const handler = async () => {
  if (!isBotTsProject()) return process.exit(1)

  const source = await input({
    message: `Enter the module source ${styleText(
      "grey",
      "(npm package, github url, or local path)",
    )}`,
    required: true,
  })

  const modulesDir = cwd("src", "modules")

  if (!fs.existsSync(modulesDir)) {
    fs.mkdirSync(modulesDir, { recursive: true })
  }

  const isLocal = fs.existsSync(source)
  const isUrl =
    source.startsWith("http://") ||
    source.startsWith("https://") ||
    source.startsWith("git+") ||
    source.startsWith("github:") ||
    source.startsWith("gitlab:")

  if (isLocal) {
    const name = path.basename(source)
    const dest = modulePath(name)

    if (fs.existsSync(dest)) {
      console.error(
        styleText("red", `Module "${name}" already exists at ${dest}`),
      )
      return process.exit(1)
    }

    await loader(
      `Copying module from ${source}...`,
      () => fs.cpSync(source, dest, { recursive: true }),
      `Module "${name}" copied`,
    )

    enableModule(name)
  } else if (isUrl) {
    const name = await input({
      message: "Enter the module name (directory name)",
      required: true,
      validate: (v) => /^[a-z][a-z0-9-]*$/.test(v) || "Must be kebab-case",
    })

    const dest = modulePath(name)

    await loader(
      `Cloning module from ${source}...`,
      () => {
        execSync(`git clone ${source} ${dest}`, {
          stdio: ["ignore", "ignore", "pipe"],
        })
        const gitDir = path.join(dest, ".git")
        if (fs.existsSync(gitDir))
          fs.rmSync(gitDir, { recursive: true, force: true })
      },
      `Module "${name}" cloned`,
    )

    enableModule(name)
  } else {
    const name = await input({
      message: "Enter the module name (directory name)",
      required: true,
      default: source.split("/").pop()?.replace(/^@/, "") ?? source,
      validate: (v) => /^[a-z][a-z0-9-]*$/.test(v) || "Must be kebab-case",
    })

    const dest = modulePath(name)

    await loader(
      `Installing npm package ${source}...`,
      () => {
        execSync(
          `npm pack ${source} --pack-destination ${cwd(".tmp-module")}`,
          {
            stdio: ["ignore", "ignore", "pipe"],
          },
        )
        const tarball = fs
          .readdirSync(cwd(".tmp-module"))
          .find((f) => f.endsWith(".tgz"))
        if (tarball) {
          execSync(
            `tar -xzf ${path.join(cwd(".tmp-module"), tarball)} -C ${cwd(".tmp-module")}`,
            {
              stdio: ["ignore", "ignore", "pipe"],
            },
          )
          const packageDir = path.join(cwd(".tmp-module"), "package")
          if (fs.existsSync(packageDir)) {
            fs.cpSync(packageDir, dest, { recursive: true })
          }
          fs.rmSync(cwd(".tmp-module"), { recursive: true, force: true })
        }
      },
      `Module "${name}" installed from npm`,
    )

    enableModule(name)
  }
}

export const command = new Command("install")
  .description("Install a module from npm, git, or a local path")
  .usage("[--options]")
  .action(handler)
