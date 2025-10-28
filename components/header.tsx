"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/user-nav"
import type { User } from "@supabase/supabase-js"

export function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all ${
        isScrolled ? "border-b border-border shadow-sm" : ""
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-foreground hover:opacity-80 transition-opacity">
            DemoDrop
          </Link>
          <nav className="flex items-center gap-6">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <UserNav user={user} />
              </>
            ) : (
              <Link href="/auth/login">
                <Button variant="outline">Sign In</Button>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
