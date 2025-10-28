"use client"

import { useState, useEffect, Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useRouter, useSearchParams } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { User as UserIcon, Moon, CreditCard, Save, Loader2 } from "lucide-react"

function SettingsContent() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "profile"
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login")
        return
      }
      setUser(user)
      setFullName(user.user_metadata?.full_name || "")
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.push("/auth/login")
      } else {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      })

      if (error) throw error

      setMessage({ type: "success", text: "Profile updated successfully!" })
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to update profile" })
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (email: string) => {
    return email
      .split("@")[0]
      .slice(0, 2)
      .toUpperCase()
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information and avatar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {getInitials(user.email || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-sm mb-1">Profile Picture</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload a custom avatar (coming soon)
                    </p>
                    <Button variant="outline" size="sm" disabled>
                      Upload Image
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Profile Form */}
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed. Contact support if you need to update it.
                    </p>
                  </div>

                  {message && (
                    <div
                      className={`p-3 rounded-md text-sm ${
                        message.type === "success"
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      {message.text}
                    </div>
                  )}

                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel of the application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm">Theme</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose your preferred color theme
                    </p>
                  </div>
                  <ThemeToggle />
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Preview</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg bg-background">
                      <div className="h-20 bg-primary rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                    <div className="p-4 border rounded-lg bg-background">
                      <div className="h-20 bg-secondary rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                    <div className="p-4 border rounded-lg bg-background">
                      <div className="h-20 bg-accent rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Billing & Subscription</CardTitle>
                <CardDescription>Manage your plan and billing information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium text-sm mb-1">Current Plan</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Free Trial</Badge>
                      <span className="text-sm text-muted-foreground">1 video with watermark</span>
                    </div>
                  </div>
                  <Button>Upgrade to Pro</Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Usage</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Videos Generated</span>
                        <span className="font-medium">0 / 1</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: "0%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Payment Method</h3>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      No payment method on file. Upgrade to Pro to add a payment method.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
