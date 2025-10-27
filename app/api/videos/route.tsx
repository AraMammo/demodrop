import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    console.log("[v0] API /videos - Request received")
    console.log(
      "[v0] API /videos - Cookies:",
      req.cookies.getAll().map((c) => c.name),
    )
    // </CHANGE>

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log("[v0] API /videos - User found:", !!user, user?.id)
    // </CHANGE>

    if (!user) {
      console.log("[v0] API /videos - Returning 401 Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id

    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    let query = supabase.from("projects").select("*").eq("user_id", userId).order("created_at", { ascending: false })

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    if (search) {
      query = query.ilike("website_url", `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("[v0] Supabase query error:", error)

      // Check if it's a rate limit error
      if (error.message?.includes("rate limit") || error.message?.includes("too many")) {
        return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 })
      }

      throw error
    }

    console.log("[v0] API /videos - Returning", data?.length || 0, "videos")
    // </CHANGE>

    // Transform snake_case to camelCase for frontend
    const videos = (data || []).map((project: any) => ({
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
    }))

    return NextResponse.json({ videos })
  } catch (error) {
    console.error("[v0] Fetch videos error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch videos" },
      { status: 500 },
    )
  }
}
