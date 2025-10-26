import { sql } from "@vercel/postgres"

export interface Project {
  id: string
  userId?: string
  websiteUrl: string
  stylePreset: string
  customInstructions?: string
  status: "scraping" | "orchestrating" | "generating" | "completed" | "failed"
  progress?: number
  prompt?: string
  soraJobId?: string
  videoUrl?: string
  error?: string
  createdAt: number
  completedAt?: number
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
