import fs from "node:fs"
import path from "node:path"
import url from "node:url"
import { styleText } from "node:util"

import type * as orm from "@ghom/orm"
import * as button from "#core/button"
import * as command from "#core/command"
import * as cron from "#core/cron"
import database from "#core/database"
import * as listener from "#core/listener"
import * as logger from "#core/logger"
import * as slash from "#core/slash"
import * as util from "#core/util"

export type ModuleElement =
  | command.Command<any, any, any, any, any, any>
  | slash.SlashCommand<any, any>
  | button.Button<any>
  | listener.Listener<any>
  | cron.Cron
  | orm.Table

export interface ModulesConfig {
  keepDependencies: string[]
  modules: Record<string, boolean>
}

export function modulesPath(..._path: string[]): string {
  return util.srcPath("modules", ..._path)
}

export function modulesConfigPath(): string {
  return util.rootPath("modules.json")
}

function readModulesConfig(): ModulesConfig {
  const configPath = modulesConfigPath()
  if (!fs.existsSync(configPath)) return { keepDependencies: [], modules: {} }
  return JSON.parse(fs.readFileSync(configPath, "utf8"))
}

function writeModulesConfig(config: ModulesConfig) {
  fs.writeFileSync(modulesConfigPath(), JSON.stringify(config, null, 2), "utf8")
}

export class ModuleHandler {
  private _moduleNames: string[] = []

  get moduleNames(): readonly string[] {
    return this._moduleNames
  }

  async init() {
    this._moduleNames = await this._discover()
    this._register()
    await this._loadRootFiles()
  }

  private async _discover(): Promise<string[]> {
    const dir = modulesPath()

    if (!fs.existsSync(dir)) return []

    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    const allModules = entries.filter((e) => e.isDirectory()).map((e) => e.name)

    const config = readModulesConfig()
    let changed = false

    for (const name of allModules) {
      if (!(name in config.modules)) {
        config.modules[name] = true
        changed = true
      }
    }

    if (changed) writeModulesConfig(config)

    return allModules.filter((name) => config.modules[name] === true)
  }

  private _register() {
    for (const name of this._moduleNames) {
      const base = modulesPath(name)

      command.commandHandler.addDirectory(path.join(base, "commands"))
      slash.slashCommandHandler.addDirectory(path.join(base, "slash"))
      button.buttonHandler.addDirectory(path.join(base, "buttons"))
      listener.listenerHandler.addDirectory(path.join(base, "listeners"))
      cron.cronHandler.addDirectory(path.join(base, "cron"))

      if (database.handler) {
        database.handler.addDirectory(path.join(base, "tables"))
      }

      logger.log(`registered module ${styleText("magentaBright", name)}`)
    }
  }

  private async _loadRootFiles() {
    for (const name of this._moduleNames) {
      const base = modulesPath(name)

      if (!fs.existsSync(base)) continue

      const entries = await fs.promises.readdir(base, {
        withFileTypes: true,
      })

      const files = entries.filter(
        (e) =>
          e.isFile() && /\.[tj]s$/.test(e.name) && !e.name.endsWith(".d.ts"),
      )

      for (const file of files) {
        const filepath = path.join(base, file.name)
        const mod = await import(url.pathToFileURL(filepath).href)

        for (const [key, value] of Object.entries(mod)) {
          if (value != null && typeof value === "object" && "type" in value) {
            await this._dispatch(filepath, value as ModuleElement, key)
          }
        }
      }
    }
  }

  private async _dispatch(filepath: string, value: ModuleElement, key: string) {
    const { type } = value

    switch (type) {
      case "command":
        await command.commandHandler.inject(filepath, value, key)
        break
      case "slash":
        await slash.slashCommandHandler.inject(
          filepath,
          value as slash.ISlashCommand,
          key,
        )
        break
      case "button":
        await button.buttonHandler.inject(filepath, value, key)
        break
      case "listener":
        await listener.listenerHandler.inject(filepath, value, key)
        break
      case "cron":
        await cron.cronHandler.inject(filepath, value, key)
        break
      case "table":
        if (!database.handler) {
          logger.error(
            `module file ${filepath} exports a table but no database is configured`,
            filepath,
            true,
          )
          process.exit(1)
        }
        await database.handler.inject(filepath, value, key)
        break
    }
  }
}

export const moduleHandler = new ModuleHandler()
