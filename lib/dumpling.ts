interface WebsiteData {
  title: string;
  heroText: string;
  features: string[];
  metaDescription?: string;
}

export async function scrapeWebsite(url: string): Promise<WebsiteData> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i);
    
    return {
      title: titleMatch?.[1]?.replace(/<[^>]*>/g, '') || 'Business',
      heroText: h1Match?.[1]?.replace(/<[^>]*>/g, '') || 'Professional services',
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
      metaDescription: descMatch?.[1],
    };
  } catch (error) {
    return {
      title: new URL(url).hostname.replace('www.', ''),
      heroText: 'Professional business services',
      features: ['Quality service', 'Expert team', 'Proven results'],
    };
  }
}
