"use server"

import { userAction } from "@/lib/safe"
import { builderSchema } from "./builder.schema"

export const submitBot = userAction(builderSchema, async (values, context) => {
  // get the codebase (Vercel lambda ? Degit ? Bot.ts CLI ?).
  // paste pre-rendered files with their requirements.
  // generate with AI for each needed feature:
  // - a list of needed commands, listeners, tables and namespaces (in the order they should be created for efficient generation and referencing).
  // - all the prompts for all the needed files (with all generated files as context to prevent errors).
  // - generate all needed files.
  // - extract a list of all dependencies we need to install.
  // install all dependencies.
  // zip the bot.
  // return the bot zip file.
})
