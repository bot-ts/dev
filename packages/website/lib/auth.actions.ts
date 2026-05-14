"use server"

import type { User } from "@prisma/client"
import { signIn, signOut, auth } from "@/lib/auth"

export async function signOutAction() {
  await signOut()
}

export async function signInAction() {
  await signIn()
}

export async function authAction() {
  return await auth()
}

export async function getUser(): Promise<User | null>
export async function getUser(force: true): Promise<User>
export async function getUser(force: false): Promise<User | null>
export async function getUser(force: boolean): Promise<User | null>
export async function getUser(force = false) {
  const session = await auth()

  if (!session?.user) {
    if (!force) return null
    throw new Error("User not found")
  }

  return session.user as User
}
