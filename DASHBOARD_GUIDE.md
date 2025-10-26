# DemoDrop Dashboard Guide

Complete guide to the video dashboard with Remotion Player integration.

---

## Overview

The dashboard provides a complete video management interface where users can:
- View all their generated videos in a grid
- Filter by status and search by URL
- Watch videos with Remotion Player
- Download and delete videos
- Monitor generation progress in real-time

---

## Features Implemented

### 1. Dashboard Page (`/dashboard`)

**Location:** `app/dashboard/page.tsx`

**Features:**
- Grid view of all user videos
- Real-time status updates
- Search by website URL
- Filter by status (All, Processing, Completed, Failed)
- Empty states with CTA
- Responsive design (1/2/3 columns)

**Access:** Protected route, requires authentication

### 2. Video Detail Page (`/video/[id]`)

**Location:** `app/video/[id]/page.tsx`

**Features:**
- Remotion Player with full controls
- Video metadata display
- Download button
- Delete button
- AI prompt viewer (expandable)
- Real-time progress for generating videos
- Ownership verification

**Player Features:**
- Play/pause controls
- Volume control
- Fullscreen mode
- Click-to-play
- Seeking/scrubbing

### 3. API Endpoints

#### GET `/api/videos`
**Purpose:** List all videos for authenticated user

**Query Parameters:**
- `status` - Filter by status (scraping/generating/completed/failed)
- `search` - Search by website URL

**Security:** Requires authentication, returns only user's videos

**Example:**
```javascript
const response = await fetch('/api/videos?status=completed&search=example.com');
const { videos } = await response.json();
```

#### GET `/api/video/[id]`
**Purpose:** Get single video details

**Security:**
- Requires authentication
- Verifies user owns the video
- Returns 403 if not owner

**Example:**
```javascript
const response = await fetch('/api/video/abc123');
const { video } = await response.json();
```

#### DELETE `/api/video/[id]/delete`
**Purpose:** Delete video and associated blob

**Security:**
- Requires authentication
- Verifies ownership
- Deletes from both database and blob storage

**Example:**
```javascript
await fetch('/api/video/abc123/delete', { method: 'DELETE' });
```

---

## Components

### Dashboard Components

#### `VideoGrid`
**Location:** `components/dashboard/video-grid.tsx`

Responsive grid layout for video cards. Handles empty states.

#### `VideoCard`
**Location:** `components/dashboard/video-card.tsx`

Individual video card with:
- Video thumbnail/preview
- Status badge with color coding
- Relative timestamp
- View and Delete buttons

**Status Colors:**
- 🔵 Blue - Scraping
- 🟡 Yellow - Generating
- 🟢 Green - Completed
- 🔴 Red - Failed

#### `VideoFilters`
**Location:** `components/dashboard/video-filters.tsx`

Filter bar with:
- Search input for URL
- Status filter badges
- Responsive layout

### Video Components

#### `RemotionVideoPlayer`
**Location:** `components/video/remotion-video-player.tsx`

Wrapper around `@remotion/player` with:
- 1920x1080 resolution
- 30fps playback
- Full controls
- Click-to-play

**Configuration:**
```typescript
<Player
  component={VideoComposition}
  inputProps={{ videoUrl }}
  durationInFrames={900} // 30 seconds
  compositionWidth={1920}
  compositionHeight={1080}
  fps={30}
  controls
  clickToPlay
/>
```

#### `VideoActions`
**Location:** `components/video/video-actions.tsx`

Action buttons for video detail page:
- Download - Creates download link
- Delete - Confirms and deletes

---

## Remotion Setup

### Compositions

#### `VideoComposition`
**Location:** `remotion/VideoComposition.tsx`

Simple composition that renders a video:
```typescript
<AbsoluteFill>
  <Video src={videoUrl} />
</AbsoluteFill>
```

#### `Root`
**Location:** `remotion/Root.tsx`

Defines available compositions:
- ID: `VideoComposition`
- Duration: 900 frames (30 seconds at 30fps)
- Size: 1920x1080

### Configuration

**Location:** `remotion.config.ts`

```typescript
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
```

---

## User Flow

### Viewing Dashboard

1. User signs in
2. Clicks "Dashboard" in header
3. Sees grid of all their videos
4. Can filter/search videos
5. Clicks "View" to see video detail

### Watching Video

1. From dashboard, click video card
2. Video detail page loads
3. If completed, Remotion Player shows video
4. If processing, shows progress bar
5. User can play/pause/scrub video
6. User can download or delete

### Downloading Video

1. Click "Download Video" button
2. Browser downloads MP4 file
3. Filename: `video-{id}.mp4`

### Deleting Video

1. Click "Delete" button
2. Confirm deletion dialog
3. Video removed from:
   - Vercel Postgres database
   - Vercel Blob storage
4. Redirect to dashboard

---

## Real-Time Updates

### Dashboard Polling

When videos are in `scraping` or `generating` status:
- Fetches updates every 3 seconds
- Updates progress percentage
- Updates status badges
- Stops polling when completed/failed

**Implementation:**
```typescript
useEffect(() => {
  if (video && (video.status === 'scraping' || video.status === 'generating')) {
    const interval = setInterval(() => {
      fetchVideo();
    }, 3000);
    return () => clearInterval(interval);
  }
}, [video?.status]);
```

---

## Security

### Authentication

All dashboard and video routes are protected by Clerk middleware:
- Redirects to sign-in if not authenticated
- Only shows user's own videos
- Verifies ownership on all actions

### Ownership Verification

