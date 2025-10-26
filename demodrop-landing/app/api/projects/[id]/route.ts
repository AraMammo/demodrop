import { NextResponse } from "next/server"

// Simulate project status storage
const projectStatuses = new Map<
  string,
  {
    status: "queued" | "generating" | "complete" | "error"
    progress: number
    videoUrl?: string
    error?: string
    startTime: number
  }
>()

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Get or initialize project status
  let project = projectStatuses.get(id)

  if (!project) {
    // Initialize new project
    project = {
      status: "generating",
      progress: 10,
      startTime: Date.now(),
    }
    projectStatuses.set(id, project)
  }

  // Simulate progress over time
  const elapsed = Date.now() - project.startTime
  const simulatedProgress = Math.min(95, Math.floor((elapsed / 240000) * 100)) // 4 minutes to 95%

  if (project.status === "generating") {
    project.progress = Math.max(project.progress, simulatedProgress)

    // Simulate completion after 4 minutes
    if (elapsed > 240000) {
      project.status = "complete"
      project.progress = 100
      project.videoUrl = "/placeholder-video.mp4" // In production, this would be the actual video URL
    }
  }

  console.log("[v0] Project status check:", { id, status: project.status, progress: project.progress })

  return NextResponse.json({
    status: project.status,
    progress: project.progress,
    videoUrl: project.videoUrl,
    error: project.error,
  })
}
