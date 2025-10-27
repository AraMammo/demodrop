# Brand Data Flow - Complete Pipeline

## Overview
This document explains how brand information is extracted from websites and inserted into Sora video prompts.

---

## Phase 1: Website Scraping & Brand Extraction

### Entry Point: `/app/api/process-video/route.ts`
```typescript
websiteData = await scrapeWebsite(websiteUrl);
```

### Scraper: `/lib/dumpling.ts`

#### Step 1: Dumpling AI API Call
```typescript
const response = await fetch('https://app.dumplingai.com/api/v1/scrape', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${DUMPLING_API}`,
  },
  body: JSON.stringify({
    url: url,
    format: 'markdown',  // Get clean markdown instead of HTML
    cleaned: true,       // Remove navigation, footers, etc.
    renderJs: true,      // Execute JavaScript for SPAs
  }),
});

const data = await response.json();
// Returns: { title, url, content (markdown) }
```

#### Step 2: Extract Core Content
```typescript
// From markdown content, extract:
const title = data.title || extractTitleFromUrl(url);
const heroText = extractHeroText(data.content);        // First H2 or substantial paragraph
const features = extractFeaturesFromMarkdown(data.content);  // Bullet points, H3s, bold text
const description = extractDescription(data.content);  // First paragraph 50-300 chars
```

#### Step 3: Infer Industry & Audience
```typescript
const industry = inferIndustry(title, heroText, description);
// Matches patterns: tech/saas, finance, healthcare, education, ecommerce, etc.

const targetAudience = inferTargetAudience(title, heroText, description);
// Matches: enterprise, startups, developers, consumers, students
```

#### Step 4: **EXTRACT BRAND IDENTITY** 🎨

##### Brand Tone (from language patterns):
```typescript
const brandTone = inferBrandTone(allText);
// Detects keywords:
// - "innovative, cutting-edge" → "Innovative and forward-thinking"
// - "friendly, easy, simple" → "Approachable and user-friendly"
// - "expert, professional" → "Professional and authoritative"
// - "fun, exciting" → "Energetic and playful"
// - "luxury, premium" → "Premium and refined"
// - "technical, precise" → "Technical and precise"
// - "human, caring" → "Human-centered and empathetic"
```

##### Brand Visual Style (from content + industry):
```typescript
const brandVisualStyle = inferVisualStyle(allText, industry);
// Detects keywords:
// - "minimal, clean" → "Minimalist and clean"
// - "bold, vibrant" → "Bold and vibrant"
// - "classic, elegant" → "Classic and elegant"
// - "modern, sleek" → "Modern and sleek"
// - "playful, creative" → "Playful and creative"
//
// Industry defaults:
// - Tech/SaaS → "Modern and tech-forward"
// - Finance → "Professional and trustworthy"
// - Healthcare → "Clean and calming"
// - Education → "Friendly and accessible"
// - E-commerce → "Vibrant and engaging"
```

##### Brand Colors (industry + visual style):
```typescript
const brandColors = inferBrandColors(industry, visualStyle);
// Industry-specific palettes:
// - Tech/SaaS: ['#3b82f6', '#1e40af', '#0ea5e9'] (Blues)
// - Finance: ['#10b981', '#059669', '#064e3b'] (Greens)
// - Healthcare: ['#06b6d4', '#0891b2', '#14b8a6'] (Teals)
// - Education: ['#f59e0b', '#d97706', '#7c2d12'] (Oranges)
// - E-commerce: ['#ec4899', '#db2777', '#be185d'] (Pinks)
// - Marketing: ['#8b5cf6', '#7c3aed', '#6d28d9'] (Purples)
// - Real Estate: ['#64748b', '#475569', '#334155'] (Grays)
//
// Visual style overrides:
// - "Bold/Vibrant" → Brighter versions
// - "Minimalist" → Monochrome ['#000000', '#ffffff', '#6b7280']
// - "Elegant" → Sophisticated grays
```

##### Key Message:
```typescript
const keyMessage = heroText || description || `${title}'s innovative solutions`;
```

#### Step 5: Return Complete WebsiteData Object
```typescript
return {
  title: "Company Name",
  heroText: "Primary value proposition",
  features: ["Feature 1", "Feature 2", "Feature 3"],
  metaDescription: "Meta description text",
  industry: "Technology / SaaS",
  targetAudience: "Enterprise / B2B decision-makers",
  brand: {
    colors: ['#3b82f6', '#1e40af', '#0ea5e9'],
    tone: 'Innovative and forward-thinking',
    visualStyle: 'Modern and tech-forward',
    keyMessage: 'Revolutionary AI-powered platform',
  }
};
```

---

## Phase 2: Prompt Generation

### Entry Point: `/app/api/process-video/route.ts`
```typescript
// Option A: AI-enhanced orchestration
prompt = await createProductionPrompt(
  websiteData,           // ← Contains brand object
  orchestratorPreset,
  customInstructions,
  actualDurationSeconds
);

