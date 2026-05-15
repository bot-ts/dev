"use client"

import type { PropsWithChildren } from "react"

export const Container = ({ children }: PropsWithChildren) => {
  return <div className="container mx-auto py-5">{children}</div>
}
