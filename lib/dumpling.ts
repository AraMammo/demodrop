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

    const title = titleMatch?.[1]?.replace(/<[^>]*>/g, '') || 'Business';
    const heroText = h1Match?.[1]?.replace(/<[^>]*>/g, '') || 'Professional services';
    const description = descMatch?.[1] || '';

    // Infer industry from content
    const industry = inferIndustry(title, heroText, description);

    // Infer target audience from content
    const targetAudience = inferTargetAudience(title, heroText, description);

    return {
      title,
      heroText,
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
      metaDescription: description,
      industry,
      targetAudience,
    };
  } catch (error) {
    const hostname = new URL(url).hostname.replace('www.', '');
    return {
      title: hostname,
      heroText: 'Professional business services',
      features: ['Quality service', 'Expert team', 'Proven results'],
      industry: 'Professional Services',
      targetAudience: 'Business professionals',
    };
  }
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
