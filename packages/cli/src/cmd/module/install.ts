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
  unpackNpmModule,
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
      () => {
        fs.mkdirSync(dest, { recursive: true })
        const srcDir = path.join(source, "src")
        if (fs.existsSync(srcDir)) {
          fs.cpSync(srcDir, dest, { recursive: true })
        } else {
          fs.cpSync(source, dest, { recursive: true })
        }
        const filesToCopy = ["package.json", "module.json", "README.md"]
        for (const file of filesToCopy) {
          const srcFile = path.join(source, file)
          if (fs.existsSync(srcFile)) {
            fs.copyFileSync(srcFile, path.join(dest, file))
          }
        }
      },
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
        const tmpDir = cwd(".tmp-module-clone")
        if (fs.existsSync(tmpDir))
          fs.rmSync(tmpDir, { recursive: true, force: true })

        execSync(`git clone ${source} ${tmpDir}`, {
          stdio: ["ignore", "ignore", "pipe"],
        })

        fs.mkdirSync(dest, { recursive: true })
        const srcDir = path.join(tmpDir, "src")
        if (fs.existsSync(srcDir)) {
          fs.cpSync(srcDir, dest, { recursive: true })
        } else {
          fs.cpSync(tmpDir, dest, { recursive: true })
        }
        const filesToCopy = ["package.json", "module.json", "README.md"]
        for (const file of filesToCopy) {
          const srcFile = path.join(tmpDir, file)
          if (fs.existsSync(srcFile)) {
            fs.copyFileSync(srcFile, path.join(dest, file))
          }
        }

        fs.rmSync(tmpDir, { recursive: true, force: true })
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
        let packageName = source
        let version = "latest"
        if (source.includes("@") && !source.startsWith("@")) {
          const parts = source.split("@")
          version = parts.pop()!
          packageName = parts.join("@")
        } else if (source.startsWith("@") && source.slice(1).includes("@")) {
          const parts = source.slice(1).split("@")
          version = parts.pop()!
          packageName = `@${parts.join("@")}`
        }

        unpackNpmModule(packageName, version, dest)
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
