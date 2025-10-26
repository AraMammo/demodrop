# DemoDrop Deployment Guide

## Prerequisites

- Vercel account
- OpenAI API key with Sora access
- Vercel Pro ($20/month) for extended timeouts

## Deployment Steps

### 1. Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/demodrop.git
git push -u origin main
```

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

```
OPENAI_API_KEY = sk-proj-your-key
NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
```

### 5. Initialize Database

Vercel Dashboard → Storage → Your Postgres → Query tab:

```sql
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
```

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
