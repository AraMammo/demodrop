# Deployment Guide: 24-Second Video Generation

## 🎯 What's Changed

Your video generation now creates **24-second videos** (instead of 12s) by:
1. Generating 2x 12-second clips with Sora
2. Stitching them together with your Digital Ocean FFmpeg endpoint
3. Delivering a seamless 24-second final video

---

## ✅ Implementation Complete

### Code Changes
- ✅ Updated all 4 style presets to 24 seconds
- ✅ Created prompt splitter (GPT-4 splits into Part 1 & Part 2)
- ✅ Created video stitcher (Digital Ocean FFmpeg integration)
- ✅ Updated process-video route (6-phase workflow)
- ✅ Updated UI progress indicators (Part 1/2, Part 2/2, Stitch)

### Files Modified
- `lib/sora-prompt-builder.ts` - 24s presets with PART 1/PART 2 structures
- `lib/prompt-splitter.ts` - NEW: AI-powered prompt splitting
- `lib/video-stitcher.ts` - NEW: FFmpeg endpoint integration
- `app/api/process-video/route.ts` - Complete 2-clip workflow
- `components/video-generator.tsx` - Updated UI for 2-clip flow

---

## 🚀 Deployment Steps

### Step 1: Add Environment Variable to Vercel

You need to add your Digital Ocean FFmpeg endpoint URL:

```bash
# In Vercel Dashboard → Settings → Environment Variables
FFMPEG_ENDPOINT_URL=https://your-digital-ocean-ffmpeg-endpoint.com/stitch

# Optional: If your endpoint requires authentication
FFMPEG_API_KEY=your_api_key_here
```

**How to add:**
1. Go to https://vercel.com/your-project/settings/environment-variables
2. Click "Add New"
3. Name: `FFMPEG_ENDPOINT_URL`
4. Value: Your Digital Ocean endpoint URL
5. Select: Production, Preview, Development
6. Click "Save"

### Step 2: Deploy to Vercel

Option A: Automatic (already pushed to git):
```bash
# Vercel automatically deploys on git push
# Your latest code is already in main branch
```

Option B: Manual via CLI:
```bash
cd /Users/aramammo/demodrop
vercel --prod
```

### Step 3: Verify Deployment

Once deployed, check:
- ✅ Build succeeds (no TypeScript errors)
- ✅ Environment variable is set
- ✅ Application loads without errors

---

## 🎬 FFmpeg Endpoint Requirements

Your Digital Ocean endpoint should accept this request format:

**Request:**
```http
POST /stitch (or your endpoint path)
Content-Type: multipart/form-data

Parameters:
- clip1: File (video/mp4) - First 12-second clip
- clip2: File (video/mp4) - Second 12-second clip
- transitionType: String - "cut" or "fade"
- transitionDuration: Number - Duration in seconds (0 for cut, 0.5 for fade)
```

**Response:**
```http
200 OK
Content-Type: video/mp4

[Binary video data - 24-second stitched video]
```

### Sample FFmpeg Command (for your endpoint)

If you're building the endpoint, here's the FFmpeg command it should run:

```bash
# Simple concatenation (cut)
ffmpeg -f concat -safe 0 -i concat_list.txt -c copy output.mp4

# With fade transition
ffmpeg -i clip1.mp4 -i clip2.mp4 \
  -filter_complex "\
  [0:v]fade=t=out:st=11.5:d=0.5[v0]; \
  [1:v]fade=t=in:st=0:d=0.5[v1]; \
  [v0][0:a][v1][1:a]concat=n=2:v=1:a=1[outv][outa]" \
  -map "[outv]" -map "[outa]" \
  -c:v libx264 -preset fast -crf 23 \
  -c:a aac -b:a 128k \
  output.mp4
```

---

## 📊 Expected User Experience

### Generation Flow

**User submits website URL** → Sees progress:

1. **Analyzing Website (0-10%)** - 10-15 seconds
   - Scraping with Dumpling AI
   - Extracting brand data

2. **AI Enhancement (10-30%)** - 15-25 seconds
   - GPT-4 creates full 24s story
   - Splits into Part 1 (0-12s) and Part 2 (12-24s)

3. **Generating Part 1 (30-60%)** - 3-5 minutes
   - Sora generates opening scene
   - Shows "Part 1/2" in UI

4. **Generating Part 2 (60-85%)** - 3-5 minutes
   - Sora generates conclusion
   - Shows "Part 2/2" in UI

5. **Stitching Clips (85-95%)** - 20-40 seconds
   - Calls Digital Ocean endpoint
   - Merges clips seamlessly

6. **Finalizing (95-100%)** - 10-20 seconds
   - Uploads to Supabase Storage
   - Updates project status

