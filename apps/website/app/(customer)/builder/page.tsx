import { Container } from "@/components/layout/Container"
import { getUser } from "@/lib/auth.actions"
import { prisma } from "@/lib/prisma"
import { BuilderForm } from "./builder.form"

export default async function Page() {
  const user = await getUser(true)

  const formState = await prisma.formState.findFirst({
    where: {
      userId: user.id,
    },
  })

  // const preRenderedCommands = await prisma.command.findMany()

  return (
    <Container>
      <h1>Discord bot building</h1>
      <BuilderForm
        user={user}
        currentValues={
          formState?.values ? JSON.parse(formState.values) : undefined
        }
        currentProgress={formState?.progress}
      />
    </Container>
  )
}
