#!/bin/bash

# DemoDrop Full Automated Setup Script
# This script sets up the complete DemoDrop project with frontend and backend

set -e  # Exit on any error

echo "🚀 DemoDrop Automated Setup Starting..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed. Please install Git first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"
echo ""

# Get user inputs
echo "📝 Configuration:"
echo ""
read -p "Enter your GitHub username: " GITHUB_USERNAME
read -p "Enter repository name (default: demodrop): " REPO_NAME
REPO_NAME=${REPO_NAME:-demodrop}
read -p "Enter your OpenAI API key: " OPENAI_API_KEY
read -p "Do you want to push to GitHub automatically? (y/n): " AUTO_PUSH

echo ""
echo "🏗️  Creating project structure..."

# Create project directory
mkdir -p $REPO_NAME
cd $REPO_NAME

# Initialize Next.js project structure
mkdir -p app/api/generate-video
mkdir -p app/api/process-video
mkdir -p app/api/projects/\[id\]
mkdir -p components
mkdir -p lib
mkdir -p public

echo -e "${GREEN}✅ Project structure created${NC}"
echo ""

# Create package.json
echo "📦 Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "demodrop",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "openai": "^4.67.0",
    "@vercel/postgres": "^0.5.0",
    "@vercel/blob": "^0.15.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/uuid": "^9.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.2.0"
  }
}
EOF

echo -e "${GREEN}✅ package.json created${NC}"

# Create tsconfig.json
echo "📝 Creating tsconfig.json..."
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

echo -e "${GREEN}✅ tsconfig.json created${NC}"

# Create next.config.js
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
EOF

# Create tailwind.config.ts
cat > tailwind.config.ts << 'EOF'
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config
EOF

# Create postcss.config.js
cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# Create vercel.json
echo "⚙️  Creating vercel.json..."
cat > vercel.json << 'EOF'
{
  "functions": {
    "app/api/process-video/route.ts": {
      "maxDuration": 300
    }
  }
}
EOF

echo -e "${GREEN}✅ vercel.json created${NC}"

# Create .env.local
echo "🔐 Creating .env.local..."
cat > .env.local << EOF
OPENAI_API_KEY=$OPENAI_API_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

# Create .env.example
cat > .env.example << 'EOF'
OPENAI_API_KEY=sk-proj-...
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=
BLOB_READ_WRITE_TOKEN=
DUMPLING_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

echo -e "${GREEN}✅ Environment files created${NC}"

# Create .gitignore
cat > .gitignore << 'EOF'
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
EOF

echo ""
echo "🔨 Creating backend files..."

# Create lib/db.ts
cat > lib/db.ts << 'EOF'
import { sql } from '@vercel/postgres';

export interface Project {
  id: string;
  userId?: string;
  websiteUrl: string;
  stylePreset: string;
  customInstructions?: string;
  status: 'scraping' | 'generating' | 'completed' | 'failed';
  progress?: number;
  prompt?: string;
  soraJobId?: string;
  videoUrl?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export async function createProject(project: Project) {
  const { rows } = await sql`
    INSERT INTO projects (
      id, user_id, website_url, style_preset, custom_instructions,
      status, progress, created_at
    ) VALUES (
      ${project.id},
      ${project.userId || null},
      ${project.websiteUrl},
      ${project.stylePreset},
      ${project.customInstructions || null},
      ${project.status},
      ${project.progress || 0},
      ${project.createdAt}
    )
    RETURNING *
  `;
  return rows[0];
}

export async function updateProject(
  projectId: string,
  updates: Partial<Project>
) {
  const setClauses = [];
  const values: any[] = [];
  let paramCount = 1;

  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramCount++}`);
    values.push(updates.status);
  }
  if (updates.progress !== undefined) {
    setClauses.push(`progress = $${paramCount++}`);
    values.push(updates.progress);
  }
  if (updates.prompt !== undefined) {
    setClauses.push(`prompt = $${paramCount++}`);
    values.push(updates.prompt);
  }
  if (updates.soraJobId !== undefined) {
    setClauses.push(`sora_job_id = $${paramCount++}`);
    values.push(updates.soraJobId);
  }
  if (updates.videoUrl !== undefined) {
    setClauses.push(`video_url = $${paramCount++}`);
    values.push(updates.videoUrl);
  }
  if (updates.error !== undefined) {
    setClauses.push(`error = $${paramCount++}`);
    values.push(updates.error);
  }
  if (updates.completedAt !== undefined) {
    setClauses.push(`completed_at = $${paramCount++}`);
    values.push(updates.completedAt);
  }

  values.push(projectId);

  const { rows } = await sql.query(
    `UPDATE projects SET ${setClauses.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );

  return rows[0];
}

export async function getProject(projectId: string) {
  const { rows } = await sql`
    SELECT * FROM projects WHERE id = ${projectId}
  `;
  return rows[0] || null;
}

export async function getUserProjects(userId: string, limit = 20) {
  const { rows } = await sql`
    SELECT * FROM projects 
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows;
}
EOF

echo -e "${GREEN}✅ lib/db.ts created${NC}"

# Create lib/storage.ts
cat > lib/storage.ts << 'EOF'
import { put } from '@vercel/blob';

export async function uploadVideoToStorage(
  videoBlob: Blob,
  projectId: string
): Promise<string> {
  try {
    const filename = `videos/${projectId}.mp4`;
    
    const blob = await put(filename, videoBlob, {
      access: 'public',
      contentType: 'video/mp4',
    });
    
    return blob.url;
    
  } catch (error) {
    console.error('Storage upload error:', error);
    throw new Error('Failed to upload video to storage');
  }
}
EOF

echo -e "${GREEN}✅ lib/storage.ts created${NC}"

# Create lib/sora-prompt-builder.ts
cat > lib/sora-prompt-builder.ts << 'EOF'
interface WebsiteData {
  title: string;
  heroText: string;
  features: string[];
  metaDescription?: string;
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
}): Promise<string> {
  
  const { websiteData, stylePreset, customInstructions } = params;
  const preset = STYLE_PRESETS[stylePreset] || STYLE_PRESETS['product-demo'];
  
  const industry = classifyIndustry(websiteData);
  const audience = inferAudience(websiteData);
  
  const businessName = websiteData.title || 'Your Business';
  const valueProp = websiteData.heroText || websiteData.metaDescription || 'Innovative solutions';
  const features = websiteData.features.slice(0, 3);
  
  const prompt = `Create a ${preset.duration}-second professional demo video for ${businessName}.

BUSINESS CONTEXT:
- Industry: ${industry}
- Primary offering: ${valueProp}
- Target audience: ${audience}

KEY FEATURES TO SHOWCASE:
${features.map(f => `- ${f}`).join('\n')}

VISUAL STYLE:
- Aesthetic: ${preset.visual_aesthetic}
- Color palette: ${preset.color_scheme}
- Pacing: ${preset.pacing_style}
- Tone: ${preset.tone}

SCENE STRUCTURE:
${preset.scene_structure}

${customInstructions ? `SPECIAL INSTRUCTIONS:\n${customInstructions}\n` : ''}
Technical requirements:
- Aspect ratio: 16:9
- Resolution: 1080p
- No text overlays (we'll add those in post)
- Smooth transitions between scenes
- Professional polish`;

  return prompt;
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
EOF

echo -e "${GREEN}✅ lib/sora-prompt-builder.ts created${NC}"

# Create lib/dumpling.ts
cat > lib/dumpling.ts << 'EOF'
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
EOF

echo -e "${GREEN}✅ lib/dumpling.ts created${NC}"

echo ""
echo "🔨 Creating API routes..."

# Create app/api/generate-video/route.ts
cat > app/api/generate-video/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createProject } from '@/lib/db';
import { STYLE_PRESETS } from '@/lib/sora-prompt-builder';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { websiteUrl, stylePreset, customInstructions, userId } = body;

    if (!websiteUrl) {
      return NextResponse.json(
        { error: 'Website URL is required' },
        { status: 400 }
      );
    }

    if (!STYLE_PRESETS[stylePreset]) {
      return NextResponse.json(
        { error: 'Invalid style preset' },
        { status: 400 }
      );
    }

    const projectId = uuidv4();
    await createProject({
      id: projectId,
      userId,
      websiteUrl,
      stylePreset,
      customInstructions,
      status: 'scraping',
      createdAt: Date.now(),
    });

    const processUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/process-video`;
    
    fetch(processUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        websiteUrl,
        stylePreset,
        customInstructions,
      }),
    }).catch(console.error);

    return NextResponse.json({
      projectId,
      status: 'queued',
      message: 'Video generation started',
    });

  } catch (error) {
    console.error('Generate video error:', error);
    return NextResponse.json(
      { error: 'Failed to start video generation' },
      { status: 500 }
    );
  }
}
EOF

echo -e "${GREEN}✅ app/api/generate-video/route.ts created${NC}"