**Total Time:** 8-10 minutes

**Result:** 24-second branded demo video

---

## 🧪 Testing Checklist

### Before Going Live

Test with a sample website:

```bash
# Example test URLs
https://stripe.com
https://notion.so
https://figma.com
```

**Verify:**
- [ ] Video generates without errors
- [ ] Both clips are created (check logs)
- [ ] Stitching completes successfully
- [ ] Final video is 24 seconds (not 12s)
- [ ] Progress bar updates correctly
- [ ] Status messages show "Part 1/2" and "Part 2/2"
- [ ] Video quality is good
- [ ] Brand colors are consistent across both parts
- [ ] Transition between clips is smooth

### Check Logs

Look for these success indicators:

```
[process-video] Phase 2b: Split prompt into 2 parts
[process-video] Prompt split successfully: { part1: '...', part2: '...' }
[process-video] Clip 1 job created: sora_...
[process-video] Clip 1 completed, size: ...
[process-video] Clip 2 job created: sora_...
[process-video] Clip 2 completed, size: ...
[video-stitcher] Using Digital Ocean FFmpeg endpoint
[video-stitcher] External endpoint succeeded, output size: ...
[process-video] Video uploaded successfully
```

---

## 🐛 Troubleshooting

### Issue: "FFmpeg not available" error

**Cause:** `FFMPEG_ENDPOINT_URL` not set in environment variables

**Fix:**
1. Add environment variable in Vercel
2. Redeploy

### Issue: Stitching fails

**Possible causes:**
- Digital Ocean endpoint is down
- Endpoint URL is incorrect
- Clips are too large for endpoint

**Fix:**
1. Test endpoint directly with curl/Postman
2. Check endpoint logs
3. Verify clip sizes (should be ~5-10MB each)

### Issue: Videos are still 12 seconds

**Possible causes:**
- Using old deployment
- Stitching failed silently
- Wrong code version

**Fix:**
1. Check Vercel deployment logs
2. Verify latest git commit is deployed
3. Check for errors in process-video logs

### Issue: One clip generates, other fails

**Possible causes:**
- Sora quota exceeded
- Sora API rate limit
- Network timeout

**Fix:**
1. Check Sora API status
2. Verify OpenAI API key
3. Check maxDuration setting (should be 600s)

---

## 💰 Cost Implications

### Before (12-second videos)
- 1 Sora generation per video
- Cost: $X per video

### After (24-second videos)
- 2 Sora generations per video
- Digital Ocean FFmpeg call (minimal cost)
- **Cost: ~2x $X per video**

**Value:** 2x longer, complete narrative, better user satisfaction

---

## 🔄 Rollback Plan

If you need to revert to 12-second videos:

```bash
# Checkout previous version
git log --oneline  # Find commit before 2-clip implementation
git checkout [commit-hash]

# Deploy old version
vercel --prod

# Or create a rollback branch
git checkout -b rollback-to-12s [commit-hash]
git push origin rollback-to-12s
```

**Specific commit to rollback to:**
- Look for commit before "feat: update style presets for 24-second 2-clip videos"

---

## 📈 Success Metrics

### Key Indicators

After deployment, monitor:

1. **Completion Rate**
   - Target: >90% of videos complete successfully
   - Red flag: <80% completion rate

2. **Generation Time**
   - Target: 8-10 minutes average
   - Red flag: >12 minutes consistently

3. **Video Quality**
   - Manual review of first 5-10 videos
   - Check: Narrative flow, brand consistency, transition quality

4. **Error Rate**
   - Target: <5% failures
   - Common errors: Stitching, Sora timeouts, storage upload

5. **User Feedback**
   - Are users satisfied with 24s length?
   - Do videos tell complete stories?

---

## 📝 Next Steps

1. **Add FFMPEG_ENDPOINT_URL to Vercel** ← DO THIS FIRST
2. **Deploy to production** (automatic or `vercel --prod`)
3. **Generate test video** with a known website
4. **Monitor logs** for success/errors
5. **Review first generated video** for quality
6. **Iterate** if needed based on results

---

## 🎉 You're Ready!

Everything is implemented and committed. Once you:
1. Add the FFmpeg endpoint URL to Vercel environment variables
2. Deploy (or wait for auto-deploy)

Your users will start getting **24-second professional demo videos**! 🚀

---

## 🆘 Need Help?

If you encounter issues:

1. Check Vercel deployment logs
2. Check browser console (F12) for errors
3. Check process-video API logs in Vercel
4. Test Digital Ocean endpoint separately
5. Verify environment variables are set

**Expected success:** First test video should complete in 8-10 minutes with a smooth 24-second result.

Good luck! 🎬
