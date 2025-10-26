# V0 Component Checklist

Use this checklist to verify v0-generated components will work with our backend.

---

## ✅ Pre-Flight Check

Before copying code from v0 to your project:

### 1. Authentication ✓
- [ ] Uses `'use client'` directive if interactive
- [ ] Imports from `@clerk/nextjs` (not custom auth)
- [ ] Uses `useUser()` hook correctly
- [ ] Shows `SignInButton` when not authenticated
- [ ] Shows `UserButton` when authenticated
- [ ] Handles `isLoaded` state before checking `isSignedIn`

**Example:**
```typescript
const { isLoaded, isSignedIn } = useUser()
if (!isLoaded) return <div>Loading...</div>
if (!isSignedIn) return <SignInButton mode="modal">...</SignInButton>
```

### 2. TypeScript Types ✓
- [ ] Uses our exact `Project` interface
- [ ] Uses our exact `User` interface
- [ ] Status values match: `"scraping" | "generating" | "completed" | "failed"`
- [ ] Style preset values match: `'product-demo' | 'enterprise-saas' | 'startup-energy' | 'brand-story'`
- [ ] No custom types that conflict with ours

### 3. API Integration ✓
- [ ] Calls correct endpoint paths (`/api/videos`, `/api/generate-video`, etc.)
- [ ] Uses correct HTTP methods (GET, POST, DELETE)
- [ ] Sends correct request body shape
- [ ] Expects correct response shape
- [ ] Handles 401 (unauthorized) errors
- [ ] Handles 403 (quota exceeded) errors
- [ ] Handles 404 (not found) errors
- [ ] Handles 500 (server) errors

**Example:**
```typescript
const response = await fetch('/api/videos?status=completed')
const { videos } = await response.json() // Expects { videos: Project[] }
```

### 4. Styling ✓
- [ ] Uses Tailwind theme variables (not hardcoded colors)
- [ ] Uses shadcn/ui components (not custom UI)
- [ ] Follows responsive patterns (`md:`, `lg:`)
- [ ] Uses correct spacing (`py-20 px-4 sm:px-6 lg:px-8`)
- [ ] Uses correct max-width (`max-w-7xl mx-auto`)
- [ ] Status badge colors match our scheme

**Color Variables:**
```css
bg-background, bg-card, bg-muted
text-foreground, text-muted-foreground
border-border
bg-primary, text-primary-foreground
bg-destructive, text-destructive-foreground
```

### 5. Navigation ✓
- [ ] Uses `Link` from `next/link` (not `<a>`)
- [ ] Uses `useRouter` from `next/navigation` (NOT `next/router`)
- [ ] Links to correct routes (`/dashboard`, `/video/[id]`, `/`)
- [ ] Uses smooth scroll for same-page anchors

**Example:**
```typescript
import Link from 'next/link'
import { useRouter } from 'next/navigation'

<Link href="/dashboard">Dashboard</Link>
```

### 6. Component Patterns ✓
- [ ] Handles loading states
- [ ] Handles error states
- [ ] Handles empty states
- [ ] Uses proper TypeScript types (not `any`)
- [ ] Follows mobile-first responsive design
- [ ] Uses semantic HTML

### 7. Form Handling ✓
- [ ] Uses `useState` for form values
- [ ] Uses `async` function for submit
- [ ] Has loading state during submission
- [ ] Has error state for failures
- [ ] Disables submit button when loading
- [ ] Shows error messages clearly

**Example:**
```typescript
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError(null)
  try {
    const res = await fetch('/api/generate-video', {...})
    if (!res.ok) throw new Error('Failed')
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}
```

### 8. Date Formatting ✓
- [ ] Uses `date-fns` library (not custom)
- [ ] Uses `formatDistanceToNow` for relative dates
- [ ] Handles timestamp conversion correctly

**Example:**
```typescript
import { formatDistanceToNow } from 'date-fns'
formatDistanceToNow(new Date(createdAt), { addSuffix: true })
```

---

## 🔍 Code Review Checklist

After copying code from v0, check these:

### Imports ✓
```typescript
// ✅ Good
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"

// ❌ Bad
import { Link } from "react-router-dom"
import { useRouter } from "next/router"
import { useAuth } from "custom-auth"
```

