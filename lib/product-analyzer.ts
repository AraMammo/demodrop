// lib/product-analyzer.ts
// AI-powered deep analysis of product content to understand what it actually does

import OpenAI from 'openai';
import type { ParsedContent } from './content-parser';
import type { EnrichedContextData } from './multi-source-scraper';

// Lazy initialization
let openai: OpenAI | null = null;
function getOpenAI() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'placeholder') {
      throw new Error('OPENAI_API_KEY environment variable is not set or is using placeholder value');
    }
    openai = new OpenAI({
      apiKey,
    });
  }
  return openai;
}

export interface ProductUnderstanding {
  // Core understanding
  whatItDoes: string; // Clear 1-2 sentence explanation
  coreProblemSolved: string; // What pain point does it address?

  // Workflow
  userWorkflow: {
    step1: string;
    step2: string;
    step3: string;
    step4?: string;
    visualDescription: string; // How to show this visually
  };

  // Features with context
  enrichedFeatures: Array<{
    name: string;
    whatItDoes: string; // Action verb description
    userBenefit: string; // What user gets
    visualConcept: string; // How to show in video
  }>;

  // Use cases
  concreteExamples: Array<{
    scenario: string;
    before: string; // Problem state
    after: string; // Solution state
    transformation: string; // What changed
  }>;

  // Video guidance
  videoGuidance: {
    openingHook: string; // How to start the video
    keyVisualsToShow: string[]; // Specific things that must appear
    emotionalTone: string; // How should it feel
    callout: string; // Most important thing to emphasize
  };
}

export async function analyzeProduct(
  parsedContent: ParsedContent,
  metadata: {
    title: string;
    url: string;
    metaDescription?: string;
  },
  enrichedContext?: EnrichedContextData
): Promise<ProductUnderstanding> {

  if (enrichedContext) {
    const sources = [];
    if (enrichedContext.videoDemo) sources.push('YouTube demo');
    if (enrichedContext.socialVisuals) sources.push('Instagram');
    if (enrichedContext.customBrief) sources.push('voice briefing');
    console.log(`[product-analyzer] Starting ENHANCED analysis for: ${metadata.title} (with ${sources.join(', ')})`);
  } else {
    console.log('[product-analyzer] Starting deep analysis for:', metadata.title);
  }

  const analysisPrompt = buildAnalysisPrompt(parsedContent, metadata, enrichedContext);

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a product analyst expert at understanding SaaS products, apps, and digital services.

Your job is to read website content and extract a CRYSTAL CLEAR understanding of:
1. What the product actually DOES (not marketing fluff - real functionality)
2. The step-by-step user workflow
3. What transformation it creates for users
4. How to visually demonstrate it in a video

Be specific. Use action verbs. Describe transformations, not features.

Example:
BAD: "AI-powered content platform"
GOOD: "Records your voice notes and automatically converts them into formatted blog posts with images"

Return a JSON object with your analysis.`
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent, factual analysis
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');

    console.log('[product-analyzer] Analysis complete');
    console.log('[product-analyzer] What it does:', analysis.whatItDoes?.substring(0, 100));
    console.log('[product-analyzer] Enriched features:', analysis.enrichedFeatures?.length);

    // Validate and structure the response
    return validateAndStructure(analysis, parsedContent, metadata);

  } catch (error) {
    console.error('[product-analyzer] Analysis failed:', error);
    // Return fallback understanding based on parsed content
    return buildFallbackUnderstanding(parsedContent, metadata);
  }
}

function buildAnalysisPrompt(
  parsedContent: ParsedContent,
  metadata: any,
  enrichedContext?: EnrichedContextData
): string {
  let prompt = `Analyze this product and tell me EXACTLY what it does:

**Product Name:** ${metadata.title}
**Meta Description:** ${metadata.metaDescription || 'Not provided'}

**Hero Section:**
${parsedContent.hero.heading}
${parsedContent.hero.subheading}
${parsedContent.hero.description}

**Features Found:**
${parsedContent.features.map((f, i) => `
${i + 1}. ${f.title}
   ${f.description}
   ${f.details}
`).join('\n')}

**How It Works:**
${parsedContent.howItWorks.steps.map((s, i) => `
Step ${i + 1}: ${s.title} - ${s.description}
`).join('\n')}
${parsedContent.howItWorks.workflow}

**Use Cases:**
${parsedContent.useCases.map(uc => `- ${uc.scenario}: ${uc.description}`).join('\n')}

**Benefits:**
${parsedContent.benefits.join('\n')}`;

  // Add enriched context if available
  if (enrichedContext) {
    prompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎬 ADDITIONAL CONTEXT (Use this for better understanding!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    if (enrichedContext.videoDemo) {
      prompt += `\n\n**📺 YOUTUBE DEMO TRANSCRIPT:**
Video Title: ${enrichedContext.videoDemo.videoTitle}
Transcript: ${enrichedContext.videoDemo.transcript.substring(0, 3000)}${enrichedContext.videoDemo.transcript.length > 3000 ? '...' : ''}

This shows the ACTUAL product in action. Use this to understand what the product REALLY does.`;
    }

    if (enrichedContext.socialVisuals) {
      prompt += `\n\n**📷 INSTAGRAM INSIGHTS:**
Bio: ${enrichedContext.socialVisuals.bio}
Recent Posts:
${enrichedContext.socialVisuals.posts.slice(0, 5).map((p, i) => `${i + 1}. ${p.caption}`).join('\n')}

This shows the brand's visual identity and tone.`;
    }

    if (enrichedContext.customBrief) {
      prompt += `\n\n**🎤 VOICE BRIEFING FROM USER:**
${enrichedContext.customBrief.transcript}

This is the user's custom requirements. Pay SPECIAL attention to this - these are direct instructions.`;
    }

    prompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  prompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based on ALL this content, provide a JSON response with this structure:

