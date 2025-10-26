// app/api/process-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildSoraPrompt, STYLE_PRESETS } from '@/lib/sora-prompt-builder';
import { scrapeWebsite } from '@/lib/dumpling';
import { updateProject } from '@/lib/db';
import { uploadVideoToStorage } from '@/lib/storage';
import { createProductionPrompt } from '@/lib/prompt-orchestrator';

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

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { projectId, websiteUrl, stylePreset, customInstructions } = await req.json();

    // Phase 1: Scrape website
    await updateProject(projectId, { status: 'scraping', progress: 10 });

    let websiteData;
    try {
      websiteData = await scrapeWebsite(websiteUrl);
    } catch (error) {
      await updateProject(projectId, {
        status: 'failed',
        error: 'Failed to scrape website',
      });
      return NextResponse.json({ error: 'Scraping failed' }, { status: 500 });
    }

    // Phase 2: AI Orchestration - Enhance the prompt
    await updateProject(projectId, { status: 'orchestrating', progress: 20 });
    
    const preset = STYLE_PRESETS[stylePreset];
    let prompt;
    
    try {
      // Use AI orchestrator to create production-quality, unique prompt
      prompt = await createProductionPrompt(
        websiteData,
        preset,
        customInstructions,
        preset.duration
      );
      
      console.log('AI-orchestrated prompt created');
      
    } catch (orchestrationError) {
      console.log('Orchestration failed, falling back to basic prompt:', orchestrationError);
      
      // Fallback to basic prompt if orchestrator fails
      prompt = await buildSoraPrompt({
        websiteData,
        stylePreset,
        customInstructions,
      });
    }

    // Phase 3: Submit to Sora (TODO: Implement when Sora API is available)
    await updateProject(projectId, {
      status: 'generating',
      prompt,
      progress: 30,
    });

    // TODO: Sora API integration when available
    // For now, return the enhanced prompt for review
    await updateProject(projectId, {
      status: 'completed',
      prompt,
      progress: 100,
      completedAt: Date.now(),
    });

    return NextResponse.json({
      status: 'completed',
      message: 'AI-orchestrated prompt created successfully. Sora API integration pending.',
      prompt,
    });

  } catch (error) {
    console.error('Process video error:', error);
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}

// TODO: Implement when Sora API is available
// async function pollSoraJob(projectId: string, soraJobId: string) {
//   const maxAttempts = 60; // 5 minutes max (5s intervals)
//
//   for (let i = 0; i < maxAttempts; i++) {
//     try {
//       const soraJob = await getOpenAI().videos.retrieve(soraJobId);
//
//       // Map Sora progress to our scale (35-95%)
//       const mappedProgress = Math.min(95, 35 + (soraJob.progress || 0) * 0.6);
//
//       await updateProject(projectId, {
//         progress: Math.round(mappedProgress),
//       });
//
//       if (soraJob.status === 'completed') {
//         console.log('Sora generation completed');
//
//         // Download video content
//         await updateProject(projectId, { progress: 96 });
//         const videoResponse = await getOpenAI().videos.downloadContent(soraJobId);
//         const videoBlob = await videoResponse.blob();
//
//         // Upload to storage
//         await updateProject(projectId, { progress: 98 });
//         const videoUrl = await uploadVideoToStorage(videoBlob, projectId);
//
//         // Final update
//         await updateProject(projectId, {
//           status: 'completed',
//           videoUrl,
//           completedAt: Date.now(),
//           progress: 100,
//         });
//
//         console.log('Video uploaded successfully:', videoUrl);
//
//         return { status: 'completed', videoUrl };
//       }
//
//       if (soraJob.status === 'failed') {
//         console.error('Sora job failed:', soraJob.error);
//         await updateProject(projectId, {
//           status: 'failed',
//           error: soraJob.error?.message || 'Sora generation failed',
//         });
//         return { status: 'failed', error: soraJob.error };
//       }
//
//       // Wait 5 seconds before next poll
//       await new Promise(resolve => setTimeout(resolve, 5000));
//
//     } catch (error) {
//       console.error('Poll error:', error);
//       // Continue polling unless max attempts reached
//     }
//   }
//
//   // Timeout
//   console.error('Sora job timeout');
//   await updateProject(projectId, {
//     status: 'failed',
//     error: 'Generation timeout - please try again',
//   });
//
//   return { status: 'failed', error: 'Timeout' };
// }
