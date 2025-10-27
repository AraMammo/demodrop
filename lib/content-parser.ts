// lib/content-parser.ts
// Parses scraped markdown content into structured sections

export interface ParsedContent {
  hero: {
    heading: string;
    subheading: string;
    description: string;
  };
  features: Array<{
    title: string;
    description: string;
    details: string;
  }>;
  howItWorks: {
    steps: Array<{
      title: string;
      description: string;
    }>;
    workflow: string;
  };
  useCases: Array<{
    scenario: string;
    description: string;
  }>;
  benefits: string[];
  socialProof: {
    testimonials: string[];
    metrics: string[];
  };
  rawSections: {
    [key: string]: string;
  };
}

export function parseMarkdownContent(markdown: string, metadata?: Record<string, any>): ParsedContent {
  const lines = markdown.split('\n');

  console.log('[content-parser] Parsing markdown content, total chars:', markdown.length);

  return {
    hero: extractHeroSection(lines, metadata),
    features: extractFeatures(lines, markdown),
    howItWorks: extractHowItWorks(lines, markdown),
    useCases: extractUseCases(lines, markdown),
    benefits: extractBenefits(lines, markdown),
    socialProof: extractSocialProof(lines, markdown),
    rawSections: extractRawSections(markdown),
  };
}

function extractHeroSection(lines: string[], metadata?: Record<string, any>): ParsedContent['hero'] {
  let heading = '';
  let subheading = '';
  let description = metadata?.description || metadata?.['og:description'] || '';

  // Extract first H1
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i].trim();
    if (line.startsWith('# ') && !heading) {
      heading = line.replace(/^#\s+/, '').trim();
    }
    // Extract first H2 or substantial paragraph after heading
    else if (heading && !subheading) {
      if (line.startsWith('## ')) {
        subheading = line.replace(/^##\s+/, '').trim();
      } else if (line.length > 30 && !line.startsWith('#') && !line.startsWith('[')) {
        subheading = line;
      }
    }
  }

  // If no description from metadata, extract from first paragraphs
  if (!description) {
    const paragraphs = lines
      .filter(l => {
        const t = l.trim();
        return t.length > 50 &&
               !t.startsWith('#') &&
               !t.startsWith('[') &&
               !t.startsWith('-') &&
               !t.startsWith('*');
      })
      .slice(0, 3)
      .join(' ');
    description = paragraphs.substring(0, 300);
  }

  console.log('[content-parser] Hero extracted:', { heading, subheading: subheading?.substring(0, 50), descLength: description.length });

  return { heading, subheading, description };
}

