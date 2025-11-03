import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateUserSubscription, createUser } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

// Lazy initialization
let stripe: Stripe | null = null;
function getStripe() {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripe = new Stripe(secretKey, {
      apiVersion: '2025-09-30.clover',
    });
  }
  return stripe;
}

// Track processed events for idempotency
const processedEvents = new Set<string>();

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('[stripe-webhook] No signature provided');
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
    }

    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error: any) {
    console.error('[stripe-webhook] Signature verification failed:', error.message);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Idempotency check - prevent duplicate processing
  if (processedEvents.has(event.id)) {
    console.log('[stripe-webhook] Event already processed:', event.id);
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    console.log('[stripe-webhook] Processing event:', event.type, 'ID:', event.id);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;

        console.log('[stripe-webhook] Checkout completed:', {
          userId,
          customer: session.customer,
          subscription: session.subscription,
          customerEmail: session.customer_email,
        });

        if (!userId) {
          console.error('[stripe-webhook] No userId in checkout session metadata');
          break;
        }

        if (!session.customer) {
          console.error('[stripe-webhook] No customer in checkout session');
          break;
        }

        // Ensure user exists in database before updating subscription
        const supabase = await createClient();
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);

        if (!authUser || !authUser.user) {
          console.error('[stripe-webhook] User not found in Supabase:', userId);
          break;
        }

        // Update user subscription in database
        await updateUserSubscription(userId, {
          planType: 'pro',
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string || undefined,
          subscriptionStatus: 'active',
        });

        console.log('[stripe-webhook] ✓ Subscription activated for user:', userId);

        // Mark event as processed
        processedEvents.add(event.id);

        // TODO: Send confirmation email to user
        // await sendEmail(authUser.user.email, 'subscription-activated', { ... })

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        console.log('[stripe-webhook] Subscription updated:', {
          userId,
          status: subscription.status,
          subscriptionId: subscription.id,
        });

        if (!userId) {
          console.error('[stripe-webhook] No userId in subscription metadata');
          break;
        }

        const status = subscription.status;
        await updateUserSubscription(userId, {
          subscriptionStatus: status,
          planType: status === 'active' || status === 'trialing' ? 'pro' : 'free',
        });

        console.log('[stripe-webhook] ✓ Subscription updated for user:', userId, 'Status:', status);
        processedEvents.add(event.id);

        // TODO: Send email notification about subscription change
        // await sendEmail(userEmail, 'subscription-updated', { status })

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        console.log('[stripe-webhook] Subscription deleted:', {
          userId,
          subscriptionId: subscription.id,
        });

        if (!userId) {
          console.error('[stripe-webhook] No userId in subscription metadata');
          break;
        }

        await updateUserSubscription(userId, {
          planType: 'free',
          subscriptionStatus: 'canceled',
        });

        console.log('[stripe-webhook] ✓ Subscription canceled for user:', userId);
        processedEvents.add(event.id);

        // TODO: Send cancellation confirmation email
        // await sendEmail(userEmail, 'subscription-canceled', {})

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        console.warn('[stripe-webhook] Payment failed for customer:', invoice.customer);
        processedEvents.add(event.id);

        // TODO: Send payment failure email to customer
        // const customer = await getStripe().customers.retrieve(invoice.customer as string)
        // await sendEmail(customer.email, 'payment-failed', { invoice })

        break;
      }

      default:
        console.log('[stripe-webhook] Unhandled event type:', event.type);
    }

    console.log('[stripe-webhook] ✓ Event processed successfully:', event.id);
    return NextResponse.json({ received: true, eventId: event.id });

  } catch (error: any) {
    console.error('[stripe-webhook] Handler error:', error);
    console.error('[stripe-webhook] Event ID:', event.id);
    console.error('[stripe-webhook] Event type:', event.type);
    console.error('[stripe-webhook] Error details:', error.message);

    // Don't mark as processed if there was an error
    // Stripe will retry the webhook

    return NextResponse.json(
      { error: 'Webhook handler failed', details: error.message },
      { status: 500 }
    );
  }
}
