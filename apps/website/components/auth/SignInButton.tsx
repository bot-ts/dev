"use client"

import { LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signInAction } from "@/lib/auth.actions"

export const SignInButton = () => {
  return (
    <Button onClick={() => signInAction()}>
      <LogIn size={16} className="mr-2" /> SignIn
    </Button>
  )
}
