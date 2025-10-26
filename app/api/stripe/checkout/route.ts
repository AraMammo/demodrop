import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { getUser, createUser } from '@/lib/db';

// Lazy initialization
let stripe: Stripe | null = null;
function getStripe() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-11-20.acacia',
    });
  }
  return stripe;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { planType } = body; // 'pro' or 'enterprise'

    if (!['pro', 'enterprise'].includes(planType)) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    // Get or create user in database
    let user = await getUser(userId);
    if (!user) {
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses[0]?.emailAddress || `${userId}@clerk.user`;
      user = await createUser({ id: userId, email });
    }

    // Get app URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000';

    if (planType === 'enterprise') {
      // For enterprise, redirect to contact page
      return NextResponse.json({
        url: 'mailto:sales@demodrop.com?subject=Enterprise Plan Inquiry',
      });
    }

    // Create Stripe checkout session for Pro plan
    const session = await getStripe().checkout.sessions.create({
      customer_email: user.email,
      client_reference_id: userId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'DemoDrop Pro',
              description: 'Unlimited videos, no watermark, priority processing',
            },
            unit_amount: 5900, // $59.00
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/?success=true`,
      cancel_url: `${baseUrl}/?canceled=true`,
      metadata: {
        userId,
        planType: 'pro',
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
