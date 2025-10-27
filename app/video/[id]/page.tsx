"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import type { Project } from "@/lib/db"
import { RemotionVideoPlayer } from "@/components/video/remotion-video-player"
import { VideoActions } from "@/components/video/video-actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

export default function VideoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [video, setVideo] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setIsLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (isLoaded && user) {
      fetchVideo()
    }
  }, [isLoaded, user, params.id])

  // Poll for updates if video is still processing
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (video && (video.status === "scraping" || video.status === "generating")) {
      interval = setInterval(() => {
        fetchVideo()
      }, 3000) // Poll every 3 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [video])

  const fetchVideo = async () => {
    try {
      const response = await fetch(`/api/video/${params.id}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError("Video not found")
        } else if (response.status === 403) {
          setError("You do not have permission to view this video")
        } else {
          setError("Failed to load video")
        }
        setLoading(false)
        return
      }

      const data = await response.json()
      setVideo(data.video)
      setError(null)
    } catch (error) {
      console.error("Failed to fetch video:", error)
      setError("Failed to load video")
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Please sign in to view this video</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading video...</p>
        </div>
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Video not found"}</p>
          <Button asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  const statusColors = {
    scraping: "bg-blue-100 text-blue-800",
    generating: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  }

  const statusLabels = {
    scraping: "Scraping Website",
    generating: "Generating Video",
    completed: "Completed",
    failed: "Failed",
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost">← Back to Dashboard</Button>
          </Link>
        </div>

        <div className="bg-card rounded-lg shadow-lg overflow-hidden">
          {video.videoUrl && video.status === "completed" ? (
            <RemotionVideoPlayer videoUrl={video.videoUrl} />
          ) : (
            <div className="aspect-video bg-gray-900 flex flex-col items-center justify-center gap-4">
              <Badge className={statusColors[video.status as keyof typeof statusColors]}>
                {statusLabels[video.status as keyof typeof statusLabels] || video.status}
              </Badge>
              {video.progress !== undefined && video.progress > 0 && (
                <div className="w-64">
                  <div className="mb-2 text-sm text-gray-400 text-center">{video.progress}% Complete</div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${video.progress}%` }}
                    />
                  </div>
                </div>
              )}
              {video.status === "failed" && video.error && (
                <p className="text-red-400 text-sm max-w-md text-center">{video.error}</p>
              )}
            </div>
          )}

          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">{video.websiteUrl || "Untitled"}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>Style: {video.stylePreset?.replace(/-/g, " ") || "default"}</span>
                <span>Status: {statusLabels[video.status as keyof typeof statusLabels] || video.status}</span>
                <span>Created {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
                {video.completedAt && (
                  <span>Completed {formatDistanceToNow(new Date(video.completedAt), { addSuffix: true })}</span>
                )}
              </div>
            </div>

            {video.videoUrl && video.status === "completed" && (
              <VideoActions videoUrl={video.videoUrl} videoId={video.id} />
            )}

            {video.status === "failed" && (
              <Button asChild className="w-full">
                <Link href="/#generator">Generate New Video</Link>
              </Button>
            )}

            {video.prompt && (
              <details className="mt-6">
                <summary className="cursor-pointer font-medium text-foreground hover:text-primary">
                  View AI Prompt
                </summary>
                <pre className="mt-4 p-4 bg-muted rounded text-sm overflow-auto whitespace-pre-wrap">
                  {video.prompt}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
