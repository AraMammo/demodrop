interface WebsiteData {
  title: string;
  heroText: string;
  features: string[];
  metaDescription?: string;
  industry: string;
  targetAudience: string;
}

export async function scrapeWebsite(url: string): Promise<WebsiteData> {
  try {
    const response = await fetch(url);
    const html = await response.text();

    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i);

    const title = titleMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || 'Business';
    const heroText = h1Match?.[1]?.replace(/<[^>]*>/g, '').trim() || 'Professional services';
    const description = descMatch?.[1] || '';

    // Extract features from the page
    const features = extractFeatures(html, title, heroText, description);

    // Infer industry from content
    const industry = inferIndustry(title, heroText, description);

    // Infer target audience from content
    const targetAudience = inferTargetAudience(title, heroText, description);

    return {
      title,
      heroText,
      features,
      metaDescription: description,
      industry,
      targetAudience,
    };
  } catch (error) {
    const hostname = new URL(url).hostname.replace('www.', '');
    const formattedName = hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
    return {
      title: formattedName,
      heroText: 'Professional business services',
      features: ['Quality service', 'Expert team', 'Proven results'],
      industry: 'Professional Services',
      targetAudience: 'Business professionals',
    };
  }
}

function extractFeatures(html: string, title: string, heroText: string, description: string): string[] {
  const features: string[] = [];

  // Strategy 1: Extract from list items (most common pattern for features)
  const listItemMatches = html.matchAll(/<li[^>]*>(.*?)<\/li>/gi);
  for (const match of listItemMatches) {
    const text = match[1].replace(/<[^>]*>/g, '').trim();
    // Filter out navigation items, short items, and items with links only
    if (text && text.length > 10 && text.length < 100 && !text.match(/^(home|about|contact|blog|pricing|login|sign|menu)/i)) {
      features.push(text);
    }
  }

  // Strategy 2: Extract from h2/h3 headings (often used for feature titles)
  if (features.length < 3) {
    const headingMatches = html.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/gi);
    for (const match of headingMatches) {
      const text = match[1].replace(/<[^>]*>/g, '').trim();
      if (text && text.length > 10 && text.length < 80 && !text.match(/^(about|contact|blog|pricing|testimonial|faq)/i)) {
        features.push(text);
      }
    }
  }

  // Strategy 3: Extract from paragraphs with strong/bold text (feature descriptions)
  if (features.length < 3) {
    const strongMatches = html.matchAll(/<(strong|b)>(.*?)<\/(strong|b)>/gi);
    for (const match of strongMatches) {
      const text = match[2].replace(/<[^>]*>/g, '').trim();
      if (text && text.length > 10 && text.length < 80) {
        features.push(text);
      }
    }
  }

  // Remove duplicates and limit to 5 most relevant features
  const uniqueFeatures = Array.from(new Set(features))
    .filter(f => f.length > 15 && f.length < 100) // Focus on substantial features
    .slice(0, 5);

  // Fallback if we couldn't extract good features
  if (uniqueFeatures.length === 0) {
    // Create intelligent fallbacks based on title and description
    return [
      heroText,
      description || 'Comprehensive solutions',
      `${title.split(' ')[0]} expertise and innovation`
    ].filter(f => f && f.length > 10).slice(0, 3);
  }

  return uniqueFeatures.slice(0, 3); // Return top 3 features
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
