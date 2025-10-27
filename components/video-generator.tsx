"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
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

interface PhaseInfo {
  name: string
  description: string
  estimatedTime: string
}

const PHASES: Record<string, PhaseInfo> = {
  scraping: {
    name: "Analyzing Website",
    description: "Extracting content and structure from your website",
    estimatedTime: "10-15 seconds",
  },
  enhancing: {
    name: "AI Enhancement",
    description: "Creating optimized 2-part video story with AI",
    estimatedTime: "15-25 seconds",
  },
  generating_clip1: {
    name: "Generating Part 1",
    description: "Creating opening scene (0-12s)",
    estimatedTime: "3-5 minutes",
  },
  generating_clip2: {
    name: "Generating Part 2",
    description: "Creating conclusion (12-24s)",
    estimatedTime: "3-5 minutes",
  },
  stitching: {
    name: "Stitching Clips",
    description: "Merging clips into 24-second video",
    estimatedTime: "20-40 seconds",
  },
  finalizing: {
    name: "Finalizing",
    description: "Uploading your completed video",
    estimatedTime: "10-20 seconds",
  },
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

  const [displayProgress, setDisplayProgress] = useState(0)

  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

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
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (state.status === "generating") {
      const interval = setInterval(() => {
        setDisplayProgress((prev) => {
          const diff = state.progress - prev
          if (Math.abs(diff) < 0.1) return state.progress
          return prev + diff * 0.1
        })
      }, 50)
      return () => clearInterval(interval)
    } else {
      setDisplayProgress(state.progress)
    }
  }, [state.progress, state.status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (state.status === "generating") {
      return
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    setState({
      status: "generating",
      progress: 0,
      statusMessage: "Queuing...",
      videoUrl: null,
      error: null,
      projectId: null,
    })

    try {
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

        if (response.status === 403 && errorData.error === "Quota exceeded") {
          throw new Error(errorData.message || "You've reached your video limit. Please upgrade to continue.")
        }

        if (response.status === 401) {
          throw new Error("Please sign in to generate videos")
        }

        throw new Error(errorData.error || "Failed to start video generation")
      }

      const { projectId } = await response.json()
      setState((prev) => ({ ...prev, projectId, statusMessage: "Analyzing website...", progress: 10 }))

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
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        if (!response.ok) {
          throw new Error("Failed to fetch project status")
        }

        const data = await response.json()
        console.log('[generator] Poll update:', {
          status: data.status,
          progress: data.progress,
          projectId
        })

        if (data.status === "completed") {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          setState({
            status: "complete",
            progress: 100,
            statusMessage: "Video ready!",
            videoUrl: data.videoUrl,
            error: null,
            projectId,
          })
        } else if (data.status === "failed") {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          setState({
            status: "error",
            progress: 0,
            statusMessage: "",
            videoUrl: null,
            error: data.error || "Video generation failed",
            projectId: null,
          })
        } else {
          const progress = data.progress || 50
          const statusMessage = getStatusMessage(progress)
          console.log('[generator] Updating state:', { progress, statusMessage, currentPhase: getCurrentPhase(progress).name })
          setState((prev) => ({
            ...prev,
            progress,
            statusMessage,
          }))
        }
      } catch (error) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        setState({
          status: "error",
          progress: 0,
          statusMessage: "",
          videoUrl: null,
          error: error instanceof Error ? error.message : "An error occurred",
          projectId: null,
        })
      }
    }, 2000)
  }

  const getStatusMessage = (progress: number): string => {
    if (progress < 10) return "Queuing..."
    if (progress < 30) return "Analyzing website & creating story..."
    if (progress < 35) return "Splitting into 2-part narrative..."
    if (progress < 60) return "Generating opening scene (Part 1/2)..."
    if (progress < 85) return "Generating conclusion (Part 2/2)..."
    if (progress < 95) return "Stitching clips together..."
    return "Finalizing your 24-second video..."
  }

  const getCurrentPhase = (progress: number): PhaseInfo => {
    if (progress < 10) return PHASES.scraping
    if (progress < 30) return PHASES.enhancing
    if (progress < 60) return PHASES.generating_clip1
    if (progress < 85) return PHASES.generating_clip2
    if (progress < 95) return PHASES.stitching
    return PHASES.finalizing
  }

  const getEstimatedTimeRemaining = (progress: number): string => {
    if (progress < 10) return "8-10 minutes"
    if (progress < 30) return "7-9 minutes"
    if (progress < 35) return "7-8 minutes"
    if (progress < 60) return "5-7 minutes"  // Clip 1 generating
    if (progress < 85) return "3-5 minutes"  // Clip 2 generating
    if (progress < 95) return "30-60 seconds"  // Stitching
    return "Almost done..."
  }

  const handleReset = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

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
                <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-foreground"></span>
                        </div>
                        <span className="font-semibold text-sm">{getCurrentPhase(state.progress).name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Est. {getEstimatedTimeRemaining(state.progress)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-5">{getCurrentPhase(state.progress).description}</p>
                    {state.projectId && (
                      <p className="text-xs pt-1 pl-5">
                        <Link href={`/video/${state.projectId}`} className="text-primary hover:underline">
                          View detailed progress →
                        </Link>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{state.statusMessage}</span>
                      <span className="font-medium text-foreground">{Math.round(displayProgress)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary relative">
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                        style={{
                          backgroundSize: "200% 100%",
                          animation: "shimmer 2s infinite",
                        }}
                      />
                      <div
                        className="h-full bg-foreground transition-all duration-300 ease-out relative"
                        style={{ width: `${displayProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                    <span className={state.progress >= 10 ? "text-foreground font-medium" : ""}>Analyze</span>
                    <span className={state.progress >= 30 ? "text-foreground font-medium" : ""}>Create</span>
                    <span className={state.progress >= 60 ? "text-foreground font-medium" : ""}>Part 1</span>
                    <span className={state.progress >= 85 ? "text-foreground font-medium" : ""}>Part 2</span>
                    <span className={state.progress >= 95 ? "text-foreground font-medium" : ""}>Stitch</span>
                  </div>
                </div>
              )}

              <Button type="submit" disabled={state.status === "generating"} className="w-full h-12 text-base">
                {state.status === "generating" ? "Generating..." : "Generate Video"}
              </Button>

              {state.status === "idle" && (
                <p className="text-xs text-center text-muted-foreground">
                  Typical generation time: 8-10 minutes • Creates 24-second video
                </p>
              )}
            </form>
          </Card>
        ) : null}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </section>
  )
}
