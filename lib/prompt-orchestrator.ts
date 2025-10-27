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

interface OrchestrationInput {
  websiteData: {
    title: string;
    heroText: string;
    features: string[];
    industry: string;
    targetAudience: string;
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

Return a JSON object with the enhanced prompt and production details.`;

  const userPrompt = `Create a cinematic video prompt for this product:

**Business:**
- Name: ${input.websiteData.title}
- Value Proposition: ${input.websiteData.heroText}
- Key Features: ${input.websiteData.features.join(', ')}
- Industry: ${input.websiteData.industry}
- Target Audience: ${input.websiteData.targetAudience}

**Style Requirements:**
- Name: ${input.stylePreset.name}
- Tone: ${input.stylePreset.tone}
- Pacing: ${input.stylePreset.pacing}
- Aesthetic: ${input.stylePreset.aesthetic}

**User's Specific Instructions:**
${input.userInstructions || 'None provided - use your expertise to create the most compelling video possible'}

**CRITICAL TIMING CONSTRAINT:**
- Duration: EXACTLY ${input.duration} seconds
- Any voiceover/narration MUST complete within ${input.duration} seconds
- Maximum ${Math.floor(input.duration * 2.5 * 0.8)} words for voiceover (comfortable speaking pace with pauses)
- All scenes, transitions, and narration must fit within ${input.duration}-second limit
- Pacing should feel natural, not rushed

Transform this into a production-ready video prompt that includes:
1. Specific visual metaphors unique to this business
2. Detailed lighting and color palette (specific hex codes or moods)
3. Camera movements and composition (precise shot types)
4. Authentic human moments (not stock footage scenarios)
5. Scene-by-scene breakdown with exact timing that adds up to ${input.duration} seconds
6. Emotional beats that build viewer connection
7. Concise voiceover script (max ${Math.floor(input.duration * 2.5 * 0.8)} words) with natural pauses

Make it cinematic. Make it unique. Make it impossible to confuse with any other company's video.
CRITICAL: Ensure all timing fits within the ${input.duration}-second constraint.`;

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

    // Validate and structure the response
    const result: OrchestratedPrompt = {
      enhancedPrompt: orchestratedContent.enhancedPrompt,
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
  const maxWords = Math.floor(input.duration * 2.5 * 0.8);

  return {
    enhancedPrompt: `Create a ${input.duration}-second cinematic demo video for ${businessName}, a ${industry} company.

CRITICAL TIMING CONSTRAINT:
- Duration: EXACTLY ${input.duration} seconds
- Any voiceover/narration MUST complete within ${input.duration} seconds
- Maximum ${maxWords} words for voiceover (2.5 words/sec with pauses)
- All scenes and transitions must fit within ${input.duration}-second limit

Visual Style: ${input.stylePreset.aesthetic}
Emotional Tone: ${tone}
Pacing: ${input.stylePreset.pacing}

Scene Structure:
- Opening: Establish the problem with authentic human frustration (not stock footage)
- Middle: Show the product solving the problem with specific UI interactions
- Closing: Real satisfaction moment - genuine emotion, not posed

Voiceover Script (Maximum ${maxWords} words):
- Concise, impactful narration
- Natural pauses between key points
- Must complete before ${input.duration}-second mark

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
  duration: number = 30
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

CRITICAL: This video must feel unique to this specific company. Avoid any visual elements that could be mistaken for stock footage or generic templates.`;
  
  // Step 5: Quality check
  const quality = validatePromptQuality(enhancedPrompt);
  
  if (!quality.isGood) {
    console.log('Prompt quality issues detected:', quality.issues);
    console.log('Suggestions:', quality.suggestions);
  }
  
  return enhancedPrompt;
}
