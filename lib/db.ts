import { sql } from "@vercel/postgres"

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
  planType: 'free' | 'pro' | 'enterprise'
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
  const { rows } = await sql`
    INSERT INTO projects (
      id, user_id, website_url, style_preset, custom_instructions,
      status, progress, created_at
    ) VALUES (
      ${project.id},
      ${project.userId || null},
      ${project.websiteUrl},
      ${project.stylePreset},
      ${project.customInstructions || null},
      ${project.status},
      ${project.progress || 0},
      ${project.createdAt}
    )
    RETURNING *
  `
  return rows[0]
}

export async function updateProject(projectId: string, updates: Partial<Project>) {
  const setClauses = []
  const values: any[] = []
  let paramCount = 1

  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramCount++}`)
    values.push(updates.status)
  }
  if (updates.progress !== undefined) {
    setClauses.push(`progress = $${paramCount++}`)
    values.push(updates.progress)
  }
  if (updates.prompt !== undefined) {
    setClauses.push(`prompt = $${paramCount++}`)
    values.push(updates.prompt)
  }
  if (updates.soraJobId !== undefined) {
    setClauses.push(`sora_job_id = $${paramCount++}`)
    values.push(updates.soraJobId)
  }
  if (updates.videoUrl !== undefined) {
    setClauses.push(`video_url = $${paramCount++}`)
    values.push(updates.videoUrl)
  }
  if (updates.error !== undefined) {
    setClauses.push(`error = $${paramCount++}`)
    values.push(updates.error)
  }
  if (updates.completedAt !== undefined) {
    setClauses.push(`completed_at = $${paramCount++}`)
    values.push(updates.completedAt)
  }

  values.push(projectId)

  const { rows } = await sql.query(
    `UPDATE projects SET ${setClauses.join(", ")} WHERE id = $${paramCount} RETURNING *`,
    values,
  )

  return rows[0]
}

export async function getProject(projectId: string) {
  const { rows } = await sql`
    SELECT * FROM projects WHERE id = ${projectId}
  `
  return rows[0] || null
}

export async function getUserProjects(userId: string, limit = 20) {
  const { rows } = await sql`
    SELECT * FROM projects
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return rows
}

// User Management Functions

export async function getUser(userId: string): Promise<User | null> {
  const { rows } = await sql`
    SELECT * FROM users WHERE id = ${userId}
  `
  if (rows.length === 0) return null

  const row = rows[0]
  return {
    id: row.id,
    email: row.email,
    planType: row.plan_type,
    videosUsed: row.videos_used,
    videosLimit: row.videos_limit,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    subscriptionStatus: row.subscription_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createUser(user: {
  id: string
  email: string
  planType?: 'free' | 'pro' | 'enterprise'
}) {
  const now = Date.now()
  const planType = user.planType || 'free'
  const videosLimit = PLAN_LIMITS[planType]

  const { rows } = await sql`
    INSERT INTO users (
      id, email, plan_type, videos_used, videos_limit, created_at, updated_at
    ) VALUES (
      ${user.id},
      ${user.email},
      ${planType},
      0,
      ${videosLimit},
      ${now},
      ${now}
    )
    RETURNING *
  `
  return rows[0]
}

export async function checkUserQuota(userId: string): Promise<{
  hasQuota: boolean
  videosUsed: number
  videosLimit: number
  planType: string
}> {
  const user = await getUser(userId)

  if (!user) {
    throw new Error('User not found')
  }

  return {
    hasQuota: user.videosUsed < user.videosLimit,
    videosUsed: user.videosUsed,
    videosLimit: user.videosLimit,
    planType: user.planType,
  }
}

export async function incrementUserVideoCount(userId: string) {
  const now = Date.now()

  await sql`
    UPDATE users
    SET videos_used = videos_used + 1, updated_at = ${now}
    WHERE id = ${userId}
  `
}

export async function updateUserSubscription(
  userId: string,
  updates: {
    planType?: 'free' | 'pro' | 'enterprise'
    stripeCustomerId?: string
    stripeSubscriptionId?: string
    subscriptionStatus?: string
  }
) {
  const setClauses = []
  const values: any[] = []
  let paramCount = 1

  if (updates.planType !== undefined) {
    setClauses.push(`plan_type = $${paramCount++}`)
    values.push(updates.planType)

    // Update video limit based on plan
    setClauses.push(`videos_limit = $${paramCount++}`)
    values.push(PLAN_LIMITS[updates.planType])
  }

  if (updates.stripeCustomerId !== undefined) {
    setClauses.push(`stripe_customer_id = $${paramCount++}`)
    values.push(updates.stripeCustomerId)
  }

  if (updates.stripeSubscriptionId !== undefined) {
    setClauses.push(`stripe_subscription_id = $${paramCount++}`)
    values.push(updates.stripeSubscriptionId)
  }

  if (updates.subscriptionStatus !== undefined) {
    setClauses.push(`subscription_status = $${paramCount++}`)
    values.push(updates.subscriptionStatus)
  }

  const now = Date.now()
  setClauses.push(`updated_at = $${paramCount++}`)
  values.push(now)

  values.push(userId)

  const { rows } = await sql.query(
    `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${paramCount} RETURNING *`,
    values,
  )

  return rows[0]
}
