import type React from "react"
import { Header } from "@/components/layout/Header"

export default async function RouteLayout(
  props: Readonly<{
    children: React.ReactNode
  }>,
) {
  return (
    <div className="h-[100svh]">
      <Header />
      {props.children}
    </div>
  )
}
