import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { v4 as uuidv4 } from "uuid"
import { createProject, checkUserQuota, getUser, createUser } from "@/lib/db"
import { STYLE_PRESETS } from "@/lib/sora-prompt-builder"

export const maxDuration = 300 // Match process-video timeout

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 })
    }

    const userId = user.id

    // Ensure user exists in database
    let dbUser = await getUser(userId)
    if (!dbUser) {
      const email = user.email || `${userId}@supabase.user`
      dbUser = await createUser({ id: userId, email })
    }

    // Check quota
    const quota = await checkUserQuota(userId)
    if (!quota.hasQuota) {
      return NextResponse.json(
        {
          error: "Quota exceeded",
          message: `You've used ${quota.videosUsed} of ${quota.videosLimit} videos. Upgrade to Pro for unlimited videos.`,
          videosUsed: quota.videosUsed,
          videosLimit: quota.videosLimit,
        },
        { status: 403 },
      )
    }

    const body = await req.json()
    const { websiteUrl, stylePreset, videoStyle, customInstructions } = body

    if (!websiteUrl) {
      return NextResponse.json({ error: "Website URL is required" }, { status: 400 })
    }

    if (!STYLE_PRESETS[stylePreset]) {
      return NextResponse.json({ error: "Invalid style preset" }, { status: 400 })
    }

    const projectId = uuidv4()
    await createProject({
      id: projectId,
      userId,
      websiteUrl,
      stylePreset,
      videoStyle,
      customInstructions,
      status: "scraping",
      createdAt: Date.now(),
    })

    // Trigger async processing (fire-and-forget)
    // Use req.headers to get the actual host
    const protocol = req.headers.get('x-forwarded-proto') || 'https'
    const host = req.headers.get('host') || req.headers.get('x-forwarded-host')

    const baseUrl = host
      ? `${protocol}://${host}`
      : (process.env.NEXT_PUBLIC_APP_URL ||
         (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"))

    const processUrl = `${baseUrl}/api/process-video`

    console.log('[generate-video] Triggering background process:', processUrl, 'from host:', host)

    // Initiate the background process and wait for it to start (but not complete)
    try {
      const response = await fetch(processUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          websiteUrl,
          stylePreset,
          videoStyle,
          customInstructions,
        }),
      })

      console.log('[generate-video] Background process initiated, status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[generate-video] Background process returned error:', errorText)
      }
    } catch (err) {
      console.error('[generate-video] Background process error:', err)
      // Don't fail the whole request, just log it
    }

    return NextResponse.json({
      projectId,
      status: "queued",
      message: "Video generation started",
    })
  } catch (error) {
    console.error("Generate video error:", error)
    return NextResponse.json({ error: "Failed to start video generation" }, { status: 500 })
  }
}
