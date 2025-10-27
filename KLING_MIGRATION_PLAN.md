# Migration Plan: Sora → KlingAI

## Executive Summary

**Goal**: Migrate from OpenAI Sora to KlingAI to enable longer demo videos (30-60+ seconds vs current 12-second limit)

**Current Limitations**:
- Sora max duration: 4, 8, or 12 seconds
- Style presets expect: 30-45 seconds
- Users want: Full demo videos with complete narratives

**Expected Benefits with KlingAI**:
- ✅ Longer video durations (potentially 30-60+ seconds)
- ✅ Match original preset durations (30, 30, 45, 40 seconds)
- ✅ Complete product demos with full narratives
- ✅ Better value for users (longer content)

---

## Phase 1: Research & Documentation Review

### KlingAI Capabilities to Verify

Before starting migration, we need to confirm:

1. **API Documentation**
   - [ ] Get API endpoint URLs
   - [ ] Understand authentication method (API key format)
   - [ ] Review rate limits and quotas
   - [ ] Check pricing structure

2. **Video Generation Capabilities**
   - [ ] Maximum video duration (confirm 30-60s or longer)
   - [ ] Supported aspect ratios (need 16:9 for demos)
   - [ ] Resolution options (need 1080p minimum)
   - [ ] Prompt format and limitations
   - [ ] Model versions available

3. **Generation Workflow**
   - [ ] Is it async (submit job → poll status)?
   - [ ] How to check job status?
   - [ ] How to download completed videos?
   - [ ] Error handling patterns
   - [ ] Typical generation time per second of video

4. **Advanced Features**
   - [ ] Image-to-video capability (for logo integration)
   - [ ] Style control parameters
   - [ ] Camera control
   - [ ] Motion control

### Questions for API Provider

1. What is the maximum video duration in one generation?
2. What is the recommended prompt format?
3. Are there any prompt length limits?
4. What's the average generation time for a 30-second video?
5. Can we specify exact brand colors in prompts?
6. Is there image-to-video for logo/brand consistency?

---

## Phase 2: Architecture Planning

### Current Sora Architecture

```
User submits URL
  ↓
Scrape website (Dumpling AI) → Extract brand data
  ↓
Generate prompt (prompt-orchestrator.ts)
  ↓
Map duration to Sora limits (4/8/12s)  ← LIMITATION
  ↓
Submit to OpenAI Sora API
  ↓
Poll job status every 5s
  ↓
Download video → Upload to Supabase Storage
  ↓
Update project status → User sees video
```

### Proposed KlingAI Architecture

```
User submits URL
  ↓
Scrape website (Dumpling AI) → Extract brand data
  ↓
Generate prompt (kling-prompt-builder.ts)  ← NEW MODULE
  ↓
Use ACTUAL preset durations (30/45s)  ← IMPROVEMENT
  ↓
Submit to KlingAI API  ← NEW INTEGRATION
  ↓
Poll job status (interval TBD)
  ↓
Download video → Upload to Supabase Storage
  ↓
Update project status → User sees video
```

---

## Phase 3: Code Changes Required

### 3.1. New Files to Create

#### `/lib/kling-client.ts` (NEW)
```typescript
// KlingAI API client wrapper
export class KlingClient {
  private apiKey: string;
  private baseUrl: string;

  async createVideo(params: {
    prompt: string;
    duration: number;
    aspectRatio: string;
    resolution: string;
  }): Promise<KlingJob>

  async getJobStatus(jobId: string): Promise<KlingJobStatus>

  async downloadVideo(jobId: string): Promise<Blob>
}
```

#### `/lib/kling-prompt-builder.ts` (NEW)
```typescript
// Similar to sora-prompt-builder.ts but optimized for KlingAI
// Will use ACTUAL preset durations (30, 45s) instead of mapping to 4/8/12
export async function buildKlingPrompt(params: {
  websiteData: WebsiteData;
  stylePreset: string;
  customInstructions?: string;
  actualDuration?: number;
}): Promise<string>
```

### 3.2. Files to Modify

#### `/lib/db.ts`
**Changes needed**:
```typescript
// Option A: Rename field (requires DB migration)
export interface Project {
  videoJobId?: string;  // Generic name instead of soraJobId
  videoProvider?: 'sora' | 'kling';  // Track which provider
}

// Option B: Keep soraJobId, reuse for KlingAI (simpler, no migration)
export interface Project {
  soraJobId?: string;  // Reuse as generic "video job ID"
}
```

**Recommendation**: Option B (reuse `soraJobId` as generic field) - Simpler, no DB migration

