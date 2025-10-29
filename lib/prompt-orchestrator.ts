// lib/prompt-orchestrator.ts
import OpenAI from 'openai';

// Lazy initialization to avoid build-time errors
let openai: OpenAI | null = null;
function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'placeholder',
    });
  }
  return openai;
}

// Map video aesthetic style to detailed description
function getAestheticDescription(style: string): string {
  const aesthetics: Record<string, string> = {
    modern: 'Modern & Clean - Professional footage with smooth camera movements, crisp product shots, bright lighting. Contemporary tech demo style with clean UI screens, modern environments, and polished production quality.',
    cinematic: 'Cinematic - Hollywood-quality footage with dramatic lighting, depth of field, film-like color grading. Professional camera movements (dollies, cranes), establishing shots, and artistic composition. Documentary meets commercial.',
    minimalist: 'Minimalist - Simple, elegant compositions with lots of negative space. Limited color palette, focus on essential elements only. Clean backgrounds, geometric framing, architectural photography style with sophisticated restraint.',
    animated: 'Motion Graphics Style - Video footage with dynamic camera movements that mimic animation. Fast-paced cuts, smooth transitions, overlay graphics/text, kinetic typography. Modern explainer video aesthetic with screen recordings and UI demonstrations.',
    analog: 'Retro Film - Vintage 35mm film aesthetic with natural grain, warm color temperature, slight vignetting. Authentic film camera imperfections, nostalgic 70s-90s commercial vibe. Practical lighting with warm tungsten tones.'
  };
  return aesthetics[style] || aesthetics.modern;
}

interface OrchestrationInput {
  websiteData: {
    title: string;
    heroText: string;
    features: string[];
    metaDescription?: string;
    industry: string;
    targetAudience: string;
    brand: {
      colors: string[];
      tone: string;
      visualStyle: string;
      keyMessage: string;
      logoUrl?: string;
    };
  };
  stylePreset: {
    name: string;
    tone: string;
    pacing: string;
    aesthetic: string;
  };
  userInstructions?: string;
  duration: number;
}

interface OrchestratedPrompt {
  enhancedPrompt: string;
  cinematicElements: {
    lighting: string;
    cameraWork: string;
    colorGrading: string;
    transitions: string;
  };
  sceneBreakdown: Array<{
    timing: string;
    description: string;
    visualDetails: string;
    emotionalTone: string;
  }>;
  technicalSpecs: {
    aspectRatio: string;
    resolution: string;
    framerate: string;
  };
}

