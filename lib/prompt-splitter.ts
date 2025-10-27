// lib/prompt-splitter.ts
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

export interface SplitPrompt {
  part1: {
    prompt: string;
    description: string; // "Opening: Problem introduction"
    duration: 12;
    timing: string; // "0-12s"
  };
  part2: {
    prompt: string;
    description: string; // "Conclusion: Solution and results"
    duration: 12;
    timing: string; // "12-24s"
    continuityHints: string; // "Continue from previous scene..."
  };
  fullNarrative: string; // Combined story arc
  transitionNote: string; // How to connect clips visually
}

interface WebsiteData {
  title: string;
  heroText: string;
  features: string[];
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
  tone: string;
  pacing: string;
  aesthetic: string;
}

export async function splitPromptIntoTwo(
  fullPrompt: string,
  websiteData: WebsiteData,
  stylePreset: StylePreset
): Promise<SplitPrompt> {

  const systemPrompt = `You are an expert video director and storytelling specialist.

Your job is to take a 24-second video concept and split it into TWO perfectly connected 12-second video clips that will be stitched together seamlessly.

CRITICAL REQUIREMENTS FOR SUCCESS:

1. **Narrative Continuity**
   - Part 1 (0-12s): Setup, problem, or introduction
   - Part 2 (12-24s): Development, solution, or conclusion
   - The second clip MUST feel like a natural continuation of the first

2. **Visual Consistency**
   - Use the EXACT same brand colors in both parts
   - Maintain same visual style and aesthetic
   - Keep setting/environment consistent (or logically connected)
   - If characters/people appear, keep them consistent

3. **Seamless Transition**
   - End of Part 1 should flow naturally into start of Part 2
   - No abrupt changes in tone, pacing, or energy
   - Visual elements at 12s should connect to visual elements at 12.001s

4. **Brand Alignment**
   - Both parts must reflect the brand's identity
   - Consistent tone and messaging throughout
   - Logo/branding visible in both parts (if applicable)

5. **Timing Constraints**
   - Part 1: EXACTLY 12 seconds
   - Part 2: EXACTLY 12 seconds
   - Total narrative: EXACTLY 24 seconds
   - Voiceover for Part 1: Maximum 24 words (2.5 words/sec * 12s * 0.8)
   - Voiceover for Part 2: Maximum 24 words

Return a JSON object with this exact structure:
{
  "part1": "Detailed 12-second video prompt for opening...",
  "part1Description": "Brief description like 'Opening: Problem introduction'",
  "part2": "Detailed 12-second video prompt for conclusion...",
  "part2Description": "Brief description like 'Conclusion: Solution and results'",
  "continuityHints": "Specific visual/audio cues to ensure seamless transition...",
  "transitionNote": "How to connect the clips (e.g., 'Fade through shared color', 'Match on action')",
  "fullNarrative": "Complete 24-second story arc summary..."
}`;

  const userPrompt = `Split this 24-second video concept into two 12-second parts:

**FULL VIDEO CONCEPT:**
${fullPrompt}

**BRAND INFORMATION (MUST BE CONSISTENT ACROSS BOTH PARTS):**
- Company: ${websiteData.title}
- Brand Colors: ${websiteData.brand.colors.join(', ')} - USE THESE EXACT COLORS IN BOTH PARTS
- Brand Tone: ${websiteData.brand.tone}
- Visual Style: ${websiteData.brand.visualStyle}
- Key Message: ${websiteData.brand.keyMessage}
${websiteData.brand.logoUrl ? `- Logo: Use actual logo from ${websiteData.brand.logoUrl}` : ''}

**STYLE REQUIREMENTS:**
- Preset: ${stylePreset.name}
- Tone: ${stylePreset.tone}
- Pacing: ${stylePreset.pacing}
- Aesthetic: ${stylePreset.aesthetic}

**CRITICAL INSTRUCTIONS:**

1. Split the narrative logically:
   - Part 1: Should establish context, show problem, or introduce concept
   - Part 2: Should deliver solution, show results, or conclude story

2. Ensure visual continuity:
   - If Part 1 ends with a person looking at a screen, Part 2 should start with that same person/screen
   - If Part 1 ends with brand colors prominent, Part 2 should start with same colors
   - Keep lighting, setting, and mood consistent

3. Create smooth transition:
   - Describe how Part 1's ending visuals connect to Part 2's opening
   - Use match cuts, color continuity, or action matching
   - Avoid jarring changes

4. Maintain brand consistency:
   - Use brand colors ${websiteData.brand.colors[0]}, ${websiteData.brand.colors[1]} throughout
   - Keep ${websiteData.brand.tone} tone in both parts
   - Reflect ${websiteData.brand.visualStyle} aesthetic consistently

5. Timing discipline:
   - Part 1: 12 seconds exactly (voiceover max 24 words)
   - Part 2: 12 seconds exactly (voiceover max 24 words)

Split this intelligently to create a seamless 24-second video when clips are stitched together.`;

  try {
    console.log('[prompt-splitter] Splitting prompt into 2 parts with GPT-4...');

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7, // Balanced creativity and consistency
    });

    const splitContent = JSON.parse(response.choices[0].message.content || '{}');

    if (!splitContent.part1 || !splitContent.part2) {
      console.error('[prompt-splitter] AI did not return proper split, using fallback');
      return buildFallbackSplit(fullPrompt, websiteData, stylePreset);
    }

    const result: SplitPrompt = {
      part1: {
        prompt: splitContent.part1,
        description: splitContent.part1Description || 'Part 1: Opening',
        duration: 12,
        timing: '0-12s',
      },
      part2: {
        prompt: splitContent.part2,
        description: splitContent.part2Description || 'Part 2: Conclusion',
        duration: 12,
        timing: '12-24s',
        continuityHints: splitContent.continuityHints || 'Continue seamlessly from Part 1',
      },
      fullNarrative: splitContent.fullNarrative || `${websiteData.title} demo video`,
      transitionNote: splitContent.transitionNote || 'Smooth fade transition',
    };

    console.log('[prompt-splitter] Successfully split prompt:', {
      part1Desc: result.part1.description,
      part2Desc: result.part2.description,
      transition: result.transitionNote,
    });

    return result;

  } catch (error) {
    console.error('[prompt-splitter] Error splitting prompt:', error);
    return buildFallbackSplit(fullPrompt, websiteData, stylePreset);
  }
}

