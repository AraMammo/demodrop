import { Video, AbsoluteFill } from 'remotion';

interface VideoCompositionProps {
  videoUrl: string;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({ videoUrl }) => {
  return (
    <AbsoluteFill>
      <Video src={videoUrl} />
    </AbsoluteFill>
  );
};