# Create app/api/process-video/route.ts
cat > app/api/process-video/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildSoraPrompt } from '@/lib/sora-prompt-builder';
import { scrapeWebsite } from '@/lib/dumpling';
import { updateProject } from '@/lib/db';
import { uploadVideoToStorage } from '@/lib/storage';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { projectId, websiteUrl, stylePreset, customInstructions } = await req.json();

    await updateProject(projectId, { status: 'scraping' });

    let websiteData;
    try {
      websiteData = await scrapeWebsite(websiteUrl);
    } catch (error) {
      await updateProject(projectId, {
        status: 'failed',
        error: 'Failed to scrape website',
      });
      return NextResponse.json({ error: 'Scraping failed' }, { status: 500 });
    }

    const prompt = await buildSoraPrompt({
      websiteData,
      stylePreset,
      customInstructions,
    });

    await updateProject(projectId, {
      status: 'generating',
      prompt,
    });

    let soraJob;
    try {
      soraJob = await openai.videos.create({
        model: 'sora-2',
        prompt: prompt,
        seconds: '30',
        size: '1920x1080',
      });
    } catch (error) {
      await updateProject(projectId, {
        status: 'failed',
        error: 'Failed to start Sora generation',
      });
      return NextResponse.json({ error: 'Sora API failed' }, { status: 500 });
    }

    await updateProject(projectId, {
      soraJobId: soraJob.id,
    });

    const result = await pollSoraJob(projectId, soraJob.id);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Process video error:', error);
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}

async function pollSoraJob(projectId: string, soraJobId: string) {
  const maxAttempts = 60;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const soraJob = await openai.videos.retrieve(soraJobId);
      
      await updateProject(projectId, {
        progress: soraJob.progress || 0,
      });
      
      if (soraJob.status === 'completed') {
        const videoResponse = await openai.videos.downloadContent(soraJobId);
        const videoBlob = await videoResponse.blob();
        
        const videoUrl = await uploadVideoToStorage(videoBlob, projectId);
        
        await updateProject(projectId, {
          status: 'completed',
          videoUrl,
          completedAt: Date.now(),
        });
        
        return { status: 'completed', videoUrl };
      }
      
      if (soraJob.status === 'failed') {
        await updateProject(projectId, {
          status: 'failed',
          error: soraJob.error?.message || 'Sora generation failed',
        });
        return { status: 'failed', error: soraJob.error };
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.error('Poll error:', error);
    }
  }
  
  await updateProject(projectId, {
    status: 'failed',
    error: 'Generation timeout - please try again',
  });
  
  return { status: 'failed', error: 'Timeout' };
}
EOF

echo -e "${GREEN}✅ app/api/process-video/route.ts created${NC}"

# Create app/api/projects/[id]/route.ts
mkdir -p "app/api/projects/[id]"
cat > "app/api/projects/[id]/route.ts" << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    const project = await getProject(projectId);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(project);
    
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}
EOF

echo -e "${GREEN}✅ app/api/projects/[id]/route.ts created${NC}"

echo ""
echo "📄 Creating app layout and pages..."

# Create app/layout.tsx
cat > app/layout.tsx << 'EOF'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DemoDrop - AI-Powered Demo Videos',
  description: 'Turn your website into professional demo videos in minutes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
EOF

# Create app/globals.css
cat > app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 255, 255, 255;
  --background-end-rgb: 255, 255, 255;
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}
EOF

# Create app/page.tsx (placeholder - will be replaced with V0 code)
cat > app/page.tsx << 'EOF'
export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            DemoDrop Setup Complete
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your backend is ready. Now add your V0 frontend code to app/page.tsx
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-2xl mx-auto text-left">
            <h2 className="text-lg font-bold mb-4">Next Steps:</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Replace app/page.tsx with your V0 landing page code</li>
              <li>Add any V0 components to the components/ folder</li>
              <li>Run: npm install</li>
              <li>Run: npm run dev</li>
              <li>Visit: http://localhost:3000</li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  )
}
EOF

echo -e "${GREEN}✅ App files created${NC}"

echo ""
echo "📚 Creating documentation..."

# Create README.md
cat > README.md << 'EOF'
# DemoDrop

AI-powered demo video generation platform.

