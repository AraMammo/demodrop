import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { websiteUrl, stylePreset, customInstructions } = body

    // Validate input
    if (!websiteUrl) {
      return NextResponse.json({ error: "Website URL is required" }, { status: 400 })
    }

    // Simulate project creation
    // In production, this would call your actual video generation service
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(7)}`

    console.log("[v0] Video generation started:", {
      projectId,
      websiteUrl,
      stylePreset,
      customInstructions,
    })

    // Return project ID immediately
    return NextResponse.json({ projectId })
  } catch (error) {
    console.error("[v0] Error in generate-video:", error)
    return NextResponse.json({ error: "Failed to start video generation" }, { status: 500 })
  }
}
