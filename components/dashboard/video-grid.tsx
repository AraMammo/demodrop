'use client';

import { VideoCard } from './video-card';

interface Video {
  id: string;
  website_url: string;
  style_preset: string;
  status: string;
  video_url?: string;
  created_at: number;
}

interface VideoGridProps {
  videos: Video[];
  onDelete: (id: string) => void;
}

export function VideoGrid({ videos, onDelete }: VideoGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} onDelete={onDelete} />
      ))}
    </div>
  );
}
