// lib/dumpling.ts

interface WebsiteData {
  title: string;
  heroText: string;
  features: string[];
  metaDescription?: string;
}

export async function scrapeWebsite(url: string): Promise<WebsiteData> {
  try {
    // Using Dumpling API (replace with your actual API endpoint/key)
    const response = await fetch('https://api.dumpling.ai/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DUMPLING_API_KEY}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Dumpling API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract relevant data from Dumpling response
    return {
      title: data.title || extractFromMetaTags(data, 'og:title') || 'Unknown Business',
      heroText: data.h1 || data.description || extractFromMetaTags(data, 'description') || '',
      features: extractFeatures(data),
      metaDescription: extractFromMetaTags(data, 'description'),
    };

  } catch (error) {
    console.error('Website scraping error:', error);
    
    // Fallback: Basic fetch and parse
    return await fallbackScrape(url);
  }
}

function extractFromMetaTags(data: any, name: string): string | undefined {
  const metaTags = data.metaTags || data.meta || [];
  const tag = metaTags.find((t: any) => 
    t.name === name || t.property === name || t.name === `og:${name}`
  );
  return tag?.content;
}

function extractFeatures(data: any): string[] {
  const features: string[] = [];
  
  // Extract from h2/h3 headers
  if (data.headers) {
    features.push(...data.headers.slice(0, 5));
  }
  
  // Extract from structured sections
  if (data.sections) {
    data.sections.forEach((section: any) => {
      if (section.title) features.push(section.title);
    });
  }
  
  // Extract from lists
  if (data.lists) {
    features.push(...data.lists.flat().slice(0, 3));
  }
  
  return features.slice(0, 3); // Limit to top 3 features
}

async function fallbackScrape(url: string): Promise<WebsiteData> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Basic HTML parsing
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i);
    
    return {
      title: titleMatch?.[1]?.replace(/<[^>]*>/g, '') || 'Business',
      heroText: h1Match?.[1]?.replace(/<[^>]*>/g, '') || 'Professional services',
      features: ['Feature 1', 'Feature 2', 'Feature 3'], // Generic fallback
      metaDescription: descMatch?.[1],
    };
  } catch (error) {
    // Ultimate fallback
    return {
      title: new URL(url).hostname.replace('www.', ''),
      heroText: 'Professional business services',
      features: ['Quality service', 'Expert team', 'Proven results'],
    };
  }
}
