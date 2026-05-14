import { Container } from "@/components/layout/Container"
import { getUser } from "@/lib/auth.actions"

export default async function Page() {
  const user = await getUser(true)

  return (
    <Container>
      <h1>Dashboard</h1>
    </Container>
  )
}