#### `/app/api/process-video/route.ts`
**Major changes**:
```typescript
// OLD: Sora integration
import { getOpenAI } from '@/lib/sora-client';
const soraJob = await getOpenAI().videos.create({...});

// NEW: KlingAI integration
import { KlingClient } from '@/lib/kling-client';
const klingClient = new KlingClient(process.env.KLING_API_KEY);
const klingJob = await klingClient.createVideo({...});

// OLD: Duration mapping
const mapDurationToSora = (duration: number): '4' | '8' | '12' => {...}

// NEW: Use actual durations
const videoDuration = preset.duration;  // 30, 45, etc.
```

#### `/lib/prompt-orchestrator.ts`
**Minor changes**:
- Update system prompt to mention KlingAI instead of Sora
- Remove Sora-specific duration constraints
- Add KlingAI-specific optimization hints (if any)

#### `/components/video-generator.tsx`
**Minor changes**:
- Update UI text: "Sora AI" → "KlingAI"
- Adjust estimated times (longer generation for 30s videos)
- Update phase descriptions

#### Environment Variables
**New variable needed**:
```bash
KLING_API_KEY=your_kling_api_key_here
```

### 3.3. Files to Review (Potentially Update)

- `/components/how-it-works.tsx` - Update marketing copy
- `/README.md` - Update technical documentation
- `/BRAND_DATA_FLOW.md` - Update API references
- UI components mentioning "Sora"

---

## Phase 4: Database Migration Strategy

### Option A: Add New Fields (More Robust)
```sql
ALTER TABLE projects
  ADD COLUMN video_provider VARCHAR(20) DEFAULT 'sora',
  ADD COLUMN video_job_id VARCHAR(255);

-- Migrate existing data
UPDATE projects
SET video_job_id = sora_job_id,
    video_provider = 'sora'
WHERE sora_job_id IS NOT NULL;
```

### Option B: Reuse Existing Fields (Simpler)
```sql
-- No migration needed!
-- Just reuse sora_job_id for KlingAI job IDs
-- Add comment to clarify
COMMENT ON COLUMN projects.sora_job_id IS 'Video generation job ID (Sora or KlingAI)';
```

**Recommendation**: Option B - Simpler, faster to implement, no downtime

---

## Phase 5: Implementation Steps

### Step 1: Setup & Research (Day 1)
- [ ] Get KlingAI API key from user
- [ ] Add to Vercel environment variables
- [ ] Test basic API call with curl/Postman
- [ ] Document API behavior and response format
- [ ] Determine optimal polling interval

### Step 2: Create KlingAI Client (Day 1-2)
- [ ] Create `/lib/kling-client.ts`
- [ ] Implement authentication
- [ ] Implement video creation
- [ ] Implement status polling
- [ ] Implement video download
- [ ] Add error handling
- [ ] Add logging

### Step 3: Adapt Prompt Builder (Day 2)
- [ ] Copy `/lib/sora-prompt-builder.ts` → `/lib/kling-prompt-builder.ts`
- [ ] Update STYLE_PRESETS to use actual durations
- [ ] Adjust prompt format for KlingAI (if different)
- [ ] Update scene structure generation for longer videos
- [ ] Test prompts with sample data

### Step 4: Update Process Video Route (Day 2-3)
- [ ] Replace Sora client with KlingAI client
- [ ] Remove duration mapping (use actual durations)
- [ ] Update polling logic (adjust interval if needed)
- [ ] Update progress mapping
- [ ] Test error handling

### Step 5: Update Prompt Orchestrator (Day 3)
- [ ] Update system prompts
- [ ] Remove Sora-specific constraints
- [ ] Add KlingAI-specific optimizations
- [ ] Test with orchestrator

### Step 6: Update UI & Copy (Day 3)
- [ ] Update video-generator.tsx
- [ ] Update estimated generation times
- [ ] Update marketing copy
- [ ] Update documentation

### Step 7: Testing (Day 4)
- [ ] Test with each style preset
- [ ] Test 30-second video generation
- [ ] Test 45-second video generation
- [ ] Test error scenarios
- [ ] Test quota handling
- [ ] Verify video quality
- [ ] Verify brand consistency

### Step 8: Deployment (Day 4-5)
- [ ] Deploy to staging (Vercel preview)
- [ ] Test end-to-end in staging
- [ ] Monitor logs and performance
- [ ] Deploy to production
- [ ] Monitor first few generations

---

## Phase 6: Testing Strategy

### Unit Tests
- KlingAI client API calls
- Prompt builder with various inputs
- Duration handling

