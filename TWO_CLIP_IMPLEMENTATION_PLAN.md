# 2-Clip Stitching Implementation Plan

## Goal
Generate 24-second demo videos by creating 2x 12-second Sora clips and stitching them together with seamless transitions.

---

## Overview

**Current State:**
- Single 12-second Sora video per generation
- Limited narrative capacity
- Users want longer demos

**Target State:**
- 2x 12-second clips = 24-second final video
- Complete narrative: Setup → Payoff
- Smooth transitions between clips
- Seamless user experience

---

## Architecture

### High-Level Flow

```
User submits URL
  ↓
Scrape website & extract brand data
  ↓
Generate TWO prompts (Part 1 + Part 2) with continuity
  ↓
Generate Clip 1 (0-12s) [Progress: 35-60%]
  ↓
Generate Clip 2 (12-24s) [Progress: 60-85%]
  ↓
Download both clips
  ↓
Stitch with FFmpeg (0.5s fade transition) [Progress: 85-95%]
  ↓
Upload final 24s video [Progress: 95-100%]
  ↓
User sees completed video
```

### Progress Mapping

| Stage | Progress % | Duration | Description |
|-------|-----------|----------|-------------|
| Scraping | 0-10% | ~10s | Extract website data |
| Prompt Generation | 10-35% | ~20s | AI creates 2-part narrative |
| **Clip 1 Generation** | 35-60% | ~3-4min | Sora generates first 12s |
| **Clip 2 Generation** | 60-85% | ~3-4min | Sora generates second 12s |
| Video Stitching | 85-95% | ~30s | FFmpeg merges clips |
| Upload & Finalize | 95-100% | ~10s | Save to storage |
| **Total** | **100%** | **~8-10min** | Complete workflow |

---

## Implementation Steps

### Step 1: Update Style Presets (30 minutes)

**File:** `/lib/sora-prompt-builder.ts`

**Changes:**
```typescript
export const STYLE_PRESETS: Record<string, StylePreset> = {
  'enterprise-saas': {
    name: 'Enterprise SaaS',
    duration: 24,  // Changed from 30
    // ... rest stays same
  },
  'startup-energy': {
    name: 'Startup Energy',
    duration: 24,  // Changed from 30
  },
  'product-demo': {
    name: 'Product Demo',
    duration: 24,  // Changed from 45
  },
  'brand-story': {
    name: 'Brand Story',
    duration: 24,  // Changed from 40
  }
};
```

**New Scene Structures for 24s:**
```typescript
// Enterprise SaaS (24s total)
Scene 1 (0-12s): Problem + Product Introduction
Scene 2 (12-24s): Key Features + Success

// Startup Energy (24s total)
Scene 1 (0-12s): Hook + Solution Reveal
Scene 2 (12-24s): Use Cases + CTA

// Product Demo (24s total)
Scene 1 (0-12s): Problem + Feature 1
Scene 2 (12-24s): Feature 2 + Outcome

// Brand Story (24s total)
Scene 1 (0-12s): Founder Story + Mission
Scene 2 (12-24s): Customer Impact + Invitation
```

---

### Step 2: Create Prompt Splitter (2 hours)

**New File:** `/lib/prompt-splitter.ts`

```typescript
export interface SplitPrompt {
  part1: {
    prompt: string;
    description: string; // "Opening: Problem introduction"
    duration: 12;
    timing: "0-12s";
  };
  part2: {
    prompt: string;
    description: string; // "Conclusion: Solution and results"
    duration: 12;
    timing: "12-24s";
    continuityHints: string; // "Continue from previous scene..."
  };
  fullNarrative: string; // Combined story arc
}

export async function splitPromptIntoTwo(
  fullPrompt: string,
  websiteData: WebsiteData,
  stylePreset: StylePreset
): Promise<SplitPrompt> {
  // Use GPT-4 to intelligently split the prompt
  // Ensure narrative continuity
  // Maintain brand consistency across both parts
}
```

**Prompt Engineering Strategy:**

```typescript
const systemPrompt = `You are an expert video director.
Split this 24-second video concept into TWO 12-second clips
that tell a complete story.

CRITICAL REQUIREMENTS:
1. Part 1 (0-12s): Setup, problem, or introduction
2. Part 2 (12-24s): Solution, resolution, or conclusion
3. Maintain visual continuity (same setting, characters, style)
4. Use EXACT same brand colors in both parts
5. Second clip should feel like natural continuation
6. Include transition hint at end of Part 1

