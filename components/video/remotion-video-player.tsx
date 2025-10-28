'use client';

import { Player } from '@remotion/player';
import { VideoComposition } from '@/remotion/VideoComposition';

interface RemotionVideoPlayerProps {
  videoUrl: string;
  durationSeconds?: number; // Optional duration in seconds, defaults to 12
}

export function RemotionVideoPlayer({ videoUrl, durationSeconds = 12 }: RemotionVideoPlayerProps) {
  const fps = 30;
  const durationInFrames = durationSeconds * fps; // e.g., 12 seconds * 30fps = 360 frames

  return (
    <div className="aspect-video bg-black">
      <Player
        component={VideoComposition}
        inputProps={{ videoUrl }}
        durationInFrames={durationInFrames}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={fps}
        style={{
          width: '100%',
          height: '100%',
        }}
        controls
        clickToPlay
      />
    </div>
  );
}
