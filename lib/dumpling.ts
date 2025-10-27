interface WebsiteData {
  title: string;
  heroText: string;
  features: string[];
  metaDescription?: string;
  industry: string;
  targetAudience: string;
  brand: {
    colors: string[];  // Primary brand colors
    tone: string;      // Brand voice/tone (professional, playful, technical, etc.)
    visualStyle: string; // Visual aesthetic (modern, classic, minimalist, bold, etc.)
    keyMessage: string;  // Primary value proposition/message
  };
}

interface DumplingAIResponse {
  title: string;
  url: string;
  content: string;
  metadata?: Record<string, any>;
}

export async function scrapeWebsite(url: string): Promise<WebsiteData> {
  const apiKey = process.env.DUMPLING_API;

  if (!apiKey) {
    console.warn('DUMPLING_API key not found, using fallback scraper');
    return getFallbackData(url);
  }

  try {
    console.log('[dumpling] Scraping website with Dumpling AI:', url);

    const response = await fetch('https://app.dumplingai.com/api/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: url,
        format: 'markdown',
        cleaned: true,
        renderJs: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[dumpling] API error:', response.status, errorText);
      throw new Error(`Dumpling AI API error: ${response.status}`);
    }

    const data: DumplingAIResponse = await response.json();
    console.log('[dumpling] Successfully scraped. Title:', data.title);

    // Extract meaningful data from the markdown content
    const title = data.title || extractTitleFromUrl(url);
    const heroText = extractHeroText(data.content);
    const features = extractFeaturesFromMarkdown(data.content);
    const description = extractDescription(data.content);

    // Infer industry and audience from content
    const allText = `${title} ${heroText} ${data.content.substring(0, 2000)}`;
    const industry = inferIndustry(title, heroText, description);
    const targetAudience = inferTargetAudience(title, heroText, description);

    // Extract brand information
    const brandTone = inferBrandTone(allText);
    const brandVisualStyle = inferVisualStyle(allText, industry);
    const brandColors = inferBrandColors(industry, brandVisualStyle);
    const keyMessage = heroText || description || `${title}'s innovative solutions`;

    const result = {
      title,
      heroText,
      features,
      metaDescription: description,
      industry,
      targetAudience,
      brand: {
        colors: brandColors,
        tone: brandTone,
        visualStyle: brandVisualStyle,
        keyMessage: keyMessage,
      },
    };

    console.log('[dumpling] Extracted data:', JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error('[dumpling] Scraping failed:', error);
    return getFallbackData(url);
  }
}

function getFallbackData(url: string): WebsiteData {
  const hostname = new URL(url).hostname.replace('www.', '');
  const formattedName = hostname
    .split('.')[0]
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: formattedName,
    heroText: 'Professional business services',
    features: ['Quality service', 'Expert team', 'Proven results'],
    industry: 'Professional Services',
    targetAudience: 'Business professionals',
    brand: {
      colors: ['#2563eb', '#1e40af', '#ffffff'], // Default professional blues
      tone: 'Professional and trustworthy',
      visualStyle: 'Modern and clean',
      keyMessage: 'Professional business services',
    },
  };
}

function extractTitleFromUrl(url: string): string {
  const hostname = new URL(url).hostname.replace('www.', '');
  return hostname
    .split('.')[0]
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function extractHeroText(markdown: string): string {
  // Look for the first heading (# or ##) or first substantial paragraph
  const lines = markdown.split('\n').filter(line => line.trim());

  // Try to find first H1 or H2 after the title
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i].trim();
    if (line.startsWith('##') && !line.startsWith('###')) {
      return line.replace(/^##\s*/, '').trim();
    }
  }

  // Fall back to first substantial paragraph
  for (const line of lines.slice(0, 30)) {
    const text = line.trim();
    if (!text.startsWith('#') && !text.startsWith('[') && text.length > 30 && text.length < 200) {
      return text;
    }
  }

  return 'Innovative solutions for your business';
}