Return JSON with:
{
  "part1": "12-second opening prompt...",
  "part2": "12-second conclusion prompt with continuity...",
  "transitionNote": "How to connect the clips visually"
}`;
```

---

### Step 3: Add FFmpeg Stitching Service (3 hours)

**New File:** `/lib/video-stitcher.ts`

```typescript
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

export interface StitchOptions {
  transitionDuration: number; // seconds (default: 0.5)
  transitionType: 'fade' | 'dissolve' | 'cut';
}

export async function stitchVideos(
  clip1: Blob,
  clip2: Blob,
  options: StitchOptions = {
    transitionDuration: 0.5,
    transitionType: 'fade'
  }
): Promise<Blob> {
  // Convert Blobs to buffers
  const buffer1 = Buffer.from(await clip1.arrayBuffer());
  const buffer2 = Buffer.from(await clip2.arrayBuffer());

  // Create temp file paths (or use streams)
  const inputStream1 = Readable.from(buffer1);
  const inputStream2 = Readable.from(buffer2);

  // FFmpeg command with fade transition
  return new Promise((resolve, reject) => {
    const outputChunks: Buffer[] = [];

    ffmpeg()
      .input(inputStream1)
      .input(inputStream2)
      .complexFilter([
        // Fade out clip 1 at end
        `[0:v]fade=t=out:st=11.5:d=0.5[v0]`,
        // Fade in clip 2 at start
        `[1:v]fade=t=in:st=0:d=0.5[v1]`,
        // Concatenate
        `[v0][0:a][v1][1:a]concat=n=2:v=1:a=1[outv][outa]`
      ])
      .outputOptions([
        '-map', '[outv]',
        '-map', '[outa]',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-preset', 'fast',
        '-crf', '23'
      ])
      .format('mp4')
      .on('end', () => {
        resolve(new Blob(outputChunks, { type: 'video/mp4' }));
      })
      .on('error', reject)
      .pipe()
      .on('data', (chunk) => outputChunks.push(chunk));
  });
}
```

**Note:** Vercel serverless functions may not have FFmpeg. Solutions:
1. Use FFmpeg Lambda Layer
2. Use external service (e.g., FFmpeg.wasm for browser, or dedicated service)
3. Use Vercel Edge Functions with FFmpeg

**Recommended:** Use `@ffmpeg/ffmpeg` (WebAssembly) or external stitching service.

---

### Step 4: Update Process Video Route (4 hours)

**File:** `/app/api/process-video/route.ts`

**Major Changes:**

```typescript
export async function POST(req: NextRequest) {
  try {
    // ... existing scraping and prompt generation ...

    // NEW: Split prompt into 2 parts
    const splitPrompt = await splitPromptIntoTwo(
      enhancedPrompt,
      websiteData,
      orchestratorPreset
    );

    console.log('[process-video] Split into 2 clips:', {
      part1: splitPrompt.part1.description,
      part2: splitPrompt.part2.description
    });

    // Phase 3a: Generate Clip 1
    await updateProject(projectId, {
      status: 'generating',
      prompt: splitPrompt.fullNarrative,
      progress: 35,
    });

    const clip1Job = await getOpenAI().videos.create({
      model: 'sora-2',
      prompt: splitPrompt.part1.prompt,
      seconds: '12',
      size: '1280x720',
    });

    await updateProject(projectId, {
      soraJobId: clip1Job.id, // Track first clip
      progress: 40,
    });

    // Poll for Clip 1 completion
    const clip1Result = await pollSoraJob(projectId, clip1Job.id, 35, 60);

    if (clip1Result.status !== 'completed') {
      throw new Error('Clip 1 generation failed');
    }

    // Download Clip 1
    const clip1Blob = clip1Result.videoBlob;

    // Phase 3b: Generate Clip 2
    await updateProject(projectId, {
      progress: 60,
      statusMessage: 'Generating second clip...'
    });

    const clip2Job = await getOpenAI().videos.create({
      model: 'sora-2',
      prompt: splitPrompt.part2.prompt,
      seconds: '12',
      size: '1280x720',
    });

    // Poll for Clip 2 completion
    const clip2Result = await pollSoraJob(projectId, clip2Job.id, 60, 85);

    if (clip2Result.status !== 'completed') {
      throw new Error('Clip 2 generation failed');
    }

    const clip2Blob = clip2Result.videoBlob;

    // Phase 4: Stitch videos
    await updateProject(projectId, {
      progress: 85,
      statusMessage: 'Stitching clips together...'
    });

    const finalVideo = await stitchVideos(clip1Blob, clip2Blob);

    // Phase 5: Upload final video
    await updateProject(projectId, { progress: 95 });
    const videoUrl = await uploadVideoToStorage(finalVideo, projectId);

    // Phase 6: Complete
    await updateProject(projectId, {
      status: 'completed',
      videoUrl,
      completedAt: Date.now(),
      progress: 100,
    });

    return NextResponse.json({ status: 'completed', videoUrl });

  } catch (error) {
    // ... error handling ...
  }
}
```

