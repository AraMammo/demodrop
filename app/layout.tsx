import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { checkEnvironmentVariables } from "@/lib/env-validation"
import "./globals.css"

// Validate environment variables on startup (server-side only)
if (typeof window === 'undefined') {
  checkEnvironmentVariables()
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "DemoDrop - AI-Powered Demo Videos in Minutes",
  description:
    "Drop a URL. Get a professional demo video in minutes. No creative briefs, no revision cycles, no agency fees.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
