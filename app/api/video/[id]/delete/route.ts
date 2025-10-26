import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { del } from "@vercel/blob"

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id

    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("video_url, user_id")
      .eq("id", params.id)
      .single()

    if (fetchError || !project) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Verify ownership
    if (project.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete from Blob storage if video exists
    if (project.video_url) {
      try {
        await del(project.video_url)
      } catch (error) {
        console.error("Failed to delete from blob storage:", error)
      }
    }

    const { error: deleteError } = await supabase.from("projects").delete().eq("id", params.id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Failed to delete video" }, { status: 500 })
  }
}