function extractDescription(markdown: string): string {
  const lines = markdown.split('\n').filter(line => line.trim());

  // Find first paragraph that looks like a description
  for (const line of lines.slice(0, 40)) {
    const text = line.trim();
    if (
      !text.startsWith('#') &&
      !text.startsWith('[') &&
      !text.startsWith('-') &&
      !text.startsWith('*') &&
      text.length > 50 &&
      text.length < 300
    ) {
      return text;
    }
  }

  return '';
}

function extractFeaturesFromMarkdown(markdown: string): string[] {
  const features: string[] = [];
  const lines = markdown.split('\n');

  // Strategy 1: Extract from bullet lists (most common for features)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Look for markdown bullet points
    if ((line.startsWith('- ') || line.startsWith('* ')) && line.length > 15 && line.length < 120) {
      const text = line.replace(/^[-*]\s+/, '').trim();

      // Filter out navigation and common non-feature items
      if (!text.match(/^(home|about|contact|blog|pricing|login|sign up|sign in|menu|privacy|terms)/i)) {
        features.push(text);
      }
    }
  }

  // Strategy 2: Extract from headings (H3/H4 often used for features)
  if (features.length < 3) {
    for (const line of lines) {
      const text = line.trim();
      if (text.startsWith('###') && !text.startsWith('####')) {
        const heading = text.replace(/^###\s*/, '').trim();
        if (
          heading.length > 10 &&
          heading.length < 80 &&
          !heading.match(/^(about|contact|blog|pricing|testimonial|faq|reviews)/i)
        ) {
          features.push(heading);
        }
      }
    }
  }

  // Strategy 3: Look for bold text that might indicate features
  if (features.length < 3) {
    const boldMatches = markdown.matchAll(/\*\*(.*?)\*\*/g);
    for (const match of boldMatches) {
      const text = match[1].trim();
      if (text.length > 15 && text.length < 80 && !features.includes(text)) {
        features.push(text);
      }
    }
  }

  // Remove duplicates and return top 3-5 features
  const uniqueFeatures = Array.from(new Set(features))
    .filter(f => f.length > 15 && f.length < 120)
    .slice(0, 5);

  // If we still don't have good features, return generic ones
  if (uniqueFeatures.length === 0) {
    return ['Comprehensive solutions', 'Expert team and support', 'Proven track record'];
  }

  return uniqueFeatures.slice(0, 3);
}

function inferIndustry(title: string, heroText: string, description: string): string {
  const text = `${title} ${heroText} ${description}`.toLowerCase();

  if (text.match(/\b(software|saas|app|tech|digital|cloud|api)\b/)) return 'Technology / SaaS';
  if (text.match(/\b(ecommerce|shop|store|retail|marketplace)\b/)) return 'E-commerce / Retail';
  if (text.match(/\b(finance|fintech|banking|payment|investment)\b/)) return 'Finance / FinTech';
  if (text.match(/\b(health|medical|healthcare|wellness|fitness)\b/)) return 'Healthcare / Wellness';
  if (text.match(/\b(education|learning|course|training|school)\b/)) return 'Education / EdTech';
  if (text.match(/\b(real estate|property|housing|rental)\b/)) return 'Real Estate';
  if (text.match(/\b(marketing|advertising|agency|creative)\b/)) return 'Marketing / Agency';
  if (text.match(/\b(consulting|advisory|professional services)\b/)) return 'Consulting / Professional Services';

  return 'Professional Services';
}

function inferTargetAudience(title: string, heroText: string, description: string): string {
  const text = `${title} ${heroText} ${description}`.toLowerCase();

  if (text.match(/\b(enterprise|b2b|business|corporate|company)\b/)) return 'Enterprise / B2B decision-makers';
  if (text.match(/\b(startup|founder|entrepreneur|small business)\b/)) return 'Startups and small businesses';
  if (text.match(/\b(developer|engineer|technical|api)\b/)) return 'Developers and technical teams';
  if (text.match(/\b(consumer|customer|user|individual)\b/)) return 'General consumers';
  if (text.match(/\b(student|learner|educator|teacher)\b/)) return 'Students and educators';

  return 'Business professionals';
}

