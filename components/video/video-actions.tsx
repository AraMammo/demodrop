'use client';

import { Button } from '@/components/ui/button';
import { Download, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface VideoActionsProps {
  videoUrl: string;
  videoId: string;
}

export function VideoActions({ videoUrl, videoId }: VideoActionsProps) {
  const router = useRouter();

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `video-${videoId}.mp4`;
    a.click();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this video? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/video/${videoId}/delete`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        alert('Failed to delete video');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete video');
    }
  };

  return (
    <div className="flex gap-3">
      <Button onClick={handleDownload} className="flex-1">
        <Download className="w-4 h-4 mr-2" />
        Download Video
      </Button>
      <Button variant="outline" onClick={handleDelete}>
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>
    </div>
  );
}