## Quick Start

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Set up environment variables:
\`\`\`bash
cp .env.example .env.local
# Add your OPENAI_API_KEY
\`\`\`

3. Run development server:
\`\`\`bash
npm run dev
\`\`\`

4. Open http://localhost:3000

## Deployment

### Vercel

1. Push to GitHub
2. Import to Vercel
3. Add Storage: Postgres + Blob
4. Add Environment Variables
5. Initialize database (SQL in DEPLOYMENT.md)
6. Deploy

See DEPLOYMENT.md for detailed instructions.

## Project Structure

- `app/api/` - API routes (serverless)
- `lib/` - Backend helpers
- `components/` - React components
- `app/page.tsx` - Landing page (add V0 code here)

## Environment Variables

- `OPENAI_API_KEY` - Required for Sora
- `NEXT_PUBLIC_APP_URL` - Your app URL
- Postgres/Blob vars auto-configured by Vercel

## Tech Stack

- Next.js 14 + TypeScript
- Tailwind CSS
- OpenAI Sora API
- Vercel Postgres + Blob
EOF

# Create DEPLOYMENT.md
cat > DEPLOYMENT.md << 'EOF'
# DemoDrop Deployment Guide

## Prerequisites

- Vercel account
- OpenAI API key with Sora access
- Vercel Pro ($20/month) for extended timeouts

## Deployment Steps

### 1. Push to GitHub

\`\`\`bash
git remote add origin https://github.com/YOUR_USERNAME/demodrop.git
git push -u origin main
\`\`\`

### 2. Import to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Click "Deploy"

### 3. Add Vercel Storage

**Postgres:**
1. Vercel Dashboard → Storage → Create Database → Postgres
2. Connect to your project

**Blob:**
1. Vercel Dashboard → Storage → Create → Blob Storage
2. Connect to your project

### 4. Add Environment Variables

Vercel Dashboard → Settings → Environment Variables:

\`\`\`
OPENAI_API_KEY = sk-proj-your-key
NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
\`\`\`

### 5. Initialize Database

Vercel Dashboard → Storage → Your Postgres → Query tab:

\`\`\`sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  website_url TEXT NOT NULL,
  style_preset TEXT NOT NULL,
  custom_instructions TEXT,
  status TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  prompt TEXT,
  sora_job_id TEXT,
  video_url TEXT,
  error TEXT,
  created_at BIGINT NOT NULL,
  completed_at BIGINT
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
\`\`\`

### 6. Redeploy

Vercel Dashboard → Deployments → Redeploy

## Troubleshooting

- **Timeout errors**: Verify Vercel Pro subscription
- **Database errors**: Check SQL initialization
- **Sora errors**: Verify API key and Sora access
- **Storage errors**: Confirm Blob storage connected

## Cost Estimates

- Vercel Pro: $20/month
- Sora: $3-6 per 30s video
- Postgres: ~$1-5/month
- Blob: ~$1-10/month

Total: ~$25-45/month base + video costs
EOF

echo -e "${GREEN}✅ Documentation created${NC}"

echo ""
echo "🔧 Initializing Git repository..."

git init
git add .
git commit -m "Initial DemoDrop setup with backend and frontend structure"

echo -e "${GREEN}✅ Git repository initialized${NC}"

# GitHub setup
if [ "$AUTO_PUSH" = "y" ] || [ "$AUTO_PUSH" = "Y" ]; then
    echo ""
    echo "🚀 Setting up GitHub repository..."
    
    # Check if gh CLI is installed
    if command -v gh &> /dev/null; then
        echo "Creating GitHub repository using gh CLI..."
        gh repo create $REPO_NAME --public --source=. --remote=origin --push
        echo -e "${GREEN}✅ Repository created and pushed to GitHub${NC}"
    else
        echo -e "${YELLOW}⚠️  GitHub CLI not found. Creating remote manually...${NC}"
        echo ""
        echo "Run these commands to push to GitHub:"
        echo "  git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
        echo "  git branch -M main"
        echo "  git push -u origin main"
    fi
fi

echo ""
echo "✅ ======================================"
echo "✅  DemoDrop Setup Complete!"
echo "✅ ======================================"
echo ""
echo "📁 Project created at: $(pwd)"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Add your V0 frontend code:"
echo "   - Replace app/page.tsx with V0 landing page"
echo "   - Add V0 components to components/ folder"
echo ""
echo "2. Install dependencies:"
echo "   cd $REPO_NAME"
echo "   npm install"
echo ""
echo "3. Run development server:"
echo "   npm run dev"
echo ""
echo "4. Deploy to Vercel:"
echo "   - Push to GitHub (if not already done)"
echo "   - Import to Vercel"
echo "   - Add Storage (Postgres + Blob)"
echo "   - Add environment variables"
echo "   - Initialize database (see DEPLOYMENT.md)"
echo ""
echo "📖 Full deployment guide: DEPLOYMENT.md"
echo ""
echo -e "${GREEN}🎉 Happy building!${NC}"
EOF

chmod +x /mnt/user-data/outputs/setup-demodrop.sh

echo -e "${GREEN}✅ Setup script created${NC}"
