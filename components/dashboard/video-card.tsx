"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import type { Project } from "@/lib/db"

interface VideoCardProps {
  video: Project
  onDelete: (id: string) => void
}

export function VideoCard({ video, onDelete }: VideoCardProps) {
  const statusColors = {
    scraping: "bg-blue-100 text-blue-800",
    generating: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  }

  const statusLabels = {
    scraping: "Scraping",
    generating: "Generating",
    completed: "Completed",
    failed: "Failed",
  }

  const formatDate = (dateValue: string | number | null | undefined) => {
    if (!dateValue) return "Just now"

    try {
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) return "Just now"
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return "Just now"
    }
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/video/${video.id}`}>
        <div className="aspect-video bg-gray-900 flex items-center justify-center relative overflow-hidden">
          {video.videoUrl ? (
            <video src={video.videoUrl} className="w-full h-full object-cover" muted preload="metadata" />
          ) : (
            <div className="text-gray-500 text-sm">
              {video.status === "generating" ? "Generating..." : "No preview"}
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <Badge className={statusColors[video.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
            {statusLabels[video.status as keyof typeof statusLabels] || video.status}
          </Badge>
          <span className="text-xs text-gray-500">{formatDate(video.createdAt)}</span>
        </div>

        <h3 className="font-medium text-gray-900 mb-1 truncate text-sm">{video.websiteUrl || "Untitled"}</h3>

        <p className="text-xs text-gray-600 mb-4">Style: {video.stylePreset?.replace(/-/g, " ") || "default"}</p>

        <div className="flex gap-2">
          <Button asChild size="sm" className="flex-1">
            <Link href={`/video/${video.id}`}>View</Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.preventDefault()
              onDelete(video.id)
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  )
}
