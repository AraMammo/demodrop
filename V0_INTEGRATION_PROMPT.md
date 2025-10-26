# V0 Integration Prompt for DemoDrop

Use this prompt when working in v0.dev to ensure components are structured correctly for our backend.

---

## Project Context

**Project Name:** DemoDrop
**Purpose:** AI-powered demo video generation platform using OpenAI Sora API
**Tech Stack:** Next.js 14, TypeScript, Clerk Auth, Stripe, Vercel Postgres/Blob, Remotion Player

---

## Critical Requirements for v0

When building components in v0, ensure they follow these patterns:

### 1. Tech Stack & Dependencies

```json
{
  "framework": "Next.js 14 (App Router)",
  "typescript": "^5",
  "react": "^18.2.0",
  "authentication": "@clerk/nextjs",
  "payments": "stripe + @stripe/stripe-js",
  "database": "@vercel/postgres",
  "storage": "@vercel/blob",
  "video": "remotion + @remotion/player",
  "styling": "Tailwind CSS v3 + shadcn/ui",
  "icons": "lucide-react",
  "forms": "react-hook-form + zod",
  "dates": "date-fns"
}
```

### 2. Authentication Pattern (CRITICAL)

**All components that need user data MUST use Clerk:**

```typescript
'use client'

import { useUser, SignInButton, UserButton } from '@clerk/nextjs'

export function MyComponent() {
  const { isLoaded, isSignedIn, user } = useUser()

  if (!isLoaded) return <div>Loading...</div>

  if (!isSignedIn) {
    return (
      <div>
        <p>Please sign in</p>
        <SignInButton mode="modal">
          <Button>Sign In</Button>
        </SignInButton>
      </div>
    )
  }

  return <div>Hello {user.firstName}</div>
}
```

**Server-side authentication (API routes):**

```typescript
import { auth } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Continue with authenticated logic...
}
```

### 3. API Endpoint Contracts

**Our existing API routes you can call from frontend:**

#### POST `/api/generate-video`
**Purpose:** Start video generation
**Auth:** Required
**Request:**
```typescript
{
  websiteUrl: string        // Required
  stylePreset: string       // 'product-demo' | 'enterprise-saas' | 'startup-energy' | 'brand-story'
  customInstructions?: string
}
```
**Response:**
```typescript
{
  projectId: string
  status: 'queued'
  message: 'Video generation started'
}
```
**Errors:**
- 401: Not authenticated
- 403: Quota exceeded (free tier = 1 video)
- 400: Invalid input

#### GET `/api/projects/:id`
**Purpose:** Get video generation status
**Auth:** Required
**Response:**
```typescript
{
  id: string
  userId: string
  websiteUrl: string
  stylePreset: string
  status: 'scraping' | 'generating' | 'completed' | 'failed'
  progress?: number         // 0-100
  prompt?: string
  videoUrl?: string        // Available when status === 'completed'
  error?: string           // Available when status === 'failed'
  createdAt: number
  completedAt?: number
}
```

#### GET `/api/videos`
**Purpose:** List all user's videos
**Auth:** Required
**Query Params:**
- `status?: string` - Filter by status
- `search?: string` - Search by URL
**Response:**
```typescript
{
  videos: Project[]
}
```

#### DELETE `/api/video/:id/delete`
**Purpose:** Delete video and blob
**Auth:** Required
**Response:**
```typescript
{ success: true }
```

#### POST `/api/stripe/checkout`
**Purpose:** Create Stripe checkout session
**Auth:** Required
**Request:**
```typescript
{
  planType: 'pro' | 'enterprise'
}
```
**Response:**
```typescript
{
  url: string  // Redirect to Stripe checkout
}
```

### 4. Database Schema & TypeScript Types

**USE THESE EXACT TYPES:**

```typescript
// Project (Video) Type
interface Project {
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

// User Type
interface User {
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

// Plan Limits
const PLAN_LIMITS = {
  free: 1,
  pro: 999999,
  enterprise: 999999,
}

// Style Presets
type StylePresetType = 'product-demo' | 'enterprise-saas' | 'startup-energy' | 'brand-story'
```

### 5. Component Patterns

**Shadcn/ui Components (MUST USE):**

```typescript
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
```

**Button Variants:**
- `default` - Primary actions (black background)
- `outline` - Secondary actions
- `ghost` - Tertiary/subtle actions
- `destructive` - Delete/dangerous actions

**Navigation:**
```typescript
import Link from "next/link"

// Internal links
<Link href="/dashboard">Dashboard</Link>

// Smooth scroll to section
const scrollToSection = () => {
  document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' })
}
```

### 6. Styling Guidelines

**Tailwind Classes (MUST USE THESE):**

**Colors:**
- `bg-background` - Main background
- `bg-card` - Card backgrounds
- `bg-muted` - Muted backgrounds
- `text-foreground` - Main text
- `text-muted-foreground` - Secondary text
- `border-border` - Borders
- `bg-primary` - Primary actions
- `bg-destructive` - Errors/delete

