"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { PropsWithChildren } from "react"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/layout/ThemeProvider"

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
