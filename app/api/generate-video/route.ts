import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createProject } from '@/lib/db';
import { STYLE_PRESETS } from '@/lib/sora-prompt-builder';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { websiteUrl, stylePreset, customInstructions, userId } = body;

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

    const processUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/process-video`;
    
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
