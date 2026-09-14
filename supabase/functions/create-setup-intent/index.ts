import { withSupabase } from 'npm:@supabase/server'
import Stripe from 'npm:stripe'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

// First step of setting up a savings-goal instalment plan ("£100/month for
// 6 months"): save a payment method for future off-session charges. Needs a
// real Stripe Customer (unlike the one-off contribution flow, which never
// creates one) so the saved card/Bacs mandate can be reused each month by
// the charge-due-plans cron job.
export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const {
      data: { user },
    } = await ctx.supabase.auth.getUser()

    const { data: profile } = await ctx.supabase
      .from('users')
      .select('full_name, email, stripe_customer_id')
      .eq('id', user!.id)
      .single()

    try {
      let customerId = profile?.stripe_customer_id ?? null

      if (!customerId) {
        const customer = await stripe.customers.create({
          name: profile?.full_name ?? undefined,
          email: profile?.email ?? user!.email,
          metadata: { user_id: user!.id },
        })
        customerId = customer.id

        await ctx.supabaseAdmin.from('users').update({ stripe_customer_id: customerId }).eq('id', user!.id)
      }

      // Ephemeral keys require an explicit apiVersion; reuse whatever
      // version this Stripe SDK instance already defaults to, so it's at
      // least internally consistent with every other call in this file.
      const ephemeralKey = await stripe.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: stripe.getApiField('version') },
      )

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card', 'bacs_debit'],
        usage: 'off_session',
      })

      return Response.json({
        customerId,
        ephemeralKeySecret: ephemeralKey.secret,
        setupIntentClientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return Response.json({ error: message }, { status: 500 })
    }
  }),
}
