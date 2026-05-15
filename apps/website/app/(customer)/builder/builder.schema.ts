import { z } from "zod"

export const builderSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(32)
    .regex(
      /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/,
      "Must be a valid PackageJSON name",
    ),
  description: z.string().max(1024).optional(),
  prefix: z.string().min(1).max(4).regex(/\S+/, "Must not contain whitespace"),
  token: z
    .string()
    .regex(
      /^[a-z0-9_-]{23,28}\.[a-z0-9_-]{6,7}\.[a-z0-9_-]+$/i,
      "Must be a valid Discord bot token",
    ),
  //
  preRenderedCommands: z.array(z.string()),
  preRenderedListeners: z.array(z.string()),
  commandPrompts: z.array(z.string()),
  listenerPrompts: z.array(z.string()),
  plugins: z.array(z.string()),
  database: z.enum(["sqlite3", "mysql2", "pg"]),
})

export type BuilderValues = z.infer<typeof builderSchema>
