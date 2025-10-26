# Phase 1 Setup Guide - Authentication & Payment Integration

This guide covers the complete setup for authentication (Clerk), payment processing (Stripe), and database schema updates.

---

## 1. Database Setup

### Run the migration SQL

Go to **Vercel Dashboard → Your Project → Storage → Postgres → Query**

Copy and run the SQL from `database-migrations.sql`:

\`\`\`sql
-- Create users table for subscription and quota tracking
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'free',
  videos_used INTEGER DEFAULT 0,
  videos_limit INTEGER DEFAULT 1,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
\`\`\`

---

## 2. Clerk Authentication Setup

### Step 1: Create Clerk Account
1. Go to https://clerk.com
2. Sign up for free account
3. Create a new application

### Step 2: Get API Keys
1. In Clerk Dashboard, go to **API Keys**
2. Copy your keys:
   - **Publishable Key** (starts with `pk_`)
   - **Secret Key** (starts with `sk_`)

### Step 3: Add Environment Variables

**Vercel Dashboard → Settings → Environment Variables:**

\`\`\`env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
\`\`\`

### Step 4: Configure Clerk Settings (Optional but Recommended)

In Clerk Dashboard:
- **User & Authentication → Email, Phone, Username**
  - Enable Email
  - Require email verification
- **User & Authentication → Social Connections**
  - Enable Google OAuth (optional)
- **Paths → Configure**
  - Sign-in URL: `/sign-in`
  - Sign-up URL: `/sign-up`
  - After sign-in URL: `/`
  - After sign-up URL: `/`

---

## 3. Stripe Payment Setup

### Step 1: Create Stripe Account
1. Go to https://stripe.com
2. Create account and verify
3. **Toggle to Test Mode** (in dashboard header)

### Step 2: Get API Keys
1. In Stripe Dashboard, go to **Developers → API Keys**
2. Copy your **Test Mode** keys:
   - **Publishable Key** (starts with `pk_test_`)
   - **Secret Key** (starts with `sk_test_`)

### Step 3: Add Environment Variables

**Vercel Dashboard → Settings → Environment Variables:**

\`\`\`env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
\`\`\`

### Step 4: Create Webhook Endpoint

1. In Stripe Dashboard, go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-app.vercel.app/api/webhooks/stripe`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing Secret** (starts with `whsec_`)

### Step 5: Add Webhook Secret

**Vercel Dashboard → Settings → Environment Variables:**

\`\`\`env
STRIPE_WEBHOOK_SECRET=whsec_...
\`\`\`

---

## 4. Complete Environment Variables List

Here's the complete list of environment variables needed:

\`\`\`env
# OpenAI (from previous setup)
OPENAI_API_KEY=sk-proj-...

# App URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Stripe Payment
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Vercel Postgres & Blob (auto-configured by Vercel)
POSTGRES_URL=...
BLOB_READ_WRITE_TOKEN=...
\`\`\`

---

## 5. Testing the Flow

### Test Authentication
1. Deploy to Vercel
2. Open your app
3. Click "Sign In" in header
4. Create test account
5. Verify you see UserButton in header

### Test Free Tier
1. Sign in with test account
2. Scroll to "Generate Your Demo Video"
3. Enter website URL
4. Generate 1 video (should work)
5. Try generating 2nd video (should show quota error)

### Test Stripe Checkout
1. Click "Upgrade to Pro" on pricing page
2. Should redirect to Stripe Checkout
3. Use test card: `4242 4242 4242 4242`
4. Any future expiry date
5. Any CVC
6. Complete payment
7. You'll be redirected back to app

### Test Pro Tier
1. After upgrading, try generating videos
2. Should now have unlimited quota
3. Check database: user's `plan_type` should be 'pro'

### Test Webhook (Local Development)

For local testing, use Stripe CLI:

\`\`\`bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# This will give you a webhook secret starting with whsec_
# Add it to your .env.local
\`\`\`

---

## 6. Monitoring & Verification

### Check Database
\`\`\`sql
-- View all users
SELECT id, email, plan_type, videos_used, videos_limit FROM users;

-- View subscription status
SELECT id, email, plan_type, subscription_status, stripe_customer_id FROM users;
\`\`\`

### Check Stripe Dashboard
- **Payments**: See all test payments
- **Customers**: See all test customers
- **Subscriptions**: See active subscriptions

### Check Clerk Dashboard
- **Users**: See all registered users
- **Sessions**: See active sessions

---

## 7. Going to Production

### Clerk
1. In Clerk Dashboard, switch to **Production** instance
2. Get new production API keys
3. Update environment variables in Vercel (Production only)

### Stripe
1. Complete Stripe account verification
2. Switch dashboard from Test Mode to Live Mode
3. Get new Live Mode API keys
4. Create new webhook endpoint with production URL
5. Update environment variables in Vercel (Production only)

---

## 8. Troubleshooting

### "Unauthorized" errors
- Check Clerk keys are correct
- Verify middleware.ts is in root directory
- Check ClerkProvider wraps the app

### Quota not enforcing
- Verify users table exists
- Check user is created in database after sign-up
- Verify quota checking logic in generate-video route

### Stripe checkout not working
- Check Stripe keys are correct (test mode)
- Verify NEXT_PUBLIC_APP_URL is set
- Check browser console for errors

### Webhook not firing
- Verify webhook URL is correct
- Check webhook secret matches
- In Stripe Dashboard, check webhook attempts and logs
- Ensure `/api/webhooks/stripe` is public in middleware.ts

### Videos not incrementing usage
- Check `incrementUserVideoCount` is called after completion
- Verify database update is successful
- Check process-video route logs

---

## 9. Cost Estimates

### Clerk
- Free tier: 10,000 monthly active users
- Pro: $25/month for first 10k MAU

### Stripe
- 2.9% + $0.30 per transaction
- No monthly fees

### Total Phase 1 Costs
- Development: $0 (using test modes)
- Production: Transaction fees only (no fixed monthly cost)

---

## 10. Next Steps

After Phase 1 is complete and tested:

✅ Users can sign up/sign in
✅ Free users get 1 video
✅ Users can upgrade to Pro ($59/month)
✅ Pro users get unlimited videos
✅ Payment processing works
✅ Webhooks update subscriptions automatically

**You're ready for Phase 2:**
- User Dashboard (view video history)
- Watermark system (free tier videos)
- Email notifications (video ready alerts)
