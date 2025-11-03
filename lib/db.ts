import { createClient } from "@/lib/supabase/server"

export interface Project {
  id: string
  userId?: string
  websiteUrl: string
  stylePreset: string
  videoStyle?: string
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
      video_style: project.videoStyle || null,
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
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null // Not found
    throw error
  }

  if (!data) return null

  return {
    id: data.id,
    email: data.email,
    planType: data.plan_type || "free",
    videosUsed: data.videos_used || 0,
    videosLimit: data.videos_limit || PLAN_LIMITS.free,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    subscriptionStatus: data.subscription_status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function createUser(user: {
  id: string
  email: string
  planType?: "free" | "pro" | "enterprise"
}): Promise<User> {
  const supabase = await createClient()
  const planType = user.planType || "free"
  const now = Date.now()

  const { data, error } = await supabase
    .from("users")
    .insert({
      id: user.id,
      email: user.email,
      plan_type: planType,
      videos_used: 0,
      videos_limit: PLAN_LIMITS[planType],
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (error) {
    // If user already exists, return the existing user
    if (error.code === "23505") { // Unique violation
      const existingUser = await getUser(user.id)
      if (existingUser) return existingUser
    }
    throw error
  }

  return {
    id: data.id,
    email: data.email,
    planType: data.plan_type,
    videosUsed: data.videos_used,
    videosLimit: data.videos_limit,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    subscriptionStatus: data.subscription_status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
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
  const supabase = await createClient()

  // Get current user to check if they exist
  const user = await getUser(userId)

  if (!user) {
    console.error(`[incrementUserVideoCount] User ${userId} not found`)
    return
  }

  // Increment videos_used counter
  const { data, error } = await supabase
    .from("users")
    .update({
      videos_used: user.videosUsed + 1,
      updated_at: Date.now(),
    })
    .eq("id", userId)
    .select()
    .single()

  if (error) {
    console.error(`[incrementUserVideoCount] Failed to increment for user ${userId}:`, error)
    throw error
  }

  console.log(`[incrementUserVideoCount] User ${userId} now has ${data.videos_used} videos`)
  return data
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
  const supabase = await createClient()

  const updateData: any = {
    updated_at: Date.now(),
  }

  if (updates.planType !== undefined) {
    updateData.plan_type = updates.planType
    updateData.videos_limit = PLAN_LIMITS[updates.planType]
  }
  if (updates.stripeCustomerId !== undefined) {
    updateData.stripe_customer_id = updates.stripeCustomerId
  }
  if (updates.stripeSubscriptionId !== undefined) {
    updateData.stripe_subscription_id = updates.stripeSubscriptionId
  }
  if (updates.subscriptionStatus !== undefined) {
    updateData.subscription_status = updates.subscriptionStatus
  }

  const { data, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", userId)
    .select()
    .single()

  if (error) {
    console.error(`[updateUserSubscription] Failed to update user ${userId}:`, error)
    throw error
  }

  console.log(`[updateUserSubscription] Updated user ${userId} to plan ${data.plan_type}`)
  return data
}
