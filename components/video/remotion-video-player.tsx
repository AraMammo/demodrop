'use client';

import { Player } from '@remotion/player';
import { VideoComposition } from '@/remotion/VideoComposition';

interface RemotionVideoPlayerProps {
  videoUrl: string;
}

export function RemotionVideoPlayer({ videoUrl }: RemotionVideoPlayerProps) {
  return (
    <div className="aspect-video bg-black">
      <Player
        component={VideoComposition}
        inputProps={{ videoUrl }}
        durationInFrames={900} // 30 seconds at 30fps
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
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