export async function orchestratePrompt(
  input: OrchestrationInput
): Promise<OrchestratedPrompt> {
  
  const systemPrompt = `You are an expert video production director and cinematographer specializing in creating compelling demo videos. Your job is to transform basic product information into cinematic, production-quality video prompts that result in unique, memorable videos.

Your expertise includes:
- Cinematic storytelling and narrative arc
- Professional lighting and color grading
- Dynamic camera work and composition
- Brand-specific visual language
- Emotional resonance and viewer engagement

You understand that great demo videos are NOT generic stock footage. They tell a story, evoke emotion, and demonstrate value through visual metaphor and authentic scenarios.

Given the user's product information and style preferences, create a detailed, cinematic video prompt that:
1. Captures the unique essence of their business
2. Uses specific, evocative visual language (not generic terms)
3. Incorporates professional cinematography techniques
4. Creates emotional connection with the target audience
5. Makes the video impossible to replicate without understanding the specific business

CRITICAL: Return a JSON object with this EXACT structure:
{
  "enhancedPrompt": "A single string containing the complete video prompt with all details",
  "cinematicElements": {
    "lighting": "description of lighting",
    "cameraWork": "description of camera work",
    "colorGrading": "description of color grading",
    "transitions": "description of transitions"
  },
  "sceneBreakdown": [
    {
      "timing": "0-3s",
      "description": "scene description",
      "visualDetails": "visual details",
      "emotionalTone": "emotional tone"
    }
  ]
}

The "enhancedPrompt" field MUST be a plain string, NOT an object or nested structure.`;

  const userPrompt = `Create a cinematic video prompt for this product:

**Business:**
- Name: ${input.websiteData.title}
- Industry: ${input.websiteData.industry}
- Target Audience: ${input.websiteData.targetAudience}

**WHAT THIS PRODUCT ACTUALLY DOES (THIS IS CRITICAL):**
${input.websiteData.metaDescription ? `"${input.websiteData.metaDescription}"` : input.websiteData.heroText}

This description above is the CORE of what to show. The video must demonstrate this.

**Key Features to Showcase:**
${input.websiteData.features.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n')}

**Brand Message:**
"${input.websiteData.brand.keyMessage}"

**Brand Identity (CRITICAL - Video Must Be On-Brand):**
- Brand Colors: ${input.websiteData.brand.colors.join(', ')} - MUST use these exact colors
- Brand Tone: ${input.websiteData.brand.tone} - Match this voice
- Visual Style: ${input.websiteData.brand.visualStyle} - Match this aesthetic
- This is the ${input.websiteData.title} brand - make it unmistakably theirs

**Style Requirements:**
- Name: ${input.stylePreset.name}
- Tone: ${input.stylePreset.tone} (combined with brand tone: ${input.websiteData.brand.tone})
- Pacing: ${input.stylePreset.pacing}
- Aesthetic: ${input.stylePreset.aesthetic} (combined with brand style: ${input.websiteData.brand.visualStyle})

**User's Specific Instructions:**
${input.userInstructions || 'None provided - use your expertise to create the most compelling video possible'}

**CRITICAL TIMING CONSTRAINT:**
- Duration: EXACTLY ${input.duration} seconds
- ⚠️ VOICEOVER MUST COMPLETE BY SECOND ${input.duration - 1} - Leave final second for visual wrap-up
- Maximum ${Math.floor((input.duration - 1) * 2.5 * 0.8)} words for voiceover (2.5 words/sec with pauses, ending 1 second early)
- The last word must be spoken before the ${input.duration - 1}-second mark
- All scenes and transitions must fit within ${input.duration}-second limit
- Pacing should feel natural and complete, never cut off mid-word
${input.duration <= 12 ? `
**12-SECOND VIDEO OPTIMIZATION:**
Since this is a ${input.duration}-second video, every frame counts. Prioritize:
1. IMMEDIATE brand recognition - logo/colors visible within first 2 seconds
2. ONE clear, powerful message - don't try to show everything
3. Strong opening hook (0-3s) that grabs attention instantly
4. Clear visual progression that tells a story even without sound
5. Memorable closing moment that reinforces brand identity
6. Avoid excessive scene changes - aim for smooth, purposeful transitions
7. Make every second count - no filler, no generic footage
8. ⚠️ CRITICAL: Voiceover must finish completely by second ${input.duration - 1} (11s for 12s videos)` : ''}

Transform this into a production-ready video prompt that includes:
1. Specific visual metaphors unique to this business
2. Detailed lighting and color palette (specific hex codes or moods)
3. Camera movements and composition (precise shot types)
4. Authentic human moments (not stock footage scenarios)
5. Scene-by-scene breakdown with exact timing that adds up to ${input.duration} seconds
   - **CRITICAL**: Each scene must demonstrate ONE of the key features listed above
   - Show WHAT the product does, not just that it exists
   - Example: Don't say "user interacts with interface" - say "user records voice note and watches AI transform it into polished blog post"
6. Emotional beats that build viewer connection
7. Concise voiceover script (max ${Math.floor((input.duration - 1) * 2.5 * 0.8)} words) with natural pauses
   - Script should reference specific features/capabilities, not generic marketing speak
   - ⚠️ CRITICAL: Last word must be spoken before second ${input.duration - 1} - leave final second for visual only

Make it cinematic. Make it unique. Make it impossible to confuse with any other company's video.
CRITICAL: Ensure all timing fits within the ${input.duration}-second constraint.
CRITICAL: Voiceover must COMPLETE by second ${input.duration - 1} - never cut off mid-sentence.
CRITICAL: The video must clearly show what ${input.websiteData.title} DOES - demonstrate the actual features: ${input.websiteData.features.slice(0, 3).join(', ')}`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8, // Higher creativity for unique outputs
    });

    const orchestratedContent = JSON.parse(response.choices[0].message.content || '{}');

    // If orchestration didn't return proper data, use fallback
    if (!orchestratedContent.enhancedPrompt) {
      console.log('[orchestrator] AI did not return enhancedPrompt, using fallback');
      return buildFallbackPrompt(input);
    }

    // CRITICAL FIX: Validate that enhancedPrompt is a string, not an object
    let enhancedPromptString: string;
    if (typeof orchestratedContent.enhancedPrompt === 'string') {
      enhancedPromptString = orchestratedContent.enhancedPrompt;
    } else if (typeof orchestratedContent.enhancedPrompt === 'object') {
      console.log('[orchestrator] AI returned enhancedPrompt as object, attempting to serialize');
      // Try to extract the prompt from common object structures
      if (orchestratedContent.enhancedPrompt.prompt) {
        enhancedPromptString = orchestratedContent.enhancedPrompt.prompt;
      } else {
        // Fallback: serialize the entire object structure as a readable string
        enhancedPromptString = JSON.stringify(orchestratedContent.enhancedPrompt, null, 2);
        console.log('[orchestrator] Serialized object prompt');
      }
    } else {
      console.log('[orchestrator] enhancedPrompt has invalid type, using fallback');
      return buildFallbackPrompt(input);
    }

    // Validate and structure the response
    const result: OrchestratedPrompt = {
      enhancedPrompt: enhancedPromptString,
      cinematicElements: orchestratedContent.cinematicElements || {
        lighting: 'Natural, warm golden hour lighting',
        cameraWork: 'Steady handheld with intentional movement',
        colorGrading: 'Slightly desaturated with warm highlights',
        transitions: 'Smooth cuts on action'
      },
      sceneBreakdown: orchestratedContent.sceneBreakdown || [],
      technicalSpecs: {
        aspectRatio: '16:9',
        resolution: '1080p',
        framerate: '24fps'
      }
    };

    return result;

  } catch (error) {
    console.error('Orchestration error:', error);
    // Fallback to structured prompt if AI fails
    return buildFallbackPrompt(input);
  }
}

