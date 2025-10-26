import { createClient } from "@/lib/supabase/server"

export interface Project {
  id: string
  userId?: string
  websiteUrl: string
  stylePreset: string
  customInstructions?: string
  status: "scraping" | "generating" | "completed" | "failed"
  progress?: number
  prompt?: string
  soraJobId?: string
  videoUrl?: string
  error?: string
  createdAt: number
  completedAt?: number
}

export interface User {
  id: string
  email: string
  planType: "free" | "pro" | "enterprise"
  videosUsed: number
  videosLimit: number
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  subscriptionStatus?: string
  createdAt: number
  updatedAt: number
}

export const PLAN_LIMITS = {
  free: 1,
  pro: 999999, // Effectively unlimited
  enterprise: 999999,
}

export async function createProject(project: Project) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("projects")
    .insert({
      id: project.id,
      user_id: project.userId || null,
      website_url: project.websiteUrl,
      style_preset: project.stylePreset,
      custom_instructions: project.customInstructions || null,
      status: project.status,
      progress: project.progress || 0,
      created_at: project.createdAt,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProject(projectId: string, updates: Partial<Project>) {
  const supabase = await createClient()

  const updateData: any = {}

  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.progress !== undefined) updateData.progress = updates.progress
  if (updates.prompt !== undefined) updateData.prompt = updates.prompt
  if (updates.soraJobId !== undefined) updateData.sora_job_id = updates.soraJobId
  if (updates.videoUrl !== undefined) updateData.video_url = updates.videoUrl
  if (updates.error !== undefined) updateData.error = updates.error
  if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt

  const { data, error } = await supabase.from("projects").update(updateData).eq("id", projectId).select().single()

  if (error) throw error
  return data
}

export async function getProject(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single()

  if (error) {
    if (error.code === "PGRST116") return null // Not found
    throw error
  }

  return data
}

export async function getUserProjects(userId: string, limit = 20) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// User Management Functions

export async function getUser(userId: string): Promise<User | null> {
  // For now, return a default user structure
  // In production, you'd query a users table or use Supabase auth metadata
  return {
    id: userId,
    email: "",
    planType: "free",
    videosUsed: 0,
    videosLimit: PLAN_LIMITS.free,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export async function createUser(user: {
  id: string
  email: string
  planType?: "free" | "pro" | "enterprise"
}) {
  // User creation is handled by Supabase auth
  // This function is kept for compatibility
  return {
    id: user.id,
    email: user.email,
    plan_type: user.planType || "free",
    videos_used: 0,
    videos_limit: PLAN_LIMITS[user.planType || "free"],
    created_at: Date.now(),
    updated_at: Date.now(),
  }
}

export async function checkUserQuota(userId: string): Promise<{
  hasQuota: boolean
  videosUsed: number
  videosLimit: number
  planType: string
}> {
  const user = await getUser(userId)

  if (!user) {
    throw new Error("User not found")
  }

  return {
    hasQuota: user.videosUsed < user.videosLimit,
    videosUsed: user.videosUsed,
    videosLimit: user.videosLimit,
    planType: user.planType,
  }
}

export async function incrementUserVideoCount(userId: string) {
  // This would update user metadata in Supabase
  // For now, it's a no-op since we're using free tier
  return
}

export async function updateUserSubscription(
  userId: string,
  updates: {
    planType?: "free" | "pro" | "enterprise"
    stripeCustomerId?: string
    stripeSubscriptionId?: string
    subscriptionStatus?: string
  },
) {
  // This would update user metadata in Supabase
  // For now, return a mock response
  return {
    id: userId,
    plan_type: updates.planType || "free",
    stripe_customer_id: updates.stripeCustomerId,
    stripe_subscription_id: updates.stripeSubscriptionId,
    subscription_status: updates.subscriptionStatus,
    updated_at: Date.now(),
  }
}
