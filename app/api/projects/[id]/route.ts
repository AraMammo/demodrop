import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    const project = await getProject(projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    console.log('[api/projects] Raw project from DB:', {
      status: project.status,
      progress: project.progress,
      sora_job_id: project.sora_job_id,
    });

    // Transform snake_case to camelCase for frontend
    const transformedProject = {
      id: project.id,
      userId: project.user_id,
      websiteUrl: project.website_url,
      stylePreset: project.style_preset,
      customInstructions: project.custom_instructions,
      status: project.status,
      progress: project.progress,
      prompt: project.prompt,
      soraJobId: project.sora_job_id,
      videoUrl: project.video_url,
      error: project.error,
      createdAt: project.created_at,
      completedAt: project.completed_at,
    };

    console.log('[api/projects] Transformed for frontend:', {
      status: transformedProject.status,
      progress: transformedProject.progress,
      soraJobId: transformedProject.soraJobId,
    });

    return NextResponse.json(transformedProject);
    
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}