function buildFallbackSplit(
  fullPrompt: string,
  websiteData: WebsiteData,
  stylePreset: StylePreset
): SplitPrompt {
  // Intelligent fallback if AI splitting fails
  const businessName = websiteData.title;
  const brandColors = websiteData.brand.colors.join(', ');
  const brandTone = websiteData.brand.tone;
  const brandStyle = websiteData.brand.visualStyle;

  // Simple but effective split: Problem → Solution
  const part1Prompt = `Create a 12-second opening video for ${businessName}.

EXACT DURATION: 12 seconds

BRAND IDENTITY:
- Brand Colors: ${brandColors} - USE THESE EXACT COLORS
- Brand Tone: ${brandTone}
- Visual Style: ${brandStyle}
- Key Message: ${websiteData.brand.keyMessage}

PART 1 FOCUS (0-12s): Problem and Introduction
- Open with the problem or challenge (0-5s)
- Show relatable frustration or pain point (5-9s)
- Introduce the product/solution smoothly (9-12s)
- End with a visual that leads into solution (camera on product, person looking hopeful)

Style: ${stylePreset.aesthetic}
Tone: ${stylePreset.tone}
Pacing: ${stylePreset.pacing}

Keep visuals clean, on-brand, and set up for seamless continuation.`;

  const part2Prompt = `Create a 12-second conclusion video for ${businessName}.

EXACT DURATION: 12 seconds

BRAND IDENTITY (MUST MATCH PART 1):
- Brand Colors: ${brandColors} - USE THESE EXACT COLORS
- Brand Tone: ${brandTone}
- Visual Style: ${brandStyle}
- Key Message: ${websiteData.brand.keyMessage}

PART 2 FOCUS (12-24s): Solution and Results
- Continue seamlessly from Part 1 (use same setting/characters if applicable)
- Show product in action solving the problem (12-17s)
- Demonstrate key features or benefits (17-21s)
- Close with satisfied customer and call to action (21-24s)

CRITICAL: This is a continuation, not a new video. Maintain:
- Same brand colors (${brandColors})
- Same visual style (${brandStyle})
- Same tone (${brandTone})
- Visual continuity from Part 1

Style: ${stylePreset.aesthetic}
Tone: ${stylePreset.tone}
Pacing: ${stylePreset.pacing}`;

  return {
    part1: {
      prompt: part1Prompt,
      description: 'Part 1: Problem and Introduction',
      duration: 12,
      timing: '0-12s',
    },
    part2: {
      prompt: part2Prompt,
      description: 'Part 2: Solution and Results',
      duration: 12,
      timing: '12-24s',
      continuityHints: 'Continue with same brand colors, setting, and visual style. Match tone and energy from Part 1.',
    },
    fullNarrative: `${businessName} demo video: Problem → Solution → Results`,
    transitionNote: 'Smooth fade transition with matching brand colors',
  };
}
