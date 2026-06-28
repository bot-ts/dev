// system file, please don't modify it

import path from "node:path"
import url from "node:url"
import { styleText } from "node:util"
import * as handler from "@ghom/handler"
import * as discord from "discord.js"
import type apiTypes from "discord-api-types/v10"
import client from "#core/client"
import logger from "#core/logger"
import * as util from "#core/util"

const readyListeners = new discord.Collection<
  Listener<"clientReady">,
  boolean
>()

const loadedListenerFilepaths = new Set<string>()
const boundListeners = new Map<string, { event: string, once: boolean, wrapper: (...args: any[]) => any }>()

export interface MoreClientEvents {
  raw: [packet: apiTypes.GatewayDispatchPayload]
  afterReady: [discord.Client<true>]
}

export type AllClientEvents = Omit<discord.ClientEvents, "ready"> &
  MoreClientEvents

export type ListenerOptions<EventName extends keyof AllClientEvents> = {
  event: EventName
  description: string
  run: (...args: AllClientEvents[EventName]) => unknown
  once?: boolean
}

export class Listener<EventName extends keyof AllClientEvents> {
  readonly type = "listener" as const
  constructor(public options: ListenerOptions<EventName>) {}
}

export const listenerHandler = util.createHandler<Listener<any>>({
  directory: "listeners",
  expectedClass: Listener,
  onLoad: async (filepath, listener) => {
    if (loadedListenerFilepaths.has(filepath)) return
    loadedListenerFilepaths.add(filepath)

    if (listener.options.event === "clientReady")
      readyListeners.set(listener as any, false)

    const wrapper = async (...args: any[]) => {
      try {
        if (listener.options.once) {
          await (listener.options as any).run(...args)
        } else {
          const run = (listener.options as any).run.bind(listener)
          await run(...args)
        }

        if (listener.options.event === "clientReady") {
          readyListeners.set(listener as any, true)

          if (readyListeners.every((launched) => launched)) {
            client.emit("afterReady", ...args)
          }
        }
      } catch (error: any) {
        logger.error(error, filepath, true)
      }
    }

    client[listener.options.once ? "once" : "on"](
      listener.options.event,
      wrapper,
    )

    boundListeners.set(filepath, {
      event: listener.options.event,
      once: !!listener.options.once,
      wrapper,
    })

    const isNative = /.native.[jt]s$/.test(filepath)

    const category = path
      .basename(filepath.replace(/.[jt]s$/, ""))
      .replace(`${listener.options.event}.`, "")
      .split(".")
      .filter((x) => x !== "native" && x !== listener.options.event)
      .join(" ")

    Object.defineProperty((listener.options as any).run, "name", {
      value: util.generateDebugName({
        name: listener.options.event,
        type: "listener",
        category,
      }),
    })

    logger.log(
      `loaded listener ${styleText("magenta", category)} ${styleText(
        "yellow",
        listener.options.once ? "once" : "on",
      )} ${styleText("blueBright", listener.options.event)}${
        isNative ? ` ${styleText("green", "native")}` : ""
      } ${styleText("grey", listener.options.description)}`,
    )
  },
  onRemove: async (filepath, listener) => {
    const bound = boundListeners.get(filepath)
    if (bound) {
      client.off(bound.event, bound.wrapper)
      boundListeners.delete(filepath)
      loadedListenerFilepaths.delete(filepath)
    }
  },
})