function buildFallbackPrompt(input: OrchestrationInput): OrchestratedPrompt {
  // Intelligent fallback that still creates unique prompts
  const businessName = input.websiteData.title;
  const industry = input.websiteData.industry;
  const tone = input.stylePreset.tone;
  const maxWords = Math.floor((input.duration - 1) * 2.5 * 0.8); // Leave 1 second buffer
  const brand = input.websiteData.brand;
  const voiceoverEndTime = input.duration - 1; // Voiceover must end 1 second before video ends

  return {
    enhancedPrompt: `Create a ${input.duration}-second cinematic demo video for ${businessName}, a ${industry} company.
${input.websiteData.metaDescription ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 WHAT THIS PRODUCT ACTUALLY DOES (MUST SHOW THIS):
"${input.websiteData.metaDescription}"

The video MUST visually demonstrate this exact functionality.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

CRITICAL TIMING CONSTRAINT:
- Duration: EXACTLY ${input.duration} seconds
- ⚠️ VOICEOVER MUST COMPLETE BY SECOND ${voiceoverEndTime} - Leave final second for visual wrap-up
- Maximum ${maxWords} words for voiceover (2.5 words/sec with pauses, ending at ${voiceoverEndTime}s)
- The last word must be spoken before the ${voiceoverEndTime}-second mark
- All scenes and transitions must fit within ${input.duration}-second limit
- Never cut off voiceover mid-word or mid-sentence
${input.duration <= 12 ? `- For ${input.duration}-second videos: Immediate brand visibility (0-2s), one clear message, strong hook, memorable closing, voiceover ends by ${voiceoverEndTime}s` : ''}

BRAND IDENTITY (MUST BE ON-BRAND):
- Brand Colors: ${brand.colors.join(', ')} - Use these exact colors throughout
- Brand Tone: ${brand.tone}
- Visual Style: ${brand.visualStyle}
- Key Message: ${brand.keyMessage}
${brand.logoUrl ? `- Logo: Show actual ${businessName} logo` : `- Branding: Show ${businessName} text/wordmark (do NOT generate logos)`}

Visual Style: ${input.stylePreset.aesthetic} with ${brand.visualStyle}
Emotional Tone: ${tone} with ${brand.tone}
Pacing: ${input.stylePreset.pacing}
Color Palette: PRIMARY ${brand.colors[0]}, SECONDARY ${brand.colors[1]}, ACCENT ${brand.colors[2] || brand.colors[0]}

Key Features to Showcase:
${input.websiteData.features.slice(0, 3).map((f: string, i: number) => `${i + 1}. ${f}`).join('\n')}

Scene Structure (${input.duration}s total):
${input.duration <= 12 ? `
- Scene 1 (0-3s): Show the problem/need - ${input.websiteData.metaDescription ? 'why people need what this product does' : 'establish context'}
- Scene 2 (3-7s): DEMONSTRATE in action: ${input.websiteData.metaDescription ? input.websiteData.metaDescription.split('that')[1]?.split('.')[0] || input.websiteData.features[0] : input.websiteData.features[0]}
  ^ Show the ACTUAL transformation/process, not just the interface
- Scene 3 (7-10s): Show the result/outcome - what the user gets
- Scene 4 (10-12s): ${businessName} branding with key message` : `
- Opening (0-${Math.floor(input.duration * 0.25)}s): Establish the problem/need with real scenario
- Middle (${Math.floor(input.duration * 0.25)}-${Math.floor(input.duration * 0.75)}s): Demonstrate: ${input.websiteData.metaDescription || input.websiteData.features.slice(0, 2).join(', ')}
  ^ Show the transformation happening, not just UI
- Closing (${Math.floor(input.duration * 0.75)}-${input.duration}s): Real results and ${businessName} branding`}

Voiceover Script (Maximum ${maxWords} words):
- Concise, impactful narration
- Natural pauses between key points
- ⚠️ CRITICAL: Must complete BEFORE ${voiceoverEndTime}-second mark (last word at ${voiceoverEndTime}s, not ${input.duration}s)
- Never cut off mid-word - leave final second (${voiceoverEndTime}s-${input.duration}s) for visual only

Cinematography:
- Use natural lighting with practical sources
- Camera movements should feel intentional, not generic
- Color palette derived from the company's actual brand
- Avoid any elements that feel like stock footage

Make this video feel authentic to ${businessName} - not a template that could work for anyone.`,
    cinematicElements: {
      lighting: 'Natural with practical sources',
      cameraWork: 'Purposeful handheld',
      colorGrading: 'Brand-aligned color palette',
      transitions: 'Natural cuts'
    },
    sceneBreakdown: [],
    technicalSpecs: {
      aspectRatio: '16:9',
      resolution: '1080p',
      framerate: '24fps'
    }
  };
}

