"use client"

import { SignInButton } from "@/components/auth/SignInButton"
import { Container } from "@/components/layout/Container"
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function error() {
  return (
    <Container>
      <Card>
        <CardHeader>
          <CardTitle>
            Sorry, you need to be logged in to view this page.
          </CardTitle>
        </CardHeader>
        <CardFooter>
          <SignInButton />
        </CardFooter>
      </Card>
    </Container>
  )
}
