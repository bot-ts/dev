"use client"

import { ThemeProvider as TP } from "next-themes"
import type { ThemeProviderProps } from "next-themes/dist/types"
import React from "react"

export const ThemeProvider = ({ children, ...props }: ThemeProviderProps) => {
  return <TP {...props}>{children}</TP>
}
