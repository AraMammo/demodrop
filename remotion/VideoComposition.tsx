import { Video, AbsoluteFill } from 'remotion';

export interface VideoCompositionProps {
  videoUrl?: string;
}

export const VideoComposition = ({ videoUrl = '' }: VideoCompositionProps) => {
  return (
    <AbsoluteFill>
      {videoUrl && <Video src={videoUrl} />}
    </AbsoluteFill>
  );
};
