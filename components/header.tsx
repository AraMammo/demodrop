"use client"

import Link from "next/link"
import { useState, useEffect } from "react"

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-background transition-shadow ${
        isScrolled ? "border-b border-border" : ""
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-foreground">
            DemoDrop
          </Link>
          <Link href="/signin" className="text-base text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </header>
  )
}
