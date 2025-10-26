import { put } from '@vercel/blob';

export async function uploadVideoToStorage(
  videoBlob: Blob,
  projectId: string
): Promise<string> {
  try {
    const filename = `videos/${projectId}.mp4`;
    
    const blob = await put(filename, videoBlob, {
      access: 'public',
      contentType: 'video/mp4',
    });
    
    return blob.url;
    
  } catch (error) {
    console.error('Storage upload error:', error);
    throw new Error('Failed to upload video to storage');
  }
}