{
  "whatItDoes": "One clear sentence explaining what this product does. Use action verbs. Example: 'Automatically transcribes Zoom calls and generates meeting notes with action items'",

  "coreProblemSolved": "What specific pain point or problem does this solve?",

  "userWorkflow": {
    "step1": "First thing user does",
    "step2": "What happens next",
    "step3": "Final step/result",
    "step4": "Optional fourth step if needed",
    "visualDescription": "How to visually show this workflow in a video - be specific about what appears on screen"
  },

  "enrichedFeatures": [
    {
      "name": "Feature name",
      "whatItDoes": "Action verb description - what happens when you use it",
      "userBenefit": "What the user gets / what changes for them",
      "visualConcept": "Specific visual to show this feature (e.g., 'Split screen: messy voice memo on left, clean blog post appearing on right')"
    }
  ],

  "concreteExamples": [
    {
      "scenario": "Specific use case scenario",
      "before": "State before using product",
      "after": "State after using product",
      "transformation": "What visibly changed"
    }
  ],

  "videoGuidance": {
    "openingHook": "How should a 12-second video start? Describe the opening shot.",
    "keyVisualsToShow": ["Specific visual 1", "Specific visual 2", "Specific visual 3"],
    "emotionalTone": "How should the video feel? (e.g., 'Empowering and relieving', 'Exciting and dynamic')",
    "callout": "The ONE thing that must be crystal clear in the video"
  }
}

Be SPECIFIC. Don't say "user interacts with interface" - say "user taps record button, speaks for 30 seconds, watches AI generate formatted blog post with images."`;

  return prompt;
}

function validateAndStructure(
  rawAnalysis: any,
  parsedContent: ParsedContent,
  metadata: any
): ProductUnderstanding {

  // Ensure all required fields exist
  return {
    whatItDoes: rawAnalysis.whatItDoes || parsedContent.hero.description || 'Digital platform',
    coreProblemSolved: rawAnalysis.coreProblemSolved || 'Improves workflow efficiency',

    userWorkflow: {
      step1: rawAnalysis.userWorkflow?.step1 || 'User accesses the platform',
      step2: rawAnalysis.userWorkflow?.step2 || 'User interacts with features',
      step3: rawAnalysis.userWorkflow?.step3 || 'User gets results',
      step4: rawAnalysis.userWorkflow?.step4,
      visualDescription: rawAnalysis.userWorkflow?.visualDescription || 'User workflow demonstration'
    },

    enrichedFeatures: (rawAnalysis.enrichedFeatures || []).slice(0, 3).map((f: any) => ({
      name: f.name || 'Feature',
      whatItDoes: f.whatItDoes || 'Provides functionality',
      userBenefit: f.userBenefit || 'Improves experience',
      visualConcept: f.visualConcept || 'Feature demonstration'
    })),

    concreteExamples: (rawAnalysis.concreteExamples || []).slice(0, 2).map((ex: any) => ({
      scenario: ex.scenario || 'User scenario',
      before: ex.before || 'Before state',
      after: ex.after || 'After state',
      transformation: ex.transformation || 'Improved state'
    })),

    videoGuidance: {
      openingHook: rawAnalysis.videoGuidance?.openingHook || 'Open with product in use',
      keyVisualsToShow: rawAnalysis.videoGuidance?.keyVisualsToShow || ['Product interface', 'User interaction', 'Results'],
      emotionalTone: rawAnalysis.videoGuidance?.emotionalTone || 'Professional and engaging',
      callout: rawAnalysis.videoGuidance?.callout || metadata.metaDescription || parsedContent.hero.subheading
    }
  };
}

function buildFallbackUnderstanding(
  parsedContent: ParsedContent,
  metadata: any
): ProductUnderstanding {

  console.log('[product-analyzer] Using fallback understanding');

  return {
    whatItDoes: metadata.metaDescription || parsedContent.hero.description || 'Digital platform for business needs',
    coreProblemSolved: 'Streamlines workflows and improves efficiency',

    userWorkflow: {
      step1: parsedContent.howItWorks.steps[0]?.title || 'Access the platform',
      step2: parsedContent.howItWorks.steps[1]?.title || 'Use the features',
      step3: parsedContent.howItWorks.steps[2]?.title || 'Get results',
      step4: parsedContent.howItWorks.steps[3]?.title,
      visualDescription: 'Show user going through the workflow step by step'
    },

    enrichedFeatures: parsedContent.features.slice(0, 3).map(f => ({
      name: f.title,
      whatItDoes: f.description || 'Provides key functionality',
      userBenefit: f.details || 'Improves user experience',
      visualConcept: `Demonstrate ${f.title} in action`
    })),

    concreteExamples: parsedContent.useCases.slice(0, 2).map(uc => ({
      scenario: uc.scenario,
      before: 'Manual process',
      after: 'Automated solution',
      transformation: uc.description
    })),

    videoGuidance: {
      openingHook: `Show the problem that ${metadata.title} solves`,
      keyVisualsToShow: parsedContent.features.slice(0, 3).map(f => f.title),
      emotionalTone: 'Professional and solution-focused',
      callout: metadata.metaDescription || parsedContent.hero.subheading
    }
  };
}
