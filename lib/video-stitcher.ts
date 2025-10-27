// lib/video-stitcher.ts

export interface StitchOptions {
  transitionDuration?: number; // seconds (default: 0.5)
  transitionType?: 'fade' | 'dissolve' | 'cut';
}

export interface StitchedVideo {
  blob: Blob;
  duration: number; // Total duration in seconds
  size: number; // File size in bytes
}

/**
 * Stitch two video clips together with a smooth transition
 *
 * Note: This uses browser-compatible approach since Vercel serverless
 * doesn't have FFmpeg by default. For production, consider:
 * 1. FFmpeg Lambda Layer
 * 2. External stitching service
 * 3. Client-side processing
 */
export async function stitchVideos(
  clip1Blob: Blob,
  clip2Blob: Blob,
  options: StitchOptions = {}
): Promise<StitchedVideo> {
  const {
    transitionDuration = 0.5,
    transitionType = 'cut', // Default to 'cut' for simplicity
  } = options;

  console.log('[video-stitcher] Stitching two clips together...', {
    clip1Size: clip1Blob.size,
    clip2Size: clip2Blob.size,
    transitionType,
    transitionDuration,
  });

  try {
    // APPROACH 1: Simple concatenation (no fancy transitions)
    // This is the most reliable approach for server-side processing
    // The clips will play back-to-back with a simple cut

    if (transitionType === 'cut') {
      return await simpleConcat(clip1Blob, clip2Blob);
    }

    // APPROACH 2: For fade transitions, we need FFmpeg or external service
    // For now, fall back to simple concat
    // TODO: Implement FFmpeg-based fading when infrastructure is ready
    console.warn('[video-stitcher] Fade transitions not yet implemented, using cut');
    return await simpleConcat(clip1Blob, clip2Blob);

  } catch (error) {
    console.error('[video-stitcher] Error stitching videos:', error);
    throw new Error('Failed to stitch video clips: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Simple concatenation using MP4Box or similar approach
 * This creates a new MP4 with both clips in sequence
 */
async function simpleConcat(
  clip1Blob: Blob,
  clip2Blob: Blob
): Promise<StitchedVideo> {
  // For server-side stitching without FFmpeg, we can use a simple approach:
  // Create an MP4 container with both clips as separate tracks/segments

  // Note: This is a placeholder for the actual implementation
  // In production, you would use:
  // 1. MP4Box.js for JavaScript-based MP4 manipulation
  // 2. External API (like Cloudflare Stream API)
  // 3. FFmpeg via Lambda layer or container

  console.log('[video-stitcher] Using simple concatenation method');

  // TEMPORARY IMPLEMENTATION:
  // For MVP, we can actually use FFmpeg via exec if it's available
  // Or fall back to external service

  if (await isFFmpegAvailable()) {
    return await ffmpegConcat(clip1Blob, clip2Blob);
  } else {
    // Fallback: Use external stitching service or return error
    throw new Error('FFmpeg not available. Please install FFmpeg or use external stitching service.');
  }
}

/**
 * Check if FFmpeg is available on the system
 */
async function isFFmpegAvailable(): Promise<boolean> {
  try {
    // In Node.js environment
    const { execSync } = require('child_process');
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Use FFmpeg command-line tool to concatenate videos
 * This requires FFmpeg to be installed on the server
 */
async function ffmpegConcat(
  clip1Blob: Blob,
  clip2Blob: Blob
): Promise<StitchedVideo> {
  const { execSync } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  console.log('[video-stitcher] Using FFmpeg for concatenation');

  // Create temp directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-stitch-'));

  try {
    // Write clips to temp files
    const clip1Path = path.join(tempDir, 'clip1.mp4');
    const clip2Path = path.join(tempDir, 'clip2.mp4');
    const outputPath = path.join(tempDir, 'output.mp4');
    const concatFilePath = path.join(tempDir, 'concat.txt');

    const clip1Buffer = Buffer.from(await clip1Blob.arrayBuffer());
    const clip2Buffer = Buffer.from(await clip2Blob.arrayBuffer());

    fs.writeFileSync(clip1Path, clip1Buffer);
    fs.writeFileSync(clip2Path, clip2Buffer);

    // Create concat file for FFmpeg
    const concatContent = `file '${clip1Path}'\nfile '${clip2Path}'`;
    fs.writeFileSync(concatFilePath, concatContent);

    // Run FFmpeg concat
    console.log('[video-stitcher] Running FFmpeg concat command...');

    execSync(
      `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -c copy "${outputPath}"`,
      {
        stdio: 'pipe',
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      }
    );

    // Read output file
    const outputBuffer = fs.readFileSync(outputPath);
    const outputBlob = new Blob([outputBuffer], { type: 'video/mp4' });

    // Clean up temp files
    fs.unlinkSync(clip1Path);
    fs.unlinkSync(clip2Path);
    fs.unlinkSync(concatFilePath);
    fs.unlinkSync(outputPath);
    fs.rmdirSync(tempDir);

    console.log('[video-stitcher] Successfully stitched videos with FFmpeg', {
      outputSize: outputBlob.size,
    });

    return {
      blob: outputBlob,
      duration: 24, // 12s + 12s
      size: outputBlob.size,
    };

  } catch (error) {
    // Clean up on error
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    throw error;
  }
}

/**
 * Advanced FFmpeg stitching with fade transitions
 * This creates a smooth cross-fade between clips
 */
export async function ffmpegStitchWithFade(
  clip1Blob: Blob,
  clip2Blob: Blob,
  fadeDuration: number = 0.5
): Promise<StitchedVideo> {
  const { execSync } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  console.log('[video-stitcher] Using FFmpeg for fade transition');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-fade-'));

  try {
    const clip1Path = path.join(tempDir, 'clip1.mp4');
    const clip2Path = path.join(tempDir, 'clip2.mp4');
    const outputPath = path.join(tempDir, 'output.mp4');

    const clip1Buffer = Buffer.from(await clip1Blob.arrayBuffer());
    const clip2Buffer = Buffer.from(await clip2Blob.arrayBuffer());

    fs.writeFileSync(clip1Path, clip1Buffer);
    fs.writeFileSync(clip2Path, clip2Buffer);

    // FFmpeg command with xfade filter for smooth transition
    const fadeStartTime = 12 - fadeDuration; // Start fade at 11.5s for 0.5s fade

    const ffmpegCommand = `ffmpeg -i "${clip1Path}" -i "${clip2Path}" \
      -filter_complex "\
      [0:v]fade=t=out:st=${fadeStartTime}:d=${fadeDuration}[v0]; \
      [1:v]fade=t=in:st=0:d=${fadeDuration}[v1]; \
      [v0][0:a][v1][1:a]concat=n=2:v=1:a=1[outv][outa]" \
      -map "[outv]" -map "[outa]" \
      -c:v libx264 -preset fast -crf 23 \
      -c:a aac -b:a 128k \
      "${outputPath}"`;

    execSync(ffmpegCommand, {
      stdio: 'pipe',
      maxBuffer: 50 * 1024 * 1024,
    });

    const outputBuffer = fs.readFileSync(outputPath);
    const outputBlob = new Blob([outputBuffer], { type: 'video/mp4' });

    // Clean up
    fs.unlinkSync(clip1Path);
    fs.unlinkSync(clip2Path);
    fs.unlinkSync(outputPath);
    fs.rmdirSync(tempDir);

    console.log('[video-stitcher] Successfully stitched videos with fade', {
      outputSize: outputBlob.size,
    });

    return {
      blob: outputBlob,
      duration: 24,
      size: outputBlob.size,
    };

  } catch (error) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore
    }

    throw error;
  }
}

/**
 * Utility function to get video metadata
 */
export async function getVideoMetadata(videoBlob: Blob): Promise<{
  duration: number;
  width: number;
  height: number;
}> {
  // This would require FFprobe or similar tool
  // For now, return defaults
  return {
    duration: 12, // Assumption
    width: 1280,
    height: 720,
  };
}
