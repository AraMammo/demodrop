# DemoDrop

AI-powered demo video generation platform.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
# Add your OPENAI_API_KEY
```

3. Run development server:
```bash
npm run dev
```

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
