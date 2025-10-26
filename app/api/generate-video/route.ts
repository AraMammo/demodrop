import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuidv4 } from 'uuid';
import { createProject, checkUserQuota, getUser, createUser } from '@/lib/db';
import { STYLE_PRESETS } from '@/lib/sora-prompt-builder';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // Ensure user exists in database
    let user = await getUser(userId);
    if (!user) {
      // Get user email from Clerk
      const clerkUser = await (await import('@clerk/nextjs/server')).currentUser();
      const email = clerkUser?.emailAddresses[0]?.emailAddress || `${userId}@clerk.user`;
      user = await createUser({ id: userId, email });
    }

    // Check quota
    const quota = await checkUserQuota(userId);
    if (!quota.hasQuota) {
      return NextResponse.json(
        {
          error: 'Quota exceeded',
          message: `You've used ${quota.videosUsed} of ${quota.videosLimit} videos. Upgrade to Pro for unlimited videos.`,
          videosUsed: quota.videosUsed,
          videosLimit: quota.videosLimit,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { websiteUrl, stylePreset, customInstructions } = body;

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

    // Trigger async processing (fire-and-forget)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000';
    const processUrl = `${baseUrl}/api/process-video`;

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
