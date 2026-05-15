import { LoggedInDropdown } from "@/components/auth/LoggedInDropdown"
import { SignInButton } from "@/components/auth/SignInButton"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import { getUser } from "@/lib/auth.actions"

export const LoggedInButton = async () => {
  const user = await getUser()

  if (!user) return <SignInButton />

  return (
    <LoggedInDropdown>
      <Button variant="ghost" size="icon">
        <UserAvatar user={user} className="size-6" />
      </Button>
    </LoggedInDropdown>
  )
}
