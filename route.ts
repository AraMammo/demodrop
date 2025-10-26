// app/api/generate-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Import your prompt builder (we'll create this next)
import { buildSoraPrompt, STYLE_PRESETS } from '@/lib/sora-prompt-builder';
import { scrapeWebsite } from '@/lib/dumpling';
import { createProject, updateProject } from '@/lib/db';

export const maxDuration = 60; // Vercel Pro allows up to 60s for API routes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { websiteUrl, stylePreset, customInstructions, userId } = body;

    // Validate inputs
    if (!websiteUrl) {
      return NextResponse.json(
        { error: 'Website URL is required' },
        { status: 400 }
      );
    }

    if (!STYLE_PRESETS[stylePreset]) {
      return NextResponse.json(
        { error: 'Invalid style preset' },
        { status: 400 }
      );
    }

    // Create project in database
    const projectId = uuidv4();
    await createProject({
      id: projectId,
      userId,
      websiteUrl,
      stylePreset,
      customInstructions,
      status: 'scraping',
      createdAt: Date.now(),
    });

    // Start async processing via Vercel Background Function or trigger webhook
    // Since Vercel serverless has 60s timeout, we queue the job and return immediately
    const processUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/process-video`;
    
    // Trigger processing (fire and forget)
    fetch(processUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        websiteUrl,
        stylePreset,
        customInstructions,
      }),
    }).catch(console.error);

    return NextResponse.json({
      projectId,
      status: 'queued',
      message: 'Video generation started',
    });

  } catch (error) {
    console.error('Generate video error:', error);
    return NextResponse.json(
      { error: 'Failed to start video generation' },
      { status: 500 }
    );
  }
}
