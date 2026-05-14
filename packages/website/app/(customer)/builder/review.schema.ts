import { z } from "zod"

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().max(1024).optional(),
  userId: z.string(),
})

export type ReviewValues = z.infer<typeof reviewSchema>
