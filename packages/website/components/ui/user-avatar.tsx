"use client"

import type { User } from "@prisma/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export const UserAvatar = ({
  user,
  className,
}: {
  user: User
  className: string
}) => {
  return (
    <Avatar className={className}>
      <AvatarFallback>{user.name?.[0]}</AvatarFallback>
      {user.image && (
        <AvatarImage src={user.image} alt={`${user.name ?? "User"}'s avatar`} />
      )}
    </Avatar>
  )
}