// Enhanced version that adds industry-specific visual language
export function addIndustrySpecificDetails(
  basePrompt: string,
  industry: string
): string {
  
  const industryVisuals: Record<string, string> = {
    'Technology / Software': `
- Show real code on screens (not Lorem Ipsum)
- Terminal windows with actual commands
- Dashboard with meaningful data visualizations
- Modern tech office with multiple monitors
- Developers in authentic work scenarios (hoodies, coffee, focused)`,
    
    'Real Estate': `
- Genuine property tours (not staged empty rooms)
- Real neighborhood scenes (coffee shops, parks, schools)
- Actual property documents and paperwork
- Real estate agents in authentic consultation moments
- Properties with character and lived-in details`,
    
    'Healthcare': `
- Clean, well-lit medical environments
- Real medical professionals (not models in costumes)
- Actual medical equipment in use
- Patient-doctor interactions showing empathy
- Focus on human care, not just technology`,
    
    'Financial Services': `
- Professional office settings (not sterile corporate)
- Real financial dashboards with actual data
- Client meetings showing genuine trust
- Documents and paperwork that look authentic
- Focus on security and personal attention`,
    
    'E-commerce / Retail': `
- Products in natural lighting (not studio white backgrounds)
- Real unboxing moments with genuine reactions
- Actual packaging and shipping processes
- Customer satisfaction in authentic settings
- Show the product in real use, not posed`,
  };

  const industryDetail = industryVisuals[industry] || `
- Industry-authentic environments and scenarios
- Real professionals in their actual work settings
- Genuine tools and equipment specific to this field
- Authentic interactions and workflows
- Details that only someone in this industry would recognize`;

  return `${basePrompt}\n\nIndustry-Specific Visual Details:${industryDetail}`;
}

// Add brand personality based on tone analysis
export function inferBrandPersonality(
  websiteText: string,
  stylePreset: string
): string {
  const text = websiteText.toLowerCase();
  
  // Detect personality markers
  const isPlayful = text.includes('fun') || text.includes('easy') || text.includes('simple');
  const isTechnical = text.includes('api') || text.includes('integration') || text.includes('developer');
  const isLuxury = text.includes('premium') || text.includes('exclusive') || text.includes('curated');
  const isFounderLed = text.includes('we built') || text.includes('our story') || text.includes('we believe');
  
  if (isPlayful && stylePreset === 'startup-energy') {
    return 'Brand personality: Approachable innovator. Use warm colors, friendly interactions, and moments of delight. Show real smiles, not forced ones.';
  }
  
  if (isTechnical && stylePreset === 'enterprise-saas') {
    return 'Brand personality: Technical authority. Use precise UI details, actual code snippets, and professional environments. Show competence through authentic work scenarios.';
  }
  
  if (isLuxury) {
    return 'Brand personality: Refined excellence. Use soft lighting, elegant compositions, and premium materials. Show attention to detail and craftsmanship.';
  }
  
  if (isFounderLed) {
    return 'Brand personality: Human-first mission. Show real people, authentic emotions, and genuine moments. Avoid anything that feels corporate or staged.';
  }
  
  return 'Brand personality: Professional and trustworthy. Balance authenticity with polish.';
}

