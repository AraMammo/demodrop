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

    return NextResponse.json({ video: project })
  } catch (error) {
    console.error("Get video error:", error)
    return NextResponse.json({ error: "Failed to fetch video" }, { status: 500 })
  }
}
