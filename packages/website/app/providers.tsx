"use client"

import type { PropsWithChildren } from "react"
import { ThemeProvider } from "@/components/layout/ThemeProvider"
import { Toaster } from "sonner"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient()

export type ProviderProps = PropsWithChildren

export const Providers = (props: ProviderProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Toaster />
        {props.children}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