// Quality assurance - ensure prompt has specific details
export function validatePromptQuality(prompt: string): {
  isGood: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check for generic language
  const genericTerms = ['professional', 'modern', 'innovative', 'cutting-edge', 'seamless'];
  const foundGeneric = genericTerms.filter(term => prompt.toLowerCase().includes(term));
  
  if (foundGeneric.length > 2) {
    issues.push('Too many generic marketing terms');
    suggestions.push('Replace generic terms with specific visual details');
  }
  
  // Check for specific visual details
  const hasColors = /\b(#[0-9A-Fa-f]{6}|rgb|hsl)\b/.test(prompt) || 
                    /(warm|cool|vibrant|muted|earth tones|golden)/i.test(prompt);
  const hasCameraWork = /(wide shot|close-up|tracking|dolly|pan|tilt|handheld)/i.test(prompt);
  const hasLighting = /(natural light|golden hour|soft|hard|backlit|rim light)/i.test(prompt);
  
  if (!hasColors) {
    suggestions.push('Add specific color palette or mood');
  }
  if (!hasCameraWork) {
    suggestions.push('Include specific camera movements or shot types');
  }
  if (!hasLighting) {
    suggestions.push('Specify lighting conditions');
  }
  
  // Check for authenticity markers
  const hasAuthenticity = /(real|genuine|authentic|actual|specific)/i.test(prompt);
  if (!hasAuthenticity) {
    suggestions.push('Emphasize authentic, non-stock-footage scenarios');
  }
  
  const isGood = issues.length === 0 && suggestions.length <= 1;
  
  return { isGood, issues, suggestions };
}

// Main export: orchestrate and enhance
export async function createProductionPrompt(
  websiteData: any,
  stylePreset: any,
  userInstructions?: string,
  duration: number = 30,
  videoStyle?: string
): Promise<string> {
  
  // Step 1: AI orchestration
  const orchestrated = await orchestratePrompt({
    websiteData,
    stylePreset,
    userInstructions,
    duration
  });
  
  // Step 2: Add industry-specific details
  let enhancedPrompt = addIndustrySpecificDetails(
    orchestrated.enhancedPrompt,
    websiteData.industry
  );
  
  // Step 3: Add brand personality
  const personalityNote = inferBrandPersonality(
    `${websiteData.title} ${websiteData.heroText}`,
    stylePreset.name
  );
  enhancedPrompt = `${enhancedPrompt}\n\n${personalityNote}`;
  
  // Step 4: Add cinematic elements
  enhancedPrompt = `${enhancedPrompt}\n
Cinematic Details:
- Lighting: ${orchestrated.cinematicElements.lighting}
- Camera Work: ${orchestrated.cinematicElements.cameraWork}
- Color Grading: ${orchestrated.cinematicElements.colorGrading}
- Transitions: ${orchestrated.cinematicElements.transitions}

Technical Specifications:
- Aspect Ratio: ${orchestrated.technicalSpecs.aspectRatio}
- Resolution: ${orchestrated.technicalSpecs.resolution}
- Frame Rate: ${orchestrated.technicalSpecs.framerate}
${videoStyle ? `
Video Aesthetic Style: ${getAestheticDescription(videoStyle)}
- Apply this visual aesthetic throughout the entire video
- Balance aesthetic style with brand identity - both must be clearly visible` : ''}

CRITICAL: This video must feel unique to ${websiteData.title}.
- Use ONLY brand colors: ${websiteData.brand.colors.join(', ')}
- Match brand tone: ${websiteData.brand.tone}
- Reflect visual style: ${websiteData.brand.visualStyle}
- Avoid any visual elements that could be mistaken for stock footage or generic templates
- The video should be immediately recognizable as ${websiteData.title}'s brand`;

  // Step 5: Quality check
  const quality = validatePromptQuality(enhancedPrompt);
  
  if (!quality.isGood) {
    console.log('Prompt quality issues detected:', quality.issues);
    console.log('Suggestions:', quality.suggestions);
  }
  
  return enhancedPrompt;
}