**Status Badge Colors:**
```typescript
const statusColors = {
  scraping: 'bg-blue-100 text-blue-800',
  generating: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}
```

**Typography:**
- Headings: `text-2xl`, `text-3xl`, `text-4xl` + `font-bold`
- Body: `text-base` or `text-sm`
- Muted: `text-muted-foreground`

**Spacing:**
- Sections: `py-20 px-4 sm:px-6 lg:px-8`
- Max width: `max-w-7xl mx-auto` (for pages)
- Max width: `max-w-3xl mx-auto` (for forms)

**Responsive Grid:**
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

### 7. Form Handling Pattern

**Video Generation Form Example:**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function VideoGeneratorForm() {
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [stylePreset, setStylePreset] = useState('product-demo')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl, stylePreset }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate video')
      }

      const { projectId } = await response.json()
      // Handle success (e.g., redirect, start polling)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={websiteUrl}
        onChange={(e) => setWebsiteUrl(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Generating...' : 'Generate Video'}
      </Button>
      {error && <p className="text-destructive">{error}</p>}
    </form>
  )
}
```

### 8. Polling Pattern for Video Status

```typescript
useEffect(() => {
  if (!projectId || status === 'completed' || status === 'failed') return

  const interval = setInterval(async () => {
    const response = await fetch(`/api/projects/${projectId}`)
    const data = await response.json()

    setStatus(data.status)
    setProgress(data.progress || 0)

    if (data.status === 'completed') {
      setVideoUrl(data.videoUrl)
      clearInterval(interval)
    }

    if (data.status === 'failed') {
      setError(data.error)
      clearInterval(interval)
    }
  }, 2000) // Poll every 2 seconds

  return () => clearInterval(interval)
}, [projectId, status])
```

### 9. File Structure

**Pages:**
- `/` - Landing page
- `/dashboard` - Video grid (auth required)
- `/video/[id]` - Video detail with Remotion Player (auth required)

**Components:**
```
components/
├── ui/              # shadcn/ui components
├── dashboard/       # Dashboard-specific components
├── video/          # Video player components
├── header.tsx      # Global header with auth
├── footer.tsx      # Global footer
├── pricing.tsx     # Pricing section
└── video-generator.tsx  # Video generation form
```

**API Routes:**
```
app/api/
├── generate-video/route.ts
├── process-video/route.ts
├── projects/[id]/route.ts
├── videos/route.ts
├── video/[id]/route.ts
├── video/[id]/delete/route.ts
├── stripe/checkout/route.ts
└── webhooks/stripe/route.ts
```

### 10. Environment Variables

**Frontend (NEXT_PUBLIC_):**
```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Backend (Server-only):**
```bash
OPENAI_API_KEY=sk-proj-...
CLERK_SECRET_KEY=sk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
POSTGRES_URL=...
BLOB_READ_WRITE_TOKEN=...
```

### 11. Common Patterns to Follow

**Client Components:**
```typescript
'use client'  // MUST be at top if using hooks or interactivity
```

**Imports:**
```typescript
import Link from "next/link"
import { useRouter } from "next/navigation"  // NOT 'next/router'
import type React from "react"
```

**Date Formatting:**
```typescript
import { formatDistanceToNow } from 'date-fns'

<span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
// Output: "2 hours ago"
```

**Conditional Rendering:**
```typescript
{isSignedIn ? (
  <UserButton />
) : (
  <SignInButton mode="modal">
    <Button>Sign In</Button>
  </SignInButton>
)}
```

### 12. Key Routes & Navigation

**Main User Flow:**
1. Landing page `/` → Sign up/in
2. Generate video → Scroll to `#generator` section
3. After generation → Redirect to `/dashboard`
4. Click video → Go to `/video/[id]`
5. Watch/download → Stay on page or go back to `/dashboard`

**Navigation Elements:**
- Header: Logo (links to `/`), Dashboard link (if signed in), UserButton
- Footer: Standard links
- CTA Buttons: "Start Free Video" scrolls to `#generator`

### 13. Error Handling

**Quota Exceeded:**
```typescript
if (response.status === 403 && data.error === 'Quota exceeded') {
  // Show upgrade prompt
  return (
    <div>
      <p>{data.message}</p>
      <Link href="/#pricing">
        <Button>Upgrade to Pro</Button>
      </Link>
    </div>
  )
}
```

**Authentication Required:**
```typescript
if (response.status === 401) {
  // Show sign-in prompt
  return (
    <SignInButton mode="modal">
      <Button>Sign In to Continue</Button>
    </SignInButton>
  )
}
```

### 14. Video Player Pattern

**Use Remotion Player (NOT native video tag for main playback):**

