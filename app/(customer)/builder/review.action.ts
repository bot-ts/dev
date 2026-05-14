"use server"

import { userAction } from "@/lib/safe"
import { reviewSchema } from "./review.schema"
import { prisma } from "@/lib/prisma"

export const submitReview = userAction(
  reviewSchema,
  async (values, context) => {
    return prisma.review.create({
      data: {
        rating: values.rating,
        text: values.text ?? "",
        userId: context.user.id,
      },
    })
  },
)
