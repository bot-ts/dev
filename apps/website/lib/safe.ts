import { createSafeActionClient } from "next-safe-action"
import { getUser } from "@/lib/auth.actions"

export class ActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ActionError"
  }
}

const handleReturnedServerError = (error: Error) => {
  if (error instanceof ActionError) {
    return error.message
  }

  return "An unexpected error occurred"
}

export const userAction = createSafeActionClient({
  handleReturnedServerError,
  middleware: async (action) => {
    const user = await getUser()

    if (!user) {
      throw new ActionError("You must be logged in")
    }

    return { user }
  },
})