```typescript
import { Player } from '@remotion/player'
import { VideoComposition } from '@/remotion/VideoComposition'

<Player
  component={VideoComposition}
  inputProps={{ videoUrl }}
  durationInFrames={900}
  compositionWidth={1920}
  compositionHeight={1080}
  fps={30}
  controls
  clickToPlay
  style={{ width: '100%', height: '100%' }}
/>
```

### 15. Pricing Tiers

**Display these exact plans:**

```typescript
const plans = [
  {
    name: "Free Trial",
    price: "$0",
    features: ["1 video with watermark", "Test if AI understands your product"],
    videosLimit: 1,
  },
  {
    name: "Pro",
    price: "$59/month",
    features: ["Unlimited videos", "No watermark", "Priority processing", "Full edit access"],
    videosLimit: 999999,
  },
  {
    name: "Enterprise",
    price: "Custom",
    features: ["API access", "White-label options", "Dedicated capacity", "Volume pricing"],
    videosLimit: 999999,
  },
]
```

---

## Example: Complete Component for v0

**Prompt for v0:**

```
Create a video dashboard page for a Next.js 14 app using the App Router and TypeScript.

TECH STACK:
- Next.js 14 with App Router
- TypeScript
- Clerk authentication (@clerk/nextjs)
- Tailwind CSS v3
- shadcn/ui components
- Lucide icons
- date-fns for dates

AUTHENTICATION:
- Use Clerk's useUser() hook
- Show SignInButton if not authenticated
- Use UserButton for signed-in users

API INTEGRATION:
- Fetch videos from GET /api/videos
- Videos have this type:
  interface Project {
    id: string
    websiteUrl: string
    stylePreset: string
    status: "scraping" | "generating" | "completed" | "failed"
    progress?: number
    videoUrl?: string
    createdAt: number
  }

UI REQUIREMENTS:
- Header with logo, "Dashboard" link (if signed in), UserButton
- Page title: "Video Dashboard"
- Search bar (search by URL)
- Filter badges: All, Processing, Completed, Failed
- Responsive grid: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)
- Video cards showing:
  - Video thumbnail/preview (if available)
  - Status badge (colored: blue=scraping, yellow=generating, green=completed, red=failed)
  - Website URL
  - Style preset
  - Time since creation (use formatDistanceToNow from date-fns)
  - "View" button (Link to /video/[id])
  - "Delete" button
- Empty state if no videos
- Loading state
- Error handling

STYLING:
- Use Tailwind theme variables: bg-background, bg-card, text-foreground, text-muted-foreground, border-border
- Status badge colors: bg-blue-100 text-blue-800, bg-yellow-100 text-yellow-800, etc.
- Section padding: py-20 px-4 sm:px-6 lg:px-8
- Max width: max-w-7xl mx-auto
- shadcn/ui components: Button, Card, Badge, Input

Make it clean, professional, and mobile-responsive.
```

---

## Testing Your v0 Components

After generating components in v0:

1. **Check imports** - Ensure they match our patterns
2. **Check auth** - Must use Clerk if user-specific
3. **Check API calls** - Match our endpoint contracts
4. **Check types** - Use our TypeScript interfaces
5. **Check styling** - Use our Tailwind patterns
6. **Check routing** - Use Next.js Link and App Router patterns

---

## Common Mistakes to Avoid

❌ **Don't:**
- Use `'use server'` directive (we use API routes)
- Import from `'next/router'` (use `'next/navigation'`)
- Use React 19 or Next.js 15 syntax
- Create custom auth logic (use Clerk)
- Hardcode colors (use Tailwind theme variables)
- Use inline styles (use Tailwind classes)
- Mix authentication patterns

✅ **Do:**
- Use `'use client'` for interactive components
- Use Clerk for all authentication
- Use shadcn/ui components
- Use Tailwind theme variables
- Follow our TypeScript types exactly
- Use our API endpoint contracts
- Handle loading and error states
- Make components responsive

---

## Quick Reference

**Authentication:**
```typescript
import { useUser } from '@clerk/nextjs'
const { isSignedIn, user } = useUser()
```

**API Call:**
```typescript
const res = await fetch('/api/videos')
const { videos } = await res.json()
```

**Navigation:**
```typescript
import Link from 'next/link'
<Link href="/dashboard">Dashboard</Link>
```

**Routing:**
```typescript
import { useRouter } from 'next/navigation'
const router = useRouter()
router.push('/dashboard')
```

**Date Formatting:**
```typescript
import { formatDistanceToNow } from 'date-fns'
formatDistanceToNow(new Date(timestamp), { addSuffix: true })
```

---

## Need Help?

Refer to:
- `PHASE1_SETUP_GUIDE.md` - Authentication & payments
- `DASHBOARD_GUIDE.md` - Dashboard implementation
- `README.md` - Project overview
- `DEPLOYMENT.md` - Deployment guide

---

**Last Updated:** Phase 1 + Dashboard Complete
**Status:** Production Ready