function inferBrandTone(text: string): string {
  const lowerText = text.toLowerCase();

  // Analyze language patterns for brand tone
  if (lowerText.match(/\b(innovative|cutting-edge|revolutionary|breakthrough|disruptive)\b/)) {
    return 'Innovative and forward-thinking';
  }
  if (lowerText.match(/\b(friendly|easy|simple|intuitive|effortless)\b/)) {
    return 'Approachable and user-friendly';
  }
  if (lowerText.match(/\b(expert|professional|enterprise|trusted|reliable)\b/)) {
    return 'Professional and authoritative';
  }
  if (lowerText.match(/\b(fun|exciting|vibrant|dynamic|energetic)\b/)) {
    return 'Energetic and playful';
  }
  if (lowerText.match(/\b(luxury|premium|exclusive|elegant|sophisticated)\b/)) {
    return 'Premium and refined';
  }
  if (lowerText.match(/\b(technical|precise|accurate|detailed|engineered)\b/)) {
    return 'Technical and precise';
  }
  if (lowerText.match(/\b(human|personal|caring|empathetic|community)\b/)) {
    return 'Human-centered and empathetic';
  }

  return 'Professional and trustworthy';
}

function inferVisualStyle(text: string, industry: string): string {
  const lowerText = text.toLowerCase();

  // Check for explicit style keywords
  if (lowerText.match(/\b(minimal|minimalist|clean|simple)\b/)) {
    return 'Minimalist and clean';
  }
  if (lowerText.match(/\b(bold|vibrant|colorful|dynamic)\b/)) {
    return 'Bold and vibrant';
  }
  if (lowerText.match(/\b(classic|traditional|timeless|elegant)\b/)) {
    return 'Classic and elegant';
  }
  if (lowerText.match(/\b(modern|contemporary|sleek|cutting-edge)\b/)) {
    return 'Modern and sleek';
  }
  if (lowerText.match(/\b(playful|fun|creative|quirky)\b/)) {
    return 'Playful and creative';
  }

  // Infer from industry
  const industryStyles: Record<string, string> = {
    'Technology / SaaS': 'Modern and tech-forward',
    'Finance / FinTech': 'Professional and trustworthy',
    'Healthcare / Wellness': 'Clean and calming',
    'Education / EdTech': 'Friendly and accessible',
    'E-commerce / Retail': 'Vibrant and engaging',
    'Marketing / Agency': 'Creative and bold',
    'Real Estate': 'Elegant and sophisticated',
  };

  return industryStyles[industry] || 'Modern and professional';
}

function inferBrandColors(industry: string, visualStyle: string): string[] {
  // Industry-specific color palettes
  const industryColors: Record<string, string[]> = {
    'Technology / SaaS': ['#3b82f6', '#1e40af', '#0ea5e9'], // Blues
    'Finance / FinTech': ['#10b981', '#059669', '#064e3b'], // Greens
    'Healthcare / Wellness': ['#06b6d4', '#0891b2', '#14b8a6'], // Teals
    'Education / EdTech': ['#f59e0b', '#d97706', '#7c2d12'], // Oranges
    'E-commerce / Retail': ['#ec4899', '#db2777', '#be185d'], // Pinks
    'Marketing / Agency': ['#8b5cf6', '#7c3aed', '#6d28d9'], // Purples
    'Real Estate': ['#64748b', '#475569', '#334155'], // Grays/Blues
    'Consulting / Professional Services': ['#2563eb', '#1e40af', '#1e3a8a'], // Deep Blues
  };

  // Visual style color adjustments
  if (visualStyle.includes('Bold') || visualStyle.includes('Vibrant')) {
    return industryColors[industry] || ['#ef4444', '#dc2626', '#b91c1c']; // Bolder reds
  }
  if (visualStyle.includes('Minimalist') || visualStyle.includes('Clean')) {
    return ['#000000', '#ffffff', '#6b7280']; // Monochrome
  }
  if (visualStyle.includes('Elegant') || visualStyle.includes('Classic')) {
    return ['#1f2937', '#374151', '#9ca3af']; // Sophisticated grays
  }

  // Default to industry colors
  return industryColors[industry] || ['#3b82f6', '#1e40af', '#ffffff'];
}