**Updated Polling Function:**

```typescript
async function pollSoraJob(
  projectId: string,
  soraJobId: string,
  startProgress: number,
  endProgress: number
): Promise<{ status: string; videoBlob?: Blob }> {
  const maxAttempts = 60;

  for (let i = 0; i < maxAttempts; i++) {
    const soraJob = await getOpenAI().videos.retrieve(soraJobId);

    // Map progress to our range
    const mappedProgress = Math.min(
      endProgress,
      startProgress + (soraJob.progress || 0) * (endProgress - startProgress) / 100
    );

    await updateProject(projectId, {
      progress: Math.round(mappedProgress),
    });

    if (soraJob.status === 'completed') {
      const videoResponse = await getOpenAI().videos.downloadContent(soraJobId);
      const videoBlob = await videoResponse.blob();
      return { status: 'completed', videoBlob };
    }

    if (soraJob.status === 'failed') {
      return { status: 'failed' };
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  return { status: 'timeout' };
}
```

---

### Step 5: Update UI Progress Indicators (1 hour)

**File:** `/components/video-generator.tsx`

**Changes:**

```typescript
const getStatusMessage = (progress: number): string => {
  if (progress < 10) return "Queuing...";
  if (progress < 35) return "Analyzing website & creating story...";
  if (progress < 60) return "Generating opening scene (Part 1/2)...";
  if (progress < 85) return "Generating conclusion (Part 2/2)...";
  if (progress < 95) return "Stitching clips together...";
  return "Finalizing your video...";
};

const getCurrentPhase = (progress: number): PhaseInfo => {
  if (progress < 10) return PHASES.scraping;
  if (progress < 35) return PHASES.enhancing;
  if (progress < 60) return PHASES.generating_clip1; // NEW
  if (progress < 85) return PHASES.generating_clip2; // NEW
  if (progress < 95) return PHASES.stitching; // NEW
  return PHASES.finalizing;
};

const getEstimatedTimeRemaining = (progress: number): string => {
  if (progress < 10) return "8-10 minutes";
  if (progress < 35) return "7-9 minutes";
  if (progress < 60) return "5-7 minutes"; // Clip 1 generating
  if (progress < 85) return "3-5 minutes"; // Clip 2 generating
  if (progress < 95) return "30-60 seconds"; // Stitching
  return "Almost done...";
};
```

**New Phase Definitions:**

```typescript
const PHASES: Record<string, PhaseInfo> = {
  // ... existing phases ...
  generating_clip1: {
    name: "Generating Part 1",
    description: "Creating opening scene (0-12s)",
    estimatedTime: "3-4 minutes",
  },
  generating_clip2: {
    name: "Generating Part 2",
    description: "Creating conclusion (12-24s)",
    estimatedTime: "3-4 minutes",
  },
  stitching: {
    name: "Stitching Clips",
    description: "Merging clips with smooth transition",
    estimatedTime: "30-60 seconds",
  },
};
```

---

### Step 6: Update Prompt Orchestrator (1 hour)

**File:** `/lib/prompt-orchestrator.ts`

**Changes:**

Update system prompt to mention 2-part structure:

```typescript
const systemPrompt = `You are an expert video production director...

CRITICAL: This video will be created in TWO 12-second parts (24s total).
Part 1 (0-12s): Introduction, problem, or setup
Part 2 (12-24s): Solution, outcome, or conclusion

Ensure your prompt can be naturally split into these two coherent parts
while maintaining visual continuity and brand consistency.`;
```

---

## Testing Plan

### Unit Tests

1. **Prompt Splitter**
   - Test splitting various prompt lengths
   - Verify brand consistency across parts
   - Check narrative coherence

2. **Video Stitcher**
   - Test with sample 12s clips
   - Verify 24s output duration
   - Check transition quality
   - Test audio synchronization

### Integration Tests