API routes check ownership:
```typescript
if (project.user_id !== userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

### Blob Deletion

When deleting videos:
1. Verify user owns the video
2. Delete from blob storage
3. Delete from database
4. Handle errors gracefully

---

## Styling

### Design System

- **Colors:** Tailwind CSS with theme variables
- **Typography:** Inter font
- **Components:** shadcn/ui components
- **Layout:** Responsive grid (1/2/3 columns)

### Status Colors

```css
scraping: bg-blue-100 text-blue-800
generating: bg-yellow-100 text-yellow-800
completed: bg-green-100 text-green-800
failed: bg-red-100 text-red-800
```

### Responsive Breakpoints

- **Mobile:** 1 column
- **Tablet:** 2 columns (md:)
- **Desktop:** 3 columns (lg:)

---

## Testing

### Test Dashboard

1. Sign in to app
2. Navigate to `/dashboard`
3. Verify empty state if no videos
4. Generate a video
5. See it appear in dashboard
6. Watch status update in real-time

### Test Video Detail

1. Click video card from dashboard
2. Verify video loads in Remotion Player
3. Test play/pause/seek
4. Test fullscreen
5. Test download
6. Test delete

### Test Filters

1. Generate videos with different statuses
2. Test status filters (All, Processing, Completed, Failed)
3. Test search by URL
4. Verify empty states

### Test Security

1. Try accessing another user's video by ID
2. Should return 403 Forbidden
3. Try accessing `/dashboard` while signed out
4. Should redirect to sign-in

---

## NPM Scripts

```json
{
  "dev": "next dev",           // Start dev server
  "build": "next build",       // Build for production
  "remotion": "remotion studio", // Open Remotion Studio
  "render": "remotion render"  // Render video (CLI)
}
```

### Remotion Studio

To open Remotion Studio for composition preview:

```bash
npm run remotion
```

Opens at `http://localhost:3000` with visual editor.

---

## File Structure

```
app/
├── dashboard/
│   └── page.tsx                    # Dashboard page
├── video/
│   └── [id]/
│       └── page.tsx                # Video detail page
└── api/
    ├── videos/
    │   └── route.ts               # List videos
    └── video/
        └── [id]/
            ├── route.ts           # Get video
            └── delete/
                └── route.ts       # Delete video

components/
├── dashboard/
│   ├── video-grid.tsx             # Grid layout
│   ├── video-card.tsx             # Video card
│   └── video-filters.tsx          # Filters bar
└── video/
    ├── remotion-video-player.tsx  # Player wrapper
    └── video-actions.tsx          # Action buttons

remotion/
├── Root.tsx                       # Compositions
├── VideoComposition.tsx           # Main composition
└── remotion.config.ts             # Config
```

---

## Performance

### Optimizations

- Video thumbnails use `preload="metadata"`
- Polling stops when video completes
- Blob deletion happens async
- Images lazy load
- Component code splitting

### Bundle Size

Remotion adds ~2MB to bundle:
- `@remotion/player`: ~1.5MB
- `@remotion/cli`: Development only
- `remotion`: ~500KB

---

## Troubleshooting

### Videos Not Loading

**Issue:** Videos don't appear in dashboard

**Check:**
1. User is signed in
2. Database query filtering by `user_id`
3. Videos exist for that user
4. Check browser console for errors

### Player Not Working

**Issue:** Remotion Player shows black screen

**Check:**
1. Video URL is valid and accessible
2. Video is MP4 format
3. CORS headers allow video access
4. Browser supports video codec

### Delete Not Working

**Issue:** Delete button doesn't work

**Check:**
1. User owns the video
2. Blob deletion permissions
3. Database delete permissions
4. Check API logs for errors

### Real-Time Updates Not Working

**Issue:** Status doesn't update during generation

**Check:**
1. Polling is active (check useEffect)
2. API returns updated status
3. No rate limiting on API
4. Component re-renders on state change

---

## Future Enhancements

### Phase 2 Features

If you want to add editing later:
- **Text Overlays** - Add custom text to videos
- **Trim/Cut** - Edit video length
- **Transitions** - Add effects between scenes
- **Export Options** - Different resolutions/formats
- **Batch Operations** - Select multiple videos
- **Sharing** - Public links for videos

### Advanced Features

- **Video Analytics** - Track views/downloads
- **Folders** - Organize videos
- **Tags** - Categorize videos
- **Templates** - Reusable video styles
- **Collaboration** - Share with team members

---

## Remotion License

**Important:** Remotion requires a license for commercial use.

- **Free:** Open source projects, testing, evaluation
- **Company License:** $300/year (companies under $2M revenue)
- **Enterprise:** Custom pricing

For DemoDrop (commercial product), you need a company license.

**Get license:** https://remotion.dev/license

---

## Resources

- **Remotion Docs:** https://remotion.dev/docs
- **Remotion Player:** https://remotion.dev/docs/player
- **Next.js Integration:** https://remotion.dev/docs/nextjs
- **Clerk Auth:** https://clerk.com/docs
- **Vercel Blob:** https://vercel.com/docs/storage/vercel-blob

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Vercel logs for API errors
3. Verify environment variables are set
4. Test with Remotion Studio (`npm run remotion`)
5. Check Clerk dashboard for auth issues

---

## Success Criteria

✅ Dashboard shows all user videos
✅ Filters and search work
✅ Videos play in Remotion Player
✅ Download works
✅ Delete works (DB + Blob)
✅ Real-time status updates
✅ Mobile responsive
✅ Ownership security enforced
✅ Clean, professional design

**Status: Production Ready ✅**