// Option B: Basic fallback
prompt = await buildSoraPrompt({
  websiteData,           // ← Contains brand object
  stylePreset,
  customInstructions,
  actualDuration: actualDurationSeconds,
});
```

### Prompt Builder: `/lib/sora-prompt-builder.ts`

#### Extracts Brand Data:
```typescript
const brand = websiteData.brand;
```

#### Inserts Into Prompt Template:
```typescript
const prompt = `Create a ${videoDuration}-second professional demo video for ${businessName}.

CRITICAL TIMING CONSTRAINT:
- Total video duration: EXACTLY ${videoDuration} seconds
- Any voiceover/narration MUST complete within ${videoDuration} seconds
- Script should be ${getWordCountForDuration(videoDuration)} words maximum
- Pacing must feel natural, not rushed

BUSINESS CONTEXT:
- Industry: ${industry}
- Primary offering: ${valueProp}
- Key message: ${brand.keyMessage}              ← BRAND MESSAGE
- Target audience: ${audience}

KEY FEATURES TO SHOWCASE:
${features.map(f => `- ${f}`).join('\n')}

BRAND IDENTITY (CRITICAL - MUST BE ON-BRAND):
- Brand colors: ${brand.colors.join(', ')} - USE THESE EXACT COLORS throughout the video  ← BRAND COLORS
- Brand tone: ${brand.tone} - Match this voice in any narration                          ← BRAND TONE
- Visual style: ${brand.visualStyle} - Ensure aesthetic matches this style               ← BRAND STYLE
- Key message: ${brand.keyMessage} - Center the video around this core message           ← BRAND MESSAGE

VISUAL STYLE:
- Aesthetic: ${preset.visual_aesthetic} combined with ${brand.visualStyle}
- Color palette: PRIMARY USE ${brand.colors[0]}, SECONDARY ${brand.colors[1]}, ACCENT ${brand.colors[2]}  ← SPECIFIC COLORS
- Pacing: ${preset.pacing_style}
- Tone: ${preset.tone} with ${brand.tone} influence                                      ← BRAND TONE

VOICEOVER GUIDANCE:
- Keep narration concise and impactful
- Maximum ${getWordCountForDuration(videoDuration)} words total
- Allow time for visual moments without narration
- Natural pauses between key points

Technical requirements:
- Aspect ratio: 16:9
- Resolution: 1080p
- No text overlays (we'll add those in post)`;
```

### AI Orchestrator: `/lib/prompt-orchestrator.ts`

#### Sends Brand Context to GPT-4o:
```typescript
const userPrompt = `Create a cinematic video prompt for this product:

**Business:**
- Name: ${input.websiteData.title}
- Value Proposition: ${input.websiteData.heroText}
- Key Message: ${input.websiteData.brand.keyMessage}              ← BRAND
- Key Features: ${input.websiteData.features.join(', ')}
- Industry: ${input.websiteData.industry}
- Target Audience: ${input.websiteData.targetAudience}

**Brand Identity (CRITICAL - Video Must Be On-Brand):**
- Brand Colors: ${input.websiteData.brand.colors.join(', ')} - MUST use these exact colors  ← BRAND
- Brand Tone: ${input.websiteData.brand.tone} - Match this voice                            ← BRAND
- Visual Style: ${input.websiteData.brand.visualStyle} - Match this aesthetic               ← BRAND
- This is the ${input.websiteData.title} brand - make it unmistakably theirs

**Style Requirements:**
- Tone: ${input.stylePreset.tone} (combined with brand tone: ${input.websiteData.brand.tone})
- Aesthetic: ${input.stylePreset.aesthetic} (combined with brand style: ${input.websiteData.brand.visualStyle})

**CRITICAL TIMING CONSTRAINT:**
- Duration: EXACTLY ${input.duration} seconds
- Maximum ${Math.floor(input.duration * 2.5 * 0.8)} words for voiceover

Transform this into a production-ready video prompt...
`;
```

#### GPT-4o Returns Enhanced Prompt:
```typescript
const orchestratedContent = JSON.parse(response.choices[0].message.content);
// Returns JSON with enhancedPrompt that incorporates all brand data
```

#### Final Assembly:
```typescript
enhancedPrompt = `${enhancedPrompt}

CRITICAL: This video must feel unique to ${websiteData.title}.
- Use ONLY brand colors: ${websiteData.brand.colors.join(', ')}        ← BRAND
- Match brand tone: ${websiteData.brand.tone}                           ← BRAND
- Reflect visual style: ${websiteData.brand.visualStyle}                ← BRAND
- The video should be immediately recognizable as ${websiteData.title}'s brand`;
```

---

## Phase 3: Sora Video Generation

### Entry Point: `/app/api/process-video/route.ts`

```typescript
// Final prompt now contains:
// - Exact brand colors (#3b82f6, #1e40af, etc.)
// - Brand tone description
// - Visual style requirements
// - Key brand message

