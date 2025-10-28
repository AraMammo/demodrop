interface WebsiteData {
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

interface StylePreset {
  name: string;
  duration: number;
  pacing_style: string;
  tone: string;
  visual_aesthetic: string;
  color_scheme: string;
  scene_structure: string;
}

export const STYLE_PRESETS: Record<string, StylePreset> = {
  'enterprise-saas': {
    name: 'Enterprise SaaS',
    duration: 30,
    pacing_style: 'Steady, confident, measured',
    tone: 'Professional, authoritative, data-driven',
    visual_aesthetic: 'Clean interfaces, dashboard screenshots, professional office environments',
    color_scheme: 'Corporate blues, grays, whites. Avoid bright colors.',
    scene_structure: `Scene 1 (0-6s): Problem statement - show professional struggling with current solution
Scene 2 (6-12s): Product interface - smooth navigation through key features
Scene 3 (12-18s): Data visualization - charts, metrics, ROI indicators
Scene 4 (18-24s): Team collaboration - multiple users benefiting
Scene 5 (24-30s): Success state - satisfied professional, clear results`,
  },
  
  'startup-energy': {
    name: 'Startup Energy',
    duration: 30,
    pacing_style: 'Fast, dynamic, high-energy',
    tone: 'Conversational, innovative, founder-led',
    visual_aesthetic: 'Modern workspaces, vibrant colors, young professionals, tech-forward',
    color_scheme: 'Bold primary colors, high contrast, energetic palette',
    scene_structure: `Scene 1 (0-5s): Hook - dynamic problem visualization, fast cuts
Scene 2 (5-10s): Solution reveal - product in action, quick feature showcase
Scene 3 (10-18s): Use cases - rapid-fire examples of product solving problems
Scene 4 (18-24s): Founder authenticity - real people, real results
Scene 5 (24-30s): Call to action - forward momentum, growth trajectory`,
  },
  
  'product-demo': {
    name: 'Product Demo',
    duration: 45,
    pacing_style: 'Clear, instructional, methodical',
    tone: 'Explanatory, technical but accessible',
    visual_aesthetic: 'Screen recordings, UI focus, feature callouts',
    color_scheme: 'Match product interface colors. Clean and functional.',
    scene_structure: `Scene 1 (0-8s): Problem context - show the pain point clearly
Scene 2 (8-20s): Feature 1 - detailed walkthrough with UI focus
Scene 3 (20-32s): Feature 2 - show integration or key capability
Scene 4 (32-40s): Feature 3 - demonstrate ease of use
Scene 5 (40-45s): Outcome - show final result and value delivered`,
  },
  
  'brand-story': {
    name: 'Brand Story',
    duration: 40,
    pacing_style: 'Thoughtful, human, emotionally resonant',
    tone: 'Authentic, empathetic, mission-driven',
    visual_aesthetic: 'Real people, genuine moments, warm lighting, human connection',
    color_scheme: 'Warm, inviting colors. Natural lighting. Earth tones.',
    scene_structure: `Scene 1 (0-8s): The founder's why - origin story or mission
Scene 2 (8-16s): Real customer stories - testimonial-style moments
Scene 3 (16-26s): Product in real life - authentic use cases
Scene 4 (26-34s): Community/impact - show broader effect
Scene 5 (34-40s): Invitation - join the mission, be part of the story`,
  }
};

export async function buildSoraPrompt(params: {
  websiteData: WebsiteData;
  stylePreset: string;
  customInstructions?: string;
  actualDuration?: number;  // Actual duration to request from Sora (overrides preset)
  videoStyle?: string;
}): Promise<string> {

  const { websiteData, stylePreset, customInstructions, actualDuration, videoStyle } = params;
  const preset = STYLE_PRESETS[stylePreset] || STYLE_PRESETS['product-demo'];

  // Use actualDuration if provided (for Sora API limits), otherwise use preset duration
  const videoDuration = actualDuration || preset.duration;

  const industry = classifyIndustry(websiteData);
  const audience = inferAudience(websiteData);

  const businessName = websiteData.title || 'Your Business';
  const valueProp = websiteData.heroText || websiteData.metaDescription || 'Innovative solutions';
  // For 12-second videos, focus on 1-2 key features. For longer videos, show up to 3.
  const featureCount = videoDuration <= 12 ? 2 : 3;
  const features = websiteData.features.slice(0, featureCount);
  const brand = websiteData.brand;

  // Use AI-generated understanding if available, otherwise fall back to meta description
  const whatItDoes = websiteData.productUnderstanding?.whatItDoes || websiteData.metaDescription;
  const workflow = websiteData.productUnderstanding?.userWorkflow;
  const enrichedFeatures = websiteData.productUnderstanding?.enrichedFeatures;

  const prompt = `Create a ${videoDuration}-second professional demo video for ${businessName}.
${whatItDoes ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 WHAT THIS PRODUCT ACTUALLY DOES (MUST SHOW THIS):
"${whatItDoes}"

${workflow ? `USER WORKFLOW TO VISUALIZE:
1. ${workflow.step1}
2. ${workflow.step2}
3. ${workflow.step3}
${workflow.step4 ? `4. ${workflow.step4}` : ''}

Visual Guide: ${workflow.visualDescription}` : ''}

${websiteData.productUnderstanding?.coreProblemSolved ? `
PROBLEM BEING SOLVED: ${websiteData.productUnderstanding.coreProblemSolved}
Show this problem visually, then show how the product solves it.` : ''}

THE VIDEO MUST DEMONSTRATE THIS EXACT WORKFLOW AND TRANSFORMATION.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

CRITICAL TIMING CONSTRAINT:
- Total video duration: EXACTLY ${videoDuration} seconds
- Any voiceover/narration MUST complete within ${videoDuration} seconds
- Script should be ${getWordCountForDuration(videoDuration)} words maximum (at 2.5 words per second)
- Pacing must feel natural, not rushed
- All scenes and transitions must fit within the ${videoDuration}-second limit
${videoDuration <= 12 ? `
12-SECOND VIDEO BEST PRACTICES:
- Make first 2 seconds COUNT - immediate brand recognition with logo and primary brand color
- Tell ONE story well, not multiple stories poorly
- Every frame must serve a purpose - no filler, no generic B-roll
- Strong opening hook that grabs attention in first 3 seconds
- Clear visual narrative that works even without audio
- Memorable closing frame that reinforces brand identity
- Aim for 3-4 scenes maximum to avoid feeling choppy` : ''}

BUSINESS CONTEXT:
- Industry: ${industry}
- Target audience: ${audience}
- Primary value proposition: ${valueProp}
- Brand key message: ${brand.keyMessage}

KEY FEATURES TO SHOWCASE (demonstrate these visually):
${enrichedFeatures && enrichedFeatures.length > 0 ?
  enrichedFeatures.map(f => `- ${f.name}: ${f.whatItDoes}
  Benefit: ${f.userBenefit}
  Visual Concept: ${f.visualConcept}`).join('\n') :
  features.map(f => `- ${f}`).join('\n')
}
${videoDuration <= 12 && enrichedFeatures && enrichedFeatures[0] ? `
NOTE: For ${videoDuration}-second videos, focus on "${enrichedFeatures[0].name}":
- What it does: ${enrichedFeatures[0].whatItDoes}
- Show this visually: ${enrichedFeatures[0].visualConcept}
Quality over quantity - demonstrate ONE feature exceptionally well.` : videoDuration <= 12 ? `
NOTE: For ${videoDuration}-second videos, focus on showcasing ONE primary feature ("${features[0]}") exceptionally well rather than cramming multiple features. Show exactly what this feature DOES and the transformation it creates.` : ''}

BRAND IDENTITY (CRITICAL - MUST BE ON-BRAND):
- Brand colors: ${brand.colors.join(', ')} - USE THESE EXACT COLORS throughout the video
- Brand tone: ${brand.tone} - Match this voice in any narration
- Visual style: ${brand.visualStyle} - Ensure aesthetic matches this style
- Key message: ${brand.keyMessage} - Center the video around this core message
${brand.logoUrl ? `- Company logo: Show the actual ${businessName} logo from ${brand.logoUrl}` : `- Branding: Use ${businessName} text/wordmark in brand colors (${brand.colors[0]}) - do NOT attempt to generate or create a logo`}

VISUAL STYLE:
- Aesthetic: ${preset.visual_aesthetic} combined with ${brand.visualStyle}
- Color palette: PRIMARY USE ${brand.colors[0]}, SECONDARY ${brand.colors[1]}, ACCENT ${brand.colors[2] || brand.colors[0]}
- Pacing: ${preset.pacing_style}
- Tone: ${preset.tone} with ${brand.tone} influence

SCENE STRUCTURE:
${generateSceneStructure(videoDuration, preset.pacing_style, features, businessName, websiteData.productUnderstanding)}

${websiteData.productUnderstanding?.videoGuidance ? `
VIDEO-SPECIFIC GUIDANCE FROM AI ANALYSIS:
- Opening Hook: ${websiteData.productUnderstanding.videoGuidance.openingHook}
- Key Visuals MUST Include: ${websiteData.productUnderstanding.videoGuidance.keyVisualsToShow.join(', ')}
- Emotional Tone: ${websiteData.productUnderstanding.videoGuidance.emotionalTone}
- CRITICAL CALLOUT: ${websiteData.productUnderstanding.videoGuidance.callout}
` : ''}

VOICEOVER GUIDANCE:
- Keep narration concise and impactful
- Maximum ${getWordCountForDuration(videoDuration)} words total${videoDuration <= 12 ? ` (only ${getWordCountForDuration(videoDuration)} words - make EVERY word count!)` : ''}
- Allow time for visual moments without narration
- Natural pauses between key points
- Must complete before the ${videoDuration}-second mark
${videoDuration <= 12 ? `- For ${videoDuration}s: Consider using just a single powerful tagline (5-8 words) rather than full narration` : ''}

${customInstructions ? `SPECIAL INSTRUCTIONS:\n${customInstructions}\n` : ''}
${videoStyle ? `
VIDEO AESTHETIC STYLE:
${getAestheticDescription(videoStyle)}
- Apply this visual aesthetic throughout the entire video
- Balance aesthetic style with brand identity - both must be clearly visible
` : ''}
Technical requirements:
- Aspect ratio: 16:9
- Resolution: 1080p
- No text overlays (we'll add those in post)
- Smooth transitions between scenes
- Professional polish`;

  return prompt;
}

function getWordCountForDuration(seconds: number): number {
  // Comfortable speaking pace is 2.5 words per second
  // But leave room for pauses and visual moments (80% of time for speaking)
  return Math.floor(seconds * 2.5 * 0.8);
}

function generateSceneStructure(duration: number, pacing: string, features: string[], businessName: string, productUnderstanding?: any): string {
  // Use AI-generated workflow if available
  const workflow = productUnderstanding?.userWorkflow;
  const enrichedFeatures = productUnderstanding?.enrichedFeatures;

  // Get feature descriptions
  const feature1 = enrichedFeatures?.[0]?.whatItDoes || features[0] || 'core functionality';
  const feature2 = enrichedFeatures?.[1]?.whatItDoes || features[1] || 'key benefit';
  const visualConcept1 = enrichedFeatures?.[0]?.visualConcept;

  if (duration <= 4) {
    return `Single scene (0-4s): ${workflow?.visualDescription || `Show ${businessName} solving the problem - demonstrate "${feature1}" in one quick, powerful visual`}`;
  } else if (duration <= 8) {
    return `Scene 1 (0-3s): ${workflow?.step1 || `Problem/need that ${businessName} solves - establish context`}
Scene 2 (3-6s): ${workflow?.step2 || `Demonstrate "${feature1}" in action - show what it DOES`}
Scene 3 (6-8s): ${workflow?.step3 || 'Result/benefit - clear outcome from using this feature'}`;
  } else if (duration <= 12) {
    return `Scene 1 (0-3s): POWERFUL HOOK - ${workflow?.step1 || `Show ${businessName} brand (logo/colors) + the specific problem this solves`}. Make it instantly recognizable.
Scene 2 (3-7s): SOLUTION IN ACTION - ${workflow?.step2 || `Demonstrate "${feature1}" working`}. ${visualConcept1 || 'Show the TRANSFORMATION or result it creates, not just the interface'}.
Scene 3 (7-10s): EMOTIONAL PAYOFF - ${workflow?.step3 || 'User seeing tangible results from using this feature'}. Real satisfaction, visible outcome, clear benefit delivered.
Scene 4 (10-12s): BRAND MOMENT - ${workflow?.step4 || `${businessName} logo/colors with brief hint of "${feature2}"`}. Memorable closing.`;
  } else if (duration <= 20) {
    return `Scene 1 (0-4s): Hook - show the specific problem that ${businessName} addresses
Scene 2 (4-9s): Demonstrate "${feature1}" - show exactly what this does and how
Scene 3 (9-14s): Demonstrate "${feature2}" - show additional value and capabilities
Scene 4 (14-17s): Show tangible results and benefits from using these features
Scene 5 (17-20s): ${businessName} brand moment and call to action`;
  } else {
    // For longer videos (if API supports them in the future)
    const feature3 = features[2] || 'additional capabilities';
    return `Scene 1 (0-6s): Real-world problem context that ${businessName} solves
Scene 2 (6-12s): Demonstrate "${feature1}" in detail - show the full workflow
Scene 3 (12-18s): Demonstrate "${feature2}" - show how features work together
Scene 4 (18-24s): Show "${feature3}" and demonstrate the complete value proposition
Scene 5 (24-${duration}s): Real customer results, ${businessName} brand story, and next steps`;
  }
}

function classifyIndustry(data: WebsiteData): string {
  const text = `${data.title} ${data.heroText}`.toLowerCase();
  
  if (text.includes('software') || text.includes('saas') || text.includes('app')) {
    return 'Technology / Software';
  }
  if (text.includes('real estate') || text.includes('property')) {
    return 'Real Estate';
  }
  if (text.includes('finance') || text.includes('banking')) {
    return 'Financial Services';
  }
  if (text.includes('health') || text.includes('medical')) {
    return 'Healthcare';
  }
  if (text.includes('ecommerce') || text.includes('shop')) {
    return 'E-commerce / Retail';
  }
  if (text.includes('consulting') || text.includes('service')) {
    return 'Professional Services';
  }
  
  return 'Technology / Professional Services';
}

function inferAudience(data: WebsiteData): string {
  const text = `${data.title} ${data.heroText}`.toLowerCase();
  
  if (text.includes('enterprise') || text.includes('business')) {
    return 'Business professionals and enterprise teams';
  }
  if (text.includes('startup') || text.includes('founder')) {
    return 'Startup founders and entrepreneurs';
  }
  if (text.includes('developer') || text.includes('engineer')) {
    return 'Developers and technical teams';
  }
  if (text.includes('creator') || text.includes('influencer')) {
    return 'Content creators and digital professionals';
  }
  
  return 'Business professionals';
}