### Integration Tests
- Full workflow: scrape → prompt → generate → download
- Error handling and retries
- Polling logic
- Storage upload

### Manual Tests
| Test Case | Expected Result |
|-----------|----------------|
| Generate 30s Enterprise SaaS video | ✅ Video is 30s, professional tone |
| Generate 45s Product Demo | ✅ Video is 45s, shows features |
| Invalid API key | ❌ Graceful error message |
| Website scraping fails | ❌ Shows fallback error |
| KlingAI timeout | ❌ Shows timeout error after 5min |
| Brand colors visible | ✅ Videos use correct brand colors |
| Logo appears | ✅ Company logo visible in video |

---

## Phase 7: Rollback Plan

### If KlingAI Doesn't Work

**Quick Rollback**:
1. Revert to previous git commit
2. Redeploy Sora version
3. All videos continue at 12s max

**Partial Rollback** (if some features work):
1. Keep KlingAI for specific presets
2. Fall back to Sora for others
3. Add provider selection UI

### Feature Flags Approach
```typescript
// Add feature flag
const USE_KLING = process.env.ENABLE_KLING === 'true';

if (USE_KLING) {
  // Use KlingAI
} else {
  // Use Sora
}
```

---

## Phase 8: Performance & Cost Considerations

### Expected Generation Times

| Duration | Sora Time | KlingAI Time (Est.) |
|----------|-----------|---------------------|
| 12s | 2-5 min | N/A |
| 30s | N/A | 5-10 min (?) |
| 45s | N/A | 8-15 min (?) |

**Action**: Increase `maxDuration` if needed (currently 300s = 5min)

### Polling Strategy

**Current**: Poll every 5 seconds
**Proposed**:
- First 2 min: Every 5s
- After 2 min: Every 10s
- After 5 min: Every 15s

### Cost Analysis

**Need to confirm**:
- Cost per video generation
- API quota limits
- Rate limits
- Best practices from KlingAI docs

---

## Phase 9: Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Research & API Testing | 4 hours | API key from user |
| Create KlingAI Client | 6 hours | Research complete |
| Adapt Prompt Builder | 4 hours | Client ready |
| Update API Routes | 6 hours | Prompt builder ready |
| Update UI & Copy | 2 hours | API routes working |
| Testing | 8 hours | All changes complete |
| Deployment | 2 hours | Testing passed |
| **Total** | **32 hours** (~4 days) | |

---

## Phase 10: Success Metrics

### Must Have
- ✅ Videos generate at 30+ seconds (not 12s)
- ✅ All 4 style presets work
- ✅ Brand colors appear correctly
- ✅ Videos complete without errors
- ✅ No degradation in quality

### Nice to Have
- ✅ Faster generation than Sora
- ✅ Better prompt adherence
- ✅ More consistent branding
- ✅ Lower cost per video

---

## Next Steps

### Immediate Actions Needed:

1. **User provides**:
   - [ ] KlingAI API key
   - [ ] KlingAI API documentation link
   - [ ] Confirm maximum video duration

2. **Research & Test**:
   - [ ] Review KlingAI docs
   - [ ] Test API with curl/Postman
   - [ ] Verify prompt format
   - [ ] Confirm async workflow

3. **Begin Implementation**:
   - [ ] Create `/lib/kling-client.ts`
   - [ ] Test basic video generation
   - [ ] Iterate from there

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| KlingAI doesn't support 30s+ videos | Low | High | Verify before starting |
| API is unstable/slow | Medium | High | Add robust error handling, timeouts |
| Prompt format incompatible | Medium | Medium | Test early, adjust prompts |
| Cost prohibitive | Low | High | Check pricing, set quotas |
| Quality worse than Sora | Medium | High | A/B test, keep Sora option |
| Breaking changes during migration | Low | High | Use feature flags |

---

## Questions for User

Before starting implementation:

1. **Do you have the KlingAI API key ready?**
2. **Do you have a link to KlingAI API documentation?**
3. **What is the maximum video duration KlingAI supports?**
4. **Is there any KlingAI-specific prompt format we should know about?**
5. **Should we keep Sora as a fallback option, or full migration?**
6. **Any existing KlingAI code examples you can share?**

---

## Approval Checklist

Before proceeding with implementation:

- [ ] User confirms KlingAI supports 30+ second videos
- [ ] API key is available
- [ ] Documentation is reviewed
- [ ] Timeline is acceptable (4 days)
- [ ] Cost structure is understood
- [ ] User approves this plan

**Once approved, we'll begin with Phase 1: Research & Documentation Review**
