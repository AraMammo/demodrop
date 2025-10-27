import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getProject } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id

    const project = await getProject(params.id)

    if (!project) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Ensure user owns this project
    if (project.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Transform snake_case to camelCase for frontend
    const video = {
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
    }

    return NextResponse.json({ video })
  } catch (error) {
    console.error("Get video error:", error)
    return NextResponse.json({ error: "Failed to fetch video" }, { status: 500 })
  }
}
