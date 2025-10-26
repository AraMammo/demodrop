import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildSoraPrompt } from '@/lib/sora-prompt-builder';
import { scrapeWebsite } from '@/lib/dumpling';
import { updateProject } from '@/lib/db';
import { uploadVideoToStorage } from '@/lib/storage';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { projectId, websiteUrl, stylePreset, customInstructions } = await req.json();

    await updateProject(projectId, { status: 'scraping' });

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

    const prompt = await buildSoraPrompt({
      websiteData,
      stylePreset,
      customInstructions,
    });

    await updateProject(projectId, {
      status: 'generating',
      prompt,
    });

    let soraJob;
    try {
      soraJob = await openai.videos.create({
        model: 'sora-2',
        prompt: prompt,
        seconds: '30',
        size: '1920x1080',
      });
    } catch (error) {
      await updateProject(projectId, {
        status: 'failed',
        error: 'Failed to start Sora generation',
      });
      return NextResponse.json({ error: 'Sora API failed' }, { status: 500 });
    }

    await updateProject(projectId, {
      soraJobId: soraJob.id,
    });

    const result = await pollSoraJob(projectId, soraJob.id);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Process video error:', error);
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}

async function pollSoraJob(projectId: string, soraJobId: string) {
  const maxAttempts = 60;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const soraJob = await openai.videos.retrieve(soraJobId);
      
      await updateProject(projectId, {
        progress: soraJob.progress || 0,
      });
      
      if (soraJob.status === 'completed') {
        const videoResponse = await openai.videos.downloadContent(soraJobId);
        const videoBlob = await videoResponse.blob();
        
        const videoUrl = await uploadVideoToStorage(videoBlob, projectId);
        
        await updateProject(projectId, {
          status: 'completed',
          videoUrl,
          completedAt: Date.now(),
        });
        
        return { status: 'completed', videoUrl };
      }
      
      if (soraJob.status === 'failed') {
        await updateProject(projectId, {
          status: 'failed',
          error: soraJob.error?.message || 'Sora generation failed',
        });
        return { status: 'failed', error: soraJob.error };
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.error('Poll error:', error);
    }
  }
  
  await updateProject(projectId, {
    status: 'failed',
    error: 'Generation timeout - please try again',
  });
  
  return { status: 'failed', error: 'Timeout' };
}
