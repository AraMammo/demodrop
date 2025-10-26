"use client"

import { VideoCard } from "./video-card"
import type { Project } from "@/lib/db"

interface VideoGridProps {
  videos: Project[]
  onDelete: (id: string) => void
}

export function VideoGrid({ videos, onDelete }: VideoGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} onDelete={onDelete} />
      ))}
    </div>
  )
}