### Client Components ✓
```typescript
// ✅ Good - Has 'use client' and uses hooks
'use client'
import { useState } from 'react'
export function MyComponent() {
  const [value, setValue] = useState('')
  ...
}

// ❌ Bad - Uses hooks without 'use client'
import { useState } from 'react'
export function MyComponent() {
  const [value, setValue] = useState('')
  ...
}
```

### API Calls ✓
```typescript
// ✅ Good - Matches our endpoints
await fetch('/api/videos')
await fetch('/api/generate-video', { method: 'POST', ... })
await fetch(`/api/video/${id}/delete`, { method: 'DELETE' })

// ❌ Bad - Wrong endpoints
await fetch('/api/get-videos')
await fetch('/api/create-video', ...)
```

### Error Handling ✓
```typescript
// ✅ Good - Handles specific errors
if (response.status === 403 && data.error === 'Quota exceeded') {
  return <UpgradePrompt />
}

// ❌ Bad - Generic error handling
if (!response.ok) {
  alert('Error')
}
```

### Styling ✓
```typescript
// ✅ Good - Uses theme variables
<div className="bg-background text-foreground">
<Badge className="bg-green-100 text-green-800">

// ❌ Bad - Hardcoded colors
<div className="bg-white text-black">
<Badge className="bg-[#22c55e] text-[#166534]">
```

---

## 🚨 Common v0 Mistakes to Fix

### 1. Wrong React/Next.js Versions
v0 might generate for React 19/Next.js 15. We use React 18/Next.js 14.

**Fix:**
- Change `use()` to `await` in server components
- Remove React 19-specific features
- Use Next.js 14 routing patterns

### 2. Wrong Import Paths
v0 might use different paths.

**Fix:**
```typescript
// Change this:
import { useRouter } from "next/router"
// To this:
import { useRouter } from "next/navigation"
```

### 3. Custom Auth Logic
v0 might generate custom auth.

**Fix:**
- Remove all custom auth code
- Replace with Clerk hooks
- Use `useUser()`, `SignInButton`, `UserButton`

### 4. Hardcoded Values
v0 might hardcode our API endpoints or types.

**Fix:**
- Use our TypeScript interfaces
- Use our API endpoint paths
- Use our status/preset values

### 5. Missing Error States
v0 might not handle all error cases.

**Fix:**
- Add 401 handling (redirect to sign-in)
- Add 403 handling (quota exceeded)
- Add 404 handling (not found)
- Add loading states

---

## ✅ Final Verification

Before deploying:

1. **Run TypeScript check:**
   ```bash
   npm run build
   ```
   Should compile with no errors.

2. **Test authentication:**
   - Sign out → Should show sign-in prompt
   - Sign in → Should show content
   - Sign in as different user → Should only see their data

3. **Test API integration:**
   - Form submission works
   - Data fetching works
   - Error handling works
   - Loading states work

4. **Test responsive design:**
   - Mobile (375px)
   - Tablet (768px)
   - Desktop (1440px)

5. **Test user flow:**
   - Can complete full journey
   - All links work
   - All buttons work
   - No console errors

---

## 📝 Quick Fixes Reference

| Issue | Fix |
|-------|-----|
| Missing `'use client'` | Add to top of file if using hooks/events |
| Wrong auth | Replace with Clerk `useUser()` |
| Wrong imports | Use `next/link`, `next/navigation` |
| Hardcoded colors | Use Tailwind theme variables |
| Wrong types | Use our `Project` and `User` interfaces |
| Wrong API paths | Check `V0_INTEGRATION_PROMPT.md` |
| Missing error handling | Add try/catch, handle 401/403/404/500 |
| No loading state | Add `useState` for loading |

---

## 🎯 Success Criteria

Your v0 component is ready when:

- ✅ TypeScript compiles without errors
- ✅ Uses Clerk for all authentication
- ✅ Calls correct API endpoints
- ✅ Uses correct TypeScript types
- ✅ Uses shadcn/ui components
- ✅ Uses Tailwind theme variables
- ✅ Handles all states (loading, error, empty, success)
- ✅ Works on mobile and desktop
- ✅ Integrates with existing routes/navigation
- ✅ No console errors or warnings

---

**Pro Tip:** Use `V0_QUICK_PROMPT.txt` as your starting prompt in v0, then verify with this checklist before deploying!
