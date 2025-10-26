"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { VideoGrid } from "@/components/dashboard/video-grid"
import { VideoFilters } from "@/components/dashboard/video-filters"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"

interface Video {
  id: string
  website_url: string
  style_preset: string
  status: string
  video_url?: string
  created_at: number
  completed_at?: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("all")
  const [search, setSearch] = useState<string>("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setIsLoaded(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsLoaded(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchVideos = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filter !== "all") params.set("status", filter)
      if (search) params.set("search", search)

      const response = await fetch(`/api/videos?${params}`)

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many requests. Please wait a moment and try again.")
        }
        const text = await response.text()
        throw new Error(text || "Failed to fetch videos")
      }

      const data = await response.json()
      setVideos(data.videos || [])
    } catch (error) {
      console.error("Failed to fetch videos:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch videos")
    } finally {
      setLoading(false)
    }
  }, [user, filter, search])

  useEffect(() => {
    if (isLoaded && user) {
      const timeoutId = setTimeout(() => {
        fetchVideos()
      }, 300)

      return () => clearTimeout(timeoutId)
    }
  }, [isLoaded, user, filter, search, fetchVideos])

  useEffect(() => {
    if (!user || !videos.length) return

    const hasProcessingVideos = videos.some((v) => v.status === "scraping" || v.status === "generating")

    if (!hasProcessingVideos) return

    const intervalId = setInterval(() => {
      fetchVideos()
    }, 5000) // Poll every 5 seconds only when there are processing videos

    return () => clearInterval(intervalId)
  }, [user, videos, fetchVideos])

  const handleDelete = async (videoId: string) => {
    if (!confirm("Delete this video? This action cannot be undone.")) return

    try {
      const response = await fetch(`/api/video/${videoId}/delete`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchVideos()
      } else {
        alert("Failed to delete video")
      }
    } catch (error) {
      console.error("Delete error:", error)
      alert("Failed to delete video")
    }
  }

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Please sign in to view your dashboard</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Video Dashboard</h1>
            <p className="text-muted-foreground">Manage your AI-generated demo videos</p>
          </div>
          <Button asChild>
            <Link href="/#generator">Generate New Video</Link>
          </Button>
        </div>

        <VideoFilters
          currentFilter={filter}
          onFilterChange={setFilter}
          searchQuery={search}
          onSearchChange={setSearch}
        />

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchVideos()} className="mt-2">
              Try Again
            </Button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {search || filter !== "all"
                ? "No videos found matching your filters"
                : "No videos yet. Create your first one!"}
            </p>
            {!search && filter === "all" && (
              <Button asChild>
                <Link href="/#generator">Generate Your First Video</Link>
              </Button>
            )}
          </div>
        ) : (
          <VideoGrid videos={videos} onDelete={handleDelete} />
        )}
      </div>
    </div>
  )
}