soraJob = await getOpenAI().videos.create({
  model: 'sora-2',
  prompt: prompt,  // ← Contains all brand data
  seconds: mapDurationToSora(preset.duration),  // '4', '8', or '12'
  size: '1280x720',
});
```

---

## Verification & Logging

### Logs to Check:

```
[dumpling] Extracted data: {
  "title": "Company Name",
  "brand": {
    "colors": ["#3b82f6", "#1e40af", "#0ea5e9"],
    "tone": "Innovative and forward-thinking",
    "visualStyle": "Modern and tech-forward",
    "keyMessage": "Revolutionary platform"
  }
}

[process-video] Website scraped successfully: {
  "title": "Company Name",
  "brand": {
    "colors": ["#3b82f6", "#1e40af", "#0ea5e9"],
    "tone": "Innovative and forward-thinking",
    "visualStyle": "Modern and tech-forward"
  }
}

[process-video] Brand data in prompt: {
  "hasBrandColors": true,
  "hasBrandTone": true,
  "brandColorsUsed": ["#3b82f6", "#1e40af", "#0ea5e9"],
  "brandToneUsed": "Innovative and forward-thinking"
}

[process-video] Prompt preview: Create a 12-second professional demo video for Company Name.

CRITICAL TIMING CONSTRAINT:
- Total video duration: EXACTLY 12 seconds
- Any voiceover/narration MUST complete within 12 seconds
- Script should be 24 words maximum

BRAND IDENTITY (CRITICAL - MUST BE ON-BRAND):
- Brand colors: #3b82f6, #1e40af, #0ea5e9 - USE THESE EXACT COLORS throughout...
```

---

## Summary: What Gets Extracted & Used

| Data Point | Source | Used In Prompt | Example |
|------------|--------|----------------|---------|
| **Brand Colors** | Industry + Visual Style | Yes - Explicit hex codes | `#3b82f6, #1e40af, #0ea5e9` |
| **Brand Tone** | Language patterns | Yes - Voiceover style | `"Innovative and forward-thinking"` |
| **Visual Style** | Keywords + Industry | Yes - Aesthetic requirements | `"Modern and tech-forward"` |
| **Key Message** | Hero text | Yes - Video focus | `"Revolutionary AI platform"` |
| **Title** | Page title | Yes - Company name | `"Acme Corp"` |
| **Features** | Bullets, headings | Yes - What to showcase | `["AI-powered", "Real-time"]` |
| **Industry** | Pattern matching | Yes - Context | `"Technology / SaaS"` |
| **Audience** | Pattern matching | Yes - Targeting | `"Enterprise decision-makers"` |

---

## Result

Videos generated will:
✅ Use the exact brand colors extracted from the company's industry/style
✅ Match the brand's tone in any narration
✅ Reflect the visual style of the company
✅ Center around their key brand message
✅ Feel authentically on-brand - immediately recognizable

This is **not** generic stock footage - it's brand-specific video content!
