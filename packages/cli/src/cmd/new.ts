import { execSync } from "node:child_process"
import { promises as fsp } from "node:fs"
import os from "node:os"
import path from "node:path"
import * as util from "node:util"
import { confirm, input, password, select } from "@inquirer/prompts"
import { Command } from "commander"
import type { APIApplication } from "discord-api-types/v10"
import type { PackageJson } from "types-package-json"
import {
  cwd,
  injectEnvLine,
  inputName,
  isNodeLikeProject,
  loader,
  promptDatabase,
  promptEngine,
  readJSON,
  root,
  setupDatabase,
  setupEngine,
  writeJSON,
} from "#src/util"

export const command = new Command("new")
  .description("Generate a typescript bot")
  .action(async () => {
    // base config
    const name = await inputName("Enter the bot name", {
      defaultValue: "bot-ts",
      kebabCase: true,
    })

    const description = await input({
      message: `Enter a short description for the bot ${util.styleText(
        "grey",
        "(one line)",
      )}`,
    })

    const location = await input({
      message: `Where will the bot be located? ${util.styleText(
        "grey",
        "(here by default)",
      )}`,
      default: ".",
    })

    const prefix = await input({
      message: `Enter the bot prefix ${util.styleText(
        "grey",
        "(for textual commands)",
      )}`,
      default: ".",
    })

    const locale = await select({
      message: "Enter the default bot locale",
      default: "en",
      choices: readJSON<{ name: string; value: string }[]>(
        root("locales.json"),
      ),
    })

    const token = await password({
      message: `Enter the bot token ${util.styleText(
        "grey",
        "(needed for configuration)",
      )}`,
      async validate(value) {
        if (!value.trim()) return "Bot token is required"

        try {
          const response = await fetch(
            "https://discord.com/api/v10/users/@me",
            {
              headers: {
                Authorization: `Bot ${value}`,
              },
            },
          )

          if (response.status === 200) return true

          return `Invalid token (code ${response.status})`
        } catch {
          return "Internal error"
        }
      },
    })

    const project = (...segments: string[]) => cwd(location, name, ...segments)

    let onverwrite = false

    if (isNodeLikeProject(project())) {
      const confirmOverwrite = await confirm({
        message: `Do you want to ${util.styleText(
          "red",
          "overwrite the existing project",
        )}?`,
        default: false,
      })

      if (!confirmOverwrite) {
        console.log(util.styleText("red", "Aborted."))
        process.exit(0)
      }

      onverwrite = true
    }

    const { runtime, packageManager } = await promptEngine()

    // database
    const useDatabase = await confirm({
      message: "Do you want to use a database?",
      default: true,
    })

    const database = useDatabase ? await promptDatabase() : null

    const readme = await confirm({
      message: "Do you want to generate a README.md?",
      default: false,
    })

    const ready = await confirm({
      message: "Ready to generate bot files?",
      default: true,
    })

    if (!ready) {
      console.log(util.styleText("red", "Aborted."))
      process.exit(0)
    }

    // generate!

    console.log()

    const warns: string[] = []

    let app: APIApplication,
      scripts: Record<string, Record<string, string>>,
      templateVersion: string

    // validate all data before building any files
    await loader(
      "Validating data",
      async () => {
        app = await fetch("https://discord.com/api/v10/applications/@me", {
          headers: {
            Authorization: `Bot ${token}`,
          },
        })
          .then((res) => res.json())
          .then((data) => data as APIApplication)

        if (!app.owner) {
          console.error("Failed to fetch application owner")
          process.exit(1)
        }

        const cliMajor = readJSON<PackageJson>(
          root("package.json"),
        ).version!.split(".")[0]
        const registry = await fetch(
          "https://registry.npmjs.org/@ghom/bot.ts",
        ).then(
          (r) => r.json() as Promise<{ versions: Record<string, unknown> }>,
        )
        const resolved = Object.keys(registry.versions)
          .filter((v) => v.startsWith(`${cliMajor}.`))
          .at(-1)

        if (!resolved) {
          console.error(
            util.styleText(
              "red",
              `No @ghom/bot.ts release found for CLI major v${cliMajor}`,
            ),
          )
          process.exit(1)
        }

        templateVersion = resolved
      },
      "Validated data",
    )

    if (onverwrite) {
      await loader(
        "Remove existing project",
        async () => {
          await fsp.rm(project(), { recursive: true })
        },
        "Removed existing project",
      )
    }

    await loader(
      "Downloading template",
      async () => {
        const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "bot-ts-"))
        execSync(
          `npm pack @ghom/bot.ts@${templateVersion} --pack-destination "${tmpDir}" --quiet`,
          { stdio: ["ignore", "ignore", "pipe"] },
        )
        const files = await fsp.readdir(tmpDir)
        const tarball = files.find((f) => f.endsWith(".tgz"))!
        await fsp.mkdir(project(), { recursive: true })
        execSync(
          `tar -xzf "${path.join(tmpDir, tarball)}" --strip-components=1 -C "${project()}"`,
          { stdio: ["ignore", "ignore", "pipe"] },
        )
        await fsp.rm(tmpDir, { recursive: true })
      },
      "Downloaded template",
    )

    await loader(
      "Initializing configuration",
      async () => {
        await fsp.writeFile(project(".env"), "", "utf8")

        await injectEnvLine("BOT_MODE", "development", project())
        await injectEnvLine("BOT_PREFIX", prefix, project())
        await injectEnvLine("BOT_LOCALE", locale, project())
        await injectEnvLine("BOT_TOKEN", token, project())
        await injectEnvLine("BOT_NAME", name, project())

        await injectEnvLine("BOT_ID", app.id, project())
        await injectEnvLine("BOT_OWNER", app.owner!.id, project())

        scripts = await setupEngine(
          { runtime, packageManager },
          { setupDocker: true },
          project(),
        )

        if (database) {
          await setupDatabase(
            { client: database.client, ...database.database },
            project(),
          )
        } else {
          // Initialize database.ts with no database configured
          await setupDatabase({ client: null }, project())
        }
      },
      "Initialized configuration",
    )

    // TODO: update package.json scripts with base.path:scripts/generate-scripts.js

    await loader(
      "Installing dependencies",
      async () => {
        await fsp.copyFile(
          project("lockfiles", scripts.lockfile[packageManager]),
          project(scripts.lockfile[packageManager]),
        )

        execSync(scripts.install[packageManager], {
          cwd: project(),
          stdio: ["ignore", "ignore", "pipe"],
        })
      },
      "Installed dependencies",
    )

    await loader(
      "Finishing setup",
      async () => {
        try {
          await fsp.rm(project("lockfiles"), { recursive: true })
        } catch (_err) {
          warns.push("failure to clean up some template files")
        }

        const packageJson = readJSON<PackageJson>(project("package.json"))

        writeJSON(project("package.json"), {
          ...packageJson,
          name,
          description,
          author: app.owner!.username,
        })

        if (readme) {
          try {
            execSync(`${scripts.run[packageManager]} readme`, {
              cwd: project(),
              stdio: ["ignore", "ignore", "pipe"],
            })
          } catch (_error) {
            warns.push("failure to generate README.md")
          }
        }
      },
      "Finished setup",
    )

    if (warns.length > 0) {
      console.log()
      warns.map((warn) => console.warn(util.styleText("yellow", `⚠️ ${warn}`)))
    }

    console.log()
    console.log(
      `✅ ${util.styleText("blueBright", name)} bot has been created.`,
    )
    console.log(`📂 ${util.styleText("cyanBright", project())}`)

    process.exit(0)
  })
