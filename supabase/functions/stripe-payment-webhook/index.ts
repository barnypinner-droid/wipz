import { withSupabase } from 'npm:@supabase/server'
import Stripe from 'npm:stripe'

// Deliberately separate from stripe-webhook: Issuing's real-time
// authorization webhook is a synchronous mechanism with its own signing
// secret, while ordinary payment events (payment_intent.succeeded) come
// through a regular async webhook endpoint with a different secret.
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')!

    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        sig,
        Deno.env.get('STRIPE_PAYMENT_WEBHOOK_SECRET')!,
      )
    } catch {
      return Response.json({ error: 'Invalid signature' }, { status: 401 })
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const transactionId = paymentIntent.metadata.transaction_id

      if (transactionId) {
        const { error } = await ctx.supabaseAdmin.rpc('confirm_contribution_payment', {
          p_transaction_id: transactionId,
        })
        if (error) {
          console.error('confirm_contribution_payment failed', error)
        }
      }
    }

    return Response.json({ received: true })
  }),
}
