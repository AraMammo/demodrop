"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import type { User } from "@supabase/supabase-js"

type GenerationStatus = "idle" | "generating" | "complete" | "error"

interface GenerationState {
  status: GenerationStatus
  progress: number
  statusMessage: string
  videoUrl: string | null
  error: string | null
  projectId: string | null
}

export function VideoGenerator() {
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [stylePreset, setStylePreset] = useState("product-demo")
  const [customInstructions, setCustomInstructions] = useState("")
  const [state, setState] = useState<GenerationState>({
    status: "idle",
    progress: 0,
    statusMessage: "",
    videoUrl: null,
    error: null,
    projectId: null,
  })

  const [user, setUser] = useState<User | null>(null)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset state
    setState({
      status: "generating",
      progress: 0,
      statusMessage: "Queuing...",
      videoUrl: null,
      error: null,
      projectId: null,
    })

    try {
      // Submit to API
      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl,
          stylePreset,
          customInstructions,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()

        // Handle quota exceeded
        if (response.status === 403 && errorData.error === "Quota exceeded") {
          throw new Error(errorData.message || "You've reached your video limit. Please upgrade to continue.")
        }

        // Handle unauthorized
        if (response.status === 401) {
          throw new Error("Please sign in to generate videos")
        }

        throw new Error(errorData.error || "Failed to start video generation")
      }

      const { projectId } = await response.json()
      setState((prev) => ({ ...prev, projectId, statusMessage: "Analyzing website...", progress: 10 }))

      // Poll for status
      pollStatus(projectId)
    } catch (error) {
      setState({
        status: "error",
        progress: 0,
        statusMessage: "",
        videoUrl: null,
        error: error instanceof Error ? error.message : "An error occurred",
        projectId: null,
      })
    }
  }

  const pollStatus = async (projectId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        if (!response.ok) {
          throw new Error("Failed to fetch project status")
        }

        const data = await response.json()

        if (data.status === "completed") {
          clearInterval(pollInterval)
          setState({
            status: "complete",
            progress: 100,
            statusMessage: "Video ready!",
            videoUrl: data.videoUrl,
            error: null,
            projectId,
          })
        } else if (data.status === "failed") {
          clearInterval(pollInterval)
          setState({
            status: "error",
            progress: 0,
            statusMessage: "",
            videoUrl: null,
            error: data.error || "Video generation failed",
            projectId: null,
          })
        } else {
          // Update progress
          const progress = data.progress || 50
          const statusMessage = getStatusMessage(progress)
          setState((prev) => ({
            ...prev,
            progress,
            statusMessage,
          }))
        }
      } catch (error) {
        clearInterval(pollInterval)
        setState({
          status: "error",
          progress: 0,
          statusMessage: "",
          videoUrl: null,
          error: error instanceof Error ? error.message : "An error occurred",
          projectId: null,
        })
      }
    }, 2000) // Poll every 2 seconds
  }

  const getStatusMessage = (progress: number): string => {
    if (progress < 30) return "Analyzing website..."
    if (progress < 95) return `Generating video... ${progress}%`
    return "Finalizing..."
  }

  const handleReset = () => {
    setState({
      status: "idle",
      progress: 0,
      statusMessage: "",
      videoUrl: null,
      error: null,
      projectId: null,
    })
    setWebsiteUrl("")
    setCustomInstructions("")
  }

  const handleDownload = () => {
    if (state.videoUrl) {
      const link = document.createElement("a")
      link.href = state.videoUrl
      link.download = "demo-video.mp4"
      link.click()
    }
  }

  return (
    <section id="generator" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-12">Generate Your Demo Video</h2>

        {!user && (
          <Card className="p-8 bg-card text-center">
            <h3 className="text-xl font-semibold mb-4">Sign in to generate videos</h3>
            <p className="text-muted-foreground mb-6">Create your free account to start generating demo videos</p>
            <Button asChild size="lg">
              <Link href="/auth/login">Sign In / Sign Up</Link>
            </Button>
          </Card>
        )}

        {user && state.status === "error" && (
          <Card className="mb-6 p-4 bg-destructive/10 border-destructive">
            <p className="text-sm text-destructive font-medium mb-3">{state.error}</p>
            <div className="flex gap-2">
              {state.error?.includes("quota") || state.error?.includes("limit") ? (
                <Button asChild size="sm" variant="outline">
                  <Link href="/#pricing">Upgrade to Pro</Link>
                </Button>
              ) : null}
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard">View Dashboard</Link>
              </Button>
            </div>
          </Card>
        )}

        {user && state.status === "complete" && state.videoUrl ? (
          <div className="space-y-6">
            <Card className="p-4 bg-green-50 border-green-200 mb-4">
              <p className="text-green-800 text-sm font-medium text-center">
                ✓ Video generated successfully! View all your videos in the dashboard.
              </p>
            </Card>
            <Card className="p-6 bg-card">
              <video src={state.videoUrl} controls className="w-full rounded-lg" />
            </Card>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleDownload} className="flex-1">
                  Download Video
                </Button>
                <Button asChild variant="outline" className="flex-1 bg-transparent">
                  <Link href="/dashboard">View Dashboard</Link>
                </Button>
              </div>
              <Button onClick={handleReset} variant="ghost" className="w-full">
                Generate Another Video
              </Button>
            </div>
          </div>
        ) : user ? (
          <Card className="p-6 sm:p-8 bg-card">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="website-url" className="text-sm font-medium">
                  Website URL
                </Label>
                <Input
                  id="website-url"
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  required
                  disabled={state.status === "generating"}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="style-preset" className="text-sm font-medium">
                  Video Style
                </Label>
                <Select value={stylePreset} onValueChange={setStylePreset} disabled={state.status === "generating"}>
                  <SelectTrigger id="style-preset" className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product-demo">Product Demo</SelectItem>
                    <SelectItem value="enterprise-saas">Enterprise SaaS</SelectItem>
                    <SelectItem value="startup-energy">Startup Energy</SelectItem>
                    <SelectItem value="brand-story">Brand Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-instructions" className="text-sm font-medium">
                  Custom Instructions (Optional)
                </Label>
                <Textarea
                  id="custom-instructions"
                  placeholder="E.g., Focus on the AI features, target audience is developers..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  disabled={state.status === "generating"}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {state.status === "generating" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{state.statusMessage}</span>
                    <span className="font-medium text-foreground">{state.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-foreground transition-all duration-500 ease-out"
                      style={{ width: `${state.progress}%` }}
                    />
                  </div>
                </div>
              )}

              <Button type="submit" disabled={state.status === "generating"} className="w-full h-12 text-base">
                {state.status === "generating" ? "Generating..." : "Generate Video"}
              </Button>
            </form>
          </Card>
        ) : null}
      </div>
    </section>
  )
}