1. **Full Workflow**
   - Submit test URL
   - Verify 2 clips generated
   - Check stitching completes
   - Verify 24s final video

2. **Error Scenarios**
   - Clip 1 fails → graceful error
   - Clip 2 fails → retry or error
   - Stitching fails → clear error message

### Manual Tests

| Test Case | Expected Result |
|-----------|-----------------|
| Generate Enterprise SaaS 24s | ✅ 2 clips, smooth transition, professional tone |
| Generate Startup Energy 24s | ✅ 2 clips, energetic pacing, brand colors |
| Verify brand colors in both clips | ✅ Same colors Part 1 & Part 2 |
| Check audio continuity | ✅ No audio glitches at transition |
| Test progress updates | ✅ Shows "Part 1/2" and "Part 2/2" |
| Verify final duration | ✅ Exactly 24 seconds |

---

## Deployment Strategy

### Phase 1: Development (Days 1-2)
- [ ] Set up FFmpeg in development
- [ ] Build prompt splitter
- [ ] Build video stitcher
- [ ] Update process-video route
- [ ] Test locally with sample clips

### Phase 2: Staging (Day 2)
- [ ] Deploy to Vercel preview
- [ ] Test FFmpeg on Vercel (or use alternative)
- [ ] Generate test videos end-to-end
- [ ] Verify quality and transitions

### Phase 3: Production (Day 3)
- [ ] Deploy to production
- [ ] Monitor first few generations
- [ ] Gather user feedback
- [ ] Optimize if needed

---

## Technical Challenges & Solutions

### Challenge 1: FFmpeg on Vercel

**Problem:** Vercel serverless doesn't include FFmpeg by default

**Solutions:**
1. **FFmpeg Lambda Layer** (AWS)
2. **@ffmpeg/ffmpeg** (WebAssembly - slower but works)
3. **External stitching service** (e.g., Cloudflare Stream)
4. **Custom Docker container** on Vercel

**Chosen Solution:** Use `@ffmpeg/ffmpeg` for simplicity

### Challenge 2: Narrative Continuity

**Problem:** Ensuring Part 2 flows naturally from Part 1

**Solution:**
- Use GPT-4 to split with continuity instructions
- Include "previous scene context" in Part 2 prompt
- Test with various website types
- Iterate on prompt engineering

### Challenge 3: Progress Accuracy

**Problem:** Two async operations make progress tracking complex

**Solution:**
- Clip 1: 35-60% (25% range)
- Clip 2: 60-85% (25% range)
- Stitching: 85-95% (10% range)
- Clear phase names: "Part 1/2" and "Part 2/2"

---

## Cost Analysis

### Per Video Cost

**Current (1x 12s clip):**
- 1 Sora generation = $X

**New (2x 12s clips stitched):**
- 2 Sora generations = 2x $X
- FFmpeg stitching = negligible
- **Total = 2x current cost**

**Value Proposition:**
- 2x cost for 2x length = fair value
- Users get complete narrative
- Competitive with other platforms

---

## Success Metrics

### Must Have
- ✅ Videos generate at 24 seconds (not 12s)
- ✅ Smooth transitions between clips
- ✅ No audio glitches
- ✅ Brand consistency across both parts
- ✅ Narrative coherence

### Nice to Have
- ✅ Generation time < 10 minutes
- ✅ Imperceptible transition (looks like one video)
- ✅ User satisfaction with length
- ✅ High completion rate

---

## Timeline

| Task | Duration | Owner |
|------|----------|-------|
| Update style presets | 30 min | Claude |
| Create prompt splitter | 2 hours | Claude |
| Add FFmpeg stitching | 3 hours | Claude |
| Update process-video route | 4 hours | Claude |
| Update UI indicators | 1 hour | Claude |
| Testing | 2 hours | Claude |
| Deployment | 1 hour | Claude |
| **Total** | **~14 hours** | **~2 days** |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| FFmpeg not available on Vercel | Use @ffmpeg/ffmpeg or external service |
| Poor narrative continuity | Extensive prompt engineering & testing |
| Transition looks jarring | Test multiple transition styles |
| Generation timeout (2x time) | Increase maxDuration to 600s (10min) |
| One clip fails | Retry logic for failed clip |

---

## Next Steps

1. **Immediate:** Start with Step 1 (Update Style Presets)
2. **Then:** Build prompt splitter (Step 2)
3. **Then:** Implement FFmpeg stitching (Step 3)
4. **Finally:** Update API routes and test (Steps 4-6)

Ready to start implementation! 🚀