function extractFeatures(lines: string[], fullMarkdown: string): ParsedContent['features'] {
  const features: ParsedContent['features'] = [];

  // Strategy 1: Look for sections with "features", "capabilities", "what you can do"
  const featureSectionRegex = /(features|capabilities|what (?:you can do|we offer)|key benefits)/i;
  const sections = splitIntoSections(fullMarkdown);

  for (const section of sections) {
    if (featureSectionRegex.test(section.title)) {
      // Extract features from this section
      const sectionLines = section.content.split('\n');
      let currentFeature: any = null;

      for (const line of sectionLines) {
        const trimmed = line.trim();

        // H3/H4 headings are likely feature titles
        if (trimmed.match(/^###\s+/)) {
          if (currentFeature) features.push(currentFeature);
          currentFeature = {
            title: trimmed.replace(/^###\s+/, '').trim(),
            description: '',
            details: ''
          };
        }
        // Bullet points or paragraphs under feature
        else if (currentFeature && trimmed.length > 20) {
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            currentFeature.details += trimmed.replace(/^[-*]\s+/, '') + '. ';
          } else if (!trimmed.startsWith('#')) {
            currentFeature.description += trimmed + ' ';
          }
        }
      }
      if (currentFeature) features.push(currentFeature);
    }
  }

  // Strategy 2: If no features found, extract from all H3 sections
  if (features.length === 0) {
    const h3Sections = fullMarkdown.split(/^###\s+/m).slice(1);
    for (let i = 0; i < Math.min(h3Sections.length, 5); i++) {
      const sectionLines = h3Sections[i].split('\n');
      const title = sectionLines[0].trim();
      const content = sectionLines.slice(1).join('\n').trim();

      if (title.length > 10 && title.length < 100) {
        features.push({
          title,
          description: content.substring(0, 200),
          details: content.substring(200, 500)
        });
      }
    }
  }

  console.log('[content-parser] Features extracted:', features.length);
  return features.slice(0, 5); // Top 5 features
}

function extractHowItWorks(lines: string[], fullMarkdown: string): ParsedContent['howItWorks'] {
  const steps: Array<{ title: string; description: string }> = [];
  let workflow = '';

  // Look for "how it works", "getting started", "process", etc.
  const howItWorksRegex = /(how (?:it works|to (?:get started|use))|(?:our )?process|workflow|steps)/i;
  const sections = splitIntoSections(fullMarkdown);

  for (const section of sections) {
    if (howItWorksRegex.test(section.title)) {
      workflow = section.content.substring(0, 500);

      // Extract numbered steps or bullet points
      const stepMatches = section.content.matchAll(/(?:^|\n)(?:\d+\.|[-*])\s+\*\*([^*]+)\*\*[:\s]*([^\n]+)/g);
      for (const match of stepMatches) {
        steps.push({
          title: match[1].trim(),
          description: match[2].trim()
        });
      }

      // If no numbered steps, look for H3/H4 subsections
      if (steps.length === 0) {
        const subSections = section.content.split(/^###\s+/m).slice(1);
        for (const sub of subSections.slice(0, 4)) {
          const subLines = sub.split('\n');
          steps.push({
            title: subLines[0].trim(),
            description: subLines.slice(1).join(' ').trim().substring(0, 150)
          });
        }
      }
    }
  }

  console.log('[content-parser] How it works steps:', steps.length);
  return { steps, workflow };
}

function extractUseCases(lines: string[], fullMarkdown: string): ParsedContent['useCases'] {
  const useCases: ParsedContent['useCases'] = [];

  const useCaseRegex = /(use cases?|examples|scenarios|who (?:is this|it's) for|perfect for)/i;
  const sections = splitIntoSections(fullMarkdown);

  for (const section of sections) {
    if (useCaseRegex.test(section.title)) {
      // Extract use cases from bullet points or subsections
      const bullets = section.content.matchAll(/(?:^|\n)[-*]\s+\*\*([^*]+)\*\*[:\s]*([^\n]+)/g);
      for (const match of bullets) {
        useCases.push({
          scenario: match[1].trim(),
          description: match[2].trim()
        });
      }
    }
  }

  console.log('[content-parser] Use cases extracted:', useCases.length);
  return useCases.slice(0, 5);
}

function extractBenefits(lines: string[], fullMarkdown: string): string[] {
  const benefits: string[] = [];

  const benefitRegex = /(benefits|why choose|advantages|what you (?:get|gain))/i;
  const sections = splitIntoSections(fullMarkdown);

  for (const section of sections) {
    if (benefitRegex.test(section.title)) {
      const bullets = section.content.matchAll(/(?:^|\n)[-*]\s+([^\n]+)/g);
      for (const match of bullets) {
        const benefit = match[1].trim();
        if (benefit.length > 15 && benefit.length < 200) {
          benefits.push(benefit);
        }
      }
    }
  }

  console.log('[content-parser] Benefits extracted:', benefits.length);
  return benefits.slice(0, 5);
}

function extractSocialProof(lines: string[], fullMarkdown: string): ParsedContent['socialProof'] {
  const testimonials: string[] = [];
  const metrics: string[] = [];

  // Look for testimonials, reviews, quotes
  const testimonialMatches = fullMarkdown.matchAll(/"([^"]{30,300})"/g);
  for (const match of testimonialMatches) {
    testimonials.push(match[1]);
  }

  // Look for metrics (numbers + context)
  const metricMatches = fullMarkdown.matchAll(/(\d+[+%k]?\s+[a-z\s]{3,30})/gi);
  for (const match of metricMatches) {
    const metric = match[1].trim();
    if (metric.length > 10) {
      metrics.push(metric);
    }
  }

  console.log('[content-parser] Social proof - testimonials:', testimonials.length, 'metrics:', metrics.length);
  return {
    testimonials: testimonials.slice(0, 3),
    metrics: metrics.slice(0, 5)
  };
}

function extractRawSections(markdown: string): { [key: string]: string } {
  const sections: { [key: string]: string } = {};
  const parsed = splitIntoSections(markdown);

  for (const section of parsed) {
    const key = section.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    sections[key] = section.content.substring(0, 1000);
  }

  return sections;
}

function splitIntoSections(markdown: string): Array<{ title: string; content: string }> {
  const sections: Array<{ title: string; content: string }> = [];
  const h2Splits = markdown.split(/^##\s+/m);

  for (let i = 1; i < h2Splits.length; i++) {
    const lines = h2Splits[i].split('\n');
    const title = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();
    sections.push({ title, content });
  }

  return sections;
}
