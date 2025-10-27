// app/api/process-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildSoraPrompt, STYLE_PRESETS } from '@/lib/sora-prompt-builder';
import { scrapeWebsite } from '@/lib/dumpling';
import { updateProject, getProject, incrementUserVideoCount } from '@/lib/db';
import { uploadVideoToStorage } from '@/lib/storage';
import { createProductionPrompt } from '@/lib/prompt-orchestrator';
import { splitPromptIntoTwo } from '@/lib/prompt-splitter';
import { stitchVideos } from '@/lib/video-stitcher';

// Lazy initialization to avoid build-time errors
let openai: OpenAI | null = null;
function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'placeholder',
    });
  }
  return openai;
}

// Increased duration to handle 2-clip generation (2x ~5min + stitching)
export const maxDuration = 600; // 10 minutes

export async function POST(req: NextRequest) {
  let projectId: string | undefined;
  try {
    console.log('[process-video] Request received');
    const body = await req.json();
    projectId = body.projectId;
    const { websiteUrl, stylePreset, customInstructions } = body;

    console.log('[process-video] Processing project:', projectId, 'URL:', websiteUrl);

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    // Phase 1: Scrape website
    console.log('[process-video] Phase 1: Starting website scrape');
    await updateProject(projectId, { status: 'scraping', progress: 10 });

    let websiteData;
    try {
      websiteData = await scrapeWebsite(websiteUrl);
      console.log('[process-video] Website scraped successfully:', {
        title: websiteData.title,
        heroText: websiteData.heroText?.substring(0, 50),
        featuresCount: websiteData.features?.length,
        industry: websiteData.industry,
        brand: {
          colors: websiteData.brand?.colors,
          tone: websiteData.brand?.tone,
          visualStyle: websiteData.brand?.visualStyle,
          keyMessage: websiteData.brand?.keyMessage?.substring(0, 50),
        },
      });
    } catch (error) {
      console.error('[process-video] Scraping failed:', error);
      await updateProject(projectId, {
        status: 'failed',
        error: 'Failed to scrape website',
      });
      return NextResponse.json({ error: 'Scraping failed' }, { status: 500 });
    }

    // Phase 2: AI Orchestration - Enhance the prompt & Split into 2 parts
    console.log('[process-video] Phase 2: Generating and splitting AI prompt');
    await updateProject(projectId, { status: 'generating', progress: 20 });

    const preset = STYLE_PRESETS[stylePreset];

    // For 24-second videos, we generate 2x 12-second clips
    const clipDuration = 12;
    const totalDuration = preset.duration; // Should be 24

    let fullPrompt: string;

    try {
      // Transform preset to match orchestrator expectations
      const orchestratorPreset = {
        name: preset.name,
        tone: preset.tone,
        pacing: preset.pacing_style,
        aesthetic: preset.visual_aesthetic,
      };

      // Generate full 24-second prompt
      fullPrompt = await createProductionPrompt(
        websiteData,
        orchestratorPreset,
        customInstructions,
        totalDuration  // 24 seconds
      );

      console.log('[process-video] AI-orchestrated prompt created for', totalDuration, 'seconds');
      console.log('[process-video] Full prompt preview:', fullPrompt.substring(0, 300) + '...');

    } catch (orchestrationError) {
      console.log('[process-video] Orchestration failed, falling back to basic prompt:', orchestrationError);

      // Fallback to basic prompt if orchestrator fails
      fullPrompt = await buildSoraPrompt({
        websiteData,
        stylePreset,
        customInstructions,
        actualDuration: totalDuration,
      });
    }

    // Phase 2b: Split prompt into 2 parts
    console.log('[process-video] Splitting prompt into 2x 12-second parts...');
    await updateProject(projectId, { progress: 25 });

    let splitPrompt;
    try {
      splitPrompt = await splitPromptIntoTwo(
        fullPrompt,
        websiteData,
        {
          name: preset.name,
          tone: preset.tone,
          pacing: preset.pacing_style,
          aesthetic: preset.visual_aesthetic,
        }
      );

      console.log('[process-video] Prompt split successfully:', {
        part1: splitPrompt.part1.description,
        part2: splitPrompt.part2.description,
        transition: splitPrompt.transitionNote,
      });

    } catch (splitError) {
      console.error('[process-video] Prompt splitting failed:', splitError);
      await updateProject(projectId, {
        status: 'failed',
        error: 'Failed to split prompt for 2-clip generation',
      });
      return NextResponse.json({ error: 'Prompt splitting failed' }, { status: 500 });
    }

    // Store full narrative
    await updateProject(projectId, {
      status: 'generating',
      prompt: splitPrompt.fullNarrative,
      progress: 30,
    });

    // Phase 3a: Generate Clip 1 (0-12s)
    console.log('[process-video] Phase 3a: Generating Clip 1 (0-12s)');
    await updateProject(projectId, { progress: 35 });

    let clip1Job;
    try {
      clip1Job = await getOpenAI().videos.create({
        model: 'sora-2',
        prompt: splitPrompt.part1.prompt,
        seconds: '12',
        size: '1280x720',
      });

      console.log('[process-video] Clip 1 job created:', clip1Job.id);

    } catch (error: any) {
      console.error('[process-video] Clip 1 Sora API error:', error);
      await updateProject(projectId, {
        status: 'failed',
        error: 'Failed to start Clip 1 generation: ' + error.message,
      });
      return NextResponse.json({ error: 'Clip 1 generation failed' }, { status: 500 });
    }

    // Poll for Clip 1 completion (progress: 35-60%)
    const clip1Result = await pollSoraJobWithProgress(projectId, clip1Job.id, 35, 60);

    if (clip1Result.status !== 'completed' || !clip1Result.videoBlob) {
      return NextResponse.json({ error: 'Clip 1 generation failed' }, { status: 500 });
    }

    console.log('[process-video] Clip 1 completed, size:', clip1Result.videoBlob.size);

    // Phase 3b: Generate Clip 2 (12-24s)
    console.log('[process-video] Phase 3b: Generating Clip 2 (12-24s)');
    await updateProject(projectId, { progress: 60 });

    let clip2Job;
    try {
      clip2Job = await getOpenAI().videos.create({
        model: 'sora-2',
        prompt: splitPrompt.part2.prompt,
        seconds: '12',
        size: '1280x720',
      });

      console.log('[process-video] Clip 2 job created:', clip2Job.id);

    } catch (error: any) {
      console.error('[process-video] Clip 2 Sora API error:', error);
      await updateProject(projectId, {
        status: 'failed',
        error: 'Failed to start Clip 2 generation: ' + error.message,
      });
      return NextResponse.json({ error: 'Clip 2 generation failed' }, { status: 500 });
    }

    // Poll for Clip 2 completion (progress: 60-85%)
    const clip2Result = await pollSoraJobWithProgress(projectId, clip2Job.id, 60, 85);

    if (clip2Result.status !== 'completed' || !clip2Result.videoBlob) {
      return NextResponse.json({ error: 'Clip 2 generation failed' }, { status: 500 });
    }

    console.log('[process-video] Clip 2 completed, size:', clip2Result.videoBlob.size);

    // Phase 4: Stitch clips together
    console.log('[process-video] Phase 4: Stitching clips together');
    await updateProject(projectId, { progress: 85 });

    let finalVideoBlob;
    try {
      const stitchedVideo = await stitchVideos(
        clip1Result.videoBlob,
        clip2Result.videoBlob,
        {
          transitionType: 'cut', // Simple cut for reliability
          transitionDuration: 0,
        }
      );

      finalVideoBlob = stitchedVideo.blob;

      console.log('[process-video] Videos stitched successfully:', {
        finalSize: finalVideoBlob.size,
        duration: stitchedVideo.duration,
      });

    } catch (stitchError) {
      console.error('[process-video] Stitching failed:', stitchError);
      await updateProject(projectId, {
        status: 'failed',
        error: 'Failed to stitch video clips: ' + (stitchError instanceof Error ? stitchError.message : 'Unknown error'),
      });
      return NextResponse.json({ error: 'Video stitching failed' }, { status: 500 });
    }

    // Phase 5: Upload final video
    console.log('[process-video] Phase 5: Uploading final video');
    await updateProject(projectId, { progress: 95 });

    let videoUrl;
    try {
      videoUrl = await uploadVideoToStorage(finalVideoBlob, projectId);
      console.log('[process-video] Video uploaded successfully:', videoUrl);
    } catch (uploadError) {
      console.error('[process-video] Upload failed:', uploadError);
      await updateProject(projectId, {
        status: 'failed',
        error: 'Failed to upload video',
      });
      return NextResponse.json({ error: 'Video upload failed' }, { status: 500 });
    }

    // Phase 6: Complete
    await updateProject(projectId, {
      status: 'completed',
      videoUrl,
      completedAt: Date.now(),
      progress: 100,
    });

    // Increment user's video count
    const project = await getProject(projectId);
    if (project && project.user_id) {
      try {
        await incrementUserVideoCount(project.user_id);
        console.log('[process-video] User video count incremented for user:', project.user_id);
      } catch (error) {
        console.error('[process-video] Failed to increment user video count:', error);
        // Don't fail the request if this fails
      }
    }

    return NextResponse.json({ status: 'completed', videoUrl });

  } catch (error) {
    console.error('Process video error:', error);

    // Try to update project status to failed if we have projectId
    if (projectId) {
      try {
        await updateProject(projectId, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Processing failed',
        });
      } catch (updateError) {
        console.error('Failed to update project status:', updateError);
      }
    }

    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Poll a Sora job with progress mapped to a specific range
 * @param projectId - Project ID to update
 * @param soraJobId - Sora job ID to poll
 * @param startProgress - Starting progress percentage (e.g., 35)
 * @param endProgress - Ending progress percentage (e.g., 60)
 * @returns Result with status and videoBlob if completed
 */
async function pollSoraJobWithProgress(
  projectId: string,
  soraJobId: string,
  startProgress: number,
  endProgress: number
): Promise<{ status: string; videoBlob?: Blob; error?: any }> {
  const maxAttempts = 60; // 5 minutes max (5s intervals)

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const soraJob = await getOpenAI().videos.retrieve(soraJobId);

      // Map Sora progress (0-100) to our range (startProgress-endProgress)
      const progressRange = endProgress - startProgress;
      const mappedProgress = Math.min(
        endProgress,
        startProgress + (soraJob.progress || 0) * (progressRange / 100)
      );

      await updateProject(projectId, {
        progress: Math.round(mappedProgress),
      });

      if (soraJob.status === 'completed') {
        console.log(`[poll] Sora job ${soraJobId} completed`);

        // Download video content
        const videoResponse = await getOpenAI().videos.downloadContent(soraJobId);
        const videoBlob = await videoResponse.blob();

        console.log(`[poll] Downloaded video blob, size: ${videoBlob.size} bytes`);

        // Set progress to end of range
        await updateProject(projectId, {
          progress: endProgress,
        });

        return { status: 'completed', videoBlob };
      }

      if (soraJob.status === 'failed') {
        console.error(`[poll] Sora job ${soraJobId} failed:`, soraJob.error);
        await updateProject(projectId, {
          status: 'failed',
          error: soraJob.error?.message || 'Sora generation failed',
        });
        return { status: 'failed', error: soraJob.error };
      }

      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
      console.error('[poll] Poll error:', error);
      // Continue polling unless max attempts reached
    }
  }

  // Timeout
  console.error(`[poll] Sora job ${soraJobId} timeout after ${maxAttempts} attempts`);
  await updateProject(projectId, {
    status: 'failed',
    error: 'Video generation timeout - please try again',
  });

  return { status: 'failed', error: 'Timeout' };
}
