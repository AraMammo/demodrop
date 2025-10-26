"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (error.message.includes("Email not confirmed")) {
      return { error: "Please check your email and click the confirmation link before signing in." }
    }
    return { error: error.message }
  }

  redirect("/dashboard")
}
