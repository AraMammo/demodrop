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
}): Promise<string> {

  const { websiteData, stylePreset, customInstructions, actualDuration } = params;
  const preset = STYLE_PRESETS[stylePreset] || STYLE_PRESETS['product-demo'];

  // Use actualDuration if provided (for Sora API limits), otherwise use preset duration
  const videoDuration = actualDuration || preset.duration;

  const industry = classifyIndustry(websiteData);
  const audience = inferAudience(websiteData);

  const businessName = websiteData.title || 'Your Business';
  const valueProp = websiteData.heroText || websiteData.metaDescription || 'Innovative solutions';
  const features = websiteData.features.slice(0, 3);
  const brand = websiteData.brand;

  const prompt = `Create a ${videoDuration}-second professional demo video for ${businessName}.

CRITICAL TIMING CONSTRAINT:
- Total video duration: EXACTLY ${videoDuration} seconds
- Any voiceover/narration MUST complete within ${videoDuration} seconds
- Script should be ${getWordCountForDuration(videoDuration)} words maximum (at 2.5 words per second)
- Pacing must feel natural, not rushed
- All scenes and transitions must fit within the ${videoDuration}-second limit

BUSINESS CONTEXT:
- Industry: ${industry}
- Primary offering: ${valueProp}
- Key message: ${brand.keyMessage}
- Target audience: ${audience}

KEY FEATURES TO SHOWCASE:
${features.map(f => `- ${f}`).join('\n')}

BRAND IDENTITY (CRITICAL - MUST BE ON-BRAND):
- Brand colors: ${brand.colors.join(', ')} - USE THESE EXACT COLORS throughout the video
- Brand tone: ${brand.tone} - Match this voice in any narration
- Visual style: ${brand.visualStyle} - Ensure aesthetic matches this style
- Key message: ${brand.keyMessage} - Center the video around this core message
${brand.logoUrl ? `- Company logo: USE THE ACTUAL LOGO from the website (visible at ${brand.logoUrl}) - DO NOT create or generate a different logo` : '- Logo: Use simple, recognizable brand mark based on company name'}

VISUAL STYLE:
- Aesthetic: ${preset.visual_aesthetic} combined with ${brand.visualStyle}
- Color palette: PRIMARY USE ${brand.colors[0]}, SECONDARY ${brand.colors[1]}, ACCENT ${brand.colors[2] || brand.colors[0]}
- Pacing: ${preset.pacing_style}
- Tone: ${preset.tone} with ${brand.tone} influence

SCENE STRUCTURE:
${generateSceneStructure(videoDuration, preset.pacing_style)}

VOICEOVER GUIDANCE:
- Keep narration concise and impactful
- Maximum ${getWordCountForDuration(videoDuration)} words total
- Allow time for visual moments without narration
- Natural pauses between key points
- Must complete before the ${videoDuration}-second mark

${customInstructions ? `SPECIAL INSTRUCTIONS:\n${customInstructions}\n` : ''}
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

function generateSceneStructure(duration: number, pacing: string): string {
  // Generate appropriate scene structure based on actual video duration
  if (duration <= 4) {
    return `Single scene: Quick product showcase with key value proposition (0-4s)`;
  } else if (duration <= 8) {
    return `Scene 1 (0-3s): Problem statement or hook
Scene 2 (3-6s): Solution/product reveal
Scene 3 (6-8s): Key benefit or call to action`;
  } else if (duration <= 12) {
    return `Scene 1 (0-3s): Hook - establish the problem or context
Scene 2 (3-7s): Solution - show product/service in action
Scene 3 (7-10s): Benefit - demonstrate key value
Scene 4 (10-12s): Outcome - satisfied result or next step`;
  } else if (duration <= 20) {
    return `Scene 1 (0-4s): Hook - problem visualization
Scene 2 (4-9s): Product introduction and key feature
Scene 3 (9-14s): Secondary feature or use case
Scene 4 (14-17s): Customer benefit visualization
Scene 5 (17-20s): Call to action or brand moment`;
  } else {
    // For longer videos (if API supports them in the future)
    return `Scene 1 (0-6s): Problem context with authentic scenario
Scene 2 (6-12s): Product interface and primary features
Scene 3 (12-18s): Secondary features or integrations
Scene 4 (18-24s): Results and customer satisfaction
Scene 5 (24-${duration}s): Brand story and call to action`;
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
