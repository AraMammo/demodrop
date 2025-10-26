'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { VideoGrid } from '@/components/dashboard/video-grid';
import { VideoFilters } from '@/components/dashboard/video-filters';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Video {
  id: string;
  website_url: string;
  style_preset: string;
  status: string;
  video_url?: string;
  created_at: number;
  completed_at?: number;
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchVideos();
    }
  }, [isLoaded, isSignedIn, filter, search]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (search) params.set('search', search);

      const response = await fetch(`/api/videos?${params}`);
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Delete this video? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/video/${videoId}/delete`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchVideos(); // Refresh list
      } else {
        alert('Failed to delete video');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete video');
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Please sign in to view your dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Video Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your AI-generated demo videos
            </p>
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

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {search || filter !== 'all'
                ? 'No videos found matching your filters'
                : 'No videos yet. Create your first one!'}
            </p>
            {!search && filter === 'all' && (
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
  );
}
