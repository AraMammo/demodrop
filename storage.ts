// lib/storage.ts
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

// Alternative: If you prefer AWS S3
// Uncomment and use this instead:
/*
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadVideoToStorage(
  videoBlob: Blob,
  projectId: string
): Promise<string> {
  const buffer = Buffer.from(await videoBlob.arrayBuffer());
  const key = `videos/${projectId}.mp4`;
  
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: 'video/mp4',
    })
  );
  
  return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`;
}
*/
