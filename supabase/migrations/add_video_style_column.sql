-- Add video_style column to projects table
-- This column stores the user's selected video aesthetic (animated, cinematic, minimalist, analog)

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS video_style VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN projects.video_style IS 'Video aesthetic style: animated, cinematic, minimalist, or analog';
