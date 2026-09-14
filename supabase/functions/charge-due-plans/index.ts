import { withSupabase } from 'npm:@supabase/server'
import Stripe from 'npm:stripe'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

// Triggered daily by pg_cron (via pg_net, authenticated with the
// service_role key — see the wire-up migration). Finds every active
// instalment plan due today or earlier and charges its saved payment
// method off-session. Reuses the exact same transaction/metadata contract
// as the manual contribution flow (create-payment-intent), so the existing
// stripe-payment-webhook confirms or fails each charge the same way it
// already does for card/Apple Pay/Google Pay payments — the only new thing
// here is *how* the PaymentIntent gets created (unattended, off-session,
// against a saved payment method) rather than *what happens once it
// resolves*.
export default {
  fetch: withSupabase({ auth: 'secret' }, async (_req, ctx) => {
    const today = new Date().toISOString().slice(0, 10)

    const { data: duePlans, error } = await ctx.supabaseAdmin
      .from('wip_contribution_plans')
      .select('id, whip_id, user_id, amount, stripe_payment_method_id, stripe_payment_method_type')
      .eq('status', 'active')
      .lte('next_charge_date', today)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    const results: Array<{ planId: string; outcome: string }> = []

    for (const plan of duePlans ?? []) {
      try {
        const [{ data: profile }, { data: wip }] = await Promise.all([
          ctx.supabaseAdmin.from('users').select('stripe_customer_id').eq('id', plan.user_id).single(),
          ctx.supabaseAdmin.from('whips').select('title').eq('id', plan.whip_id).single(),
        ])

        if (!profile?.stripe_customer_id) {
          results.push({ planId: plan.id, outcome: 'skipped: no stripe customer on file' })
          continue
        }

        const { data: transaction, error: txError } = await ctx.supabaseAdmin
          .from('transactions')
          .insert({
            whip_id: plan.whip_id,
            user_id: plan.user_id,
            amount: plan.amount,
            type: 'contribution',
            status: 'pending',
            description: `Instalment toward ${wip?.title ?? 'wip'}`,
            plan_id: plan.id,
          })
          .select()
          .single()

        if (txError || !transaction) {
          results.push({ planId: plan.id, outcome: `skipped: failed to create transaction (${txError?.message})` })
          continue
        }

        try {
          const paymentIntent = await stripe.paymentIntents.create({
            amount: plan.amount,
            currency: 'gbp',
            customer: profile.stripe_customer_id,
            payment_method: plan.stripe_payment_method_id,
            payment_method_types: [plan.stripe_payment_method_type],
            off_session: true,
            confirm: true,
            metadata: {
              whip_id: plan.whip_id,
              user_id: plan.user_id,
              transaction_id: transaction.id,
              plan_id: plan.id,
            },
          })

          await ctx.supabaseAdmin
            .from('transactions')
            .update({ stripe_payment_intent_id: paymentIntent.id })
            .eq('id', transaction.id)

          // Bacs Direct Debit takes several business days to clear, so this
          // is very often still "processing" at this point — that's
          // expected, not an error. Final success/failure always arrives
          // via stripe-payment-webhook, whatever the timing.
          results.push({ planId: plan.id, outcome: `payment intent ${paymentIntent.status}` })
        } catch (stripeErr) {
          // The card was declined, needs re-authentication the customer
          // isn't present to complete, or similar — Stripe rejected the
          // charge synchronously, so no webhook event is coming for it.
          await ctx.supabaseAdmin.rpc('fail_contribution_payment', { p_transaction_id: transaction.id })
          const message = stripeErr instanceof Error ? stripeErr.message : String(stripeErr)
          results.push({ planId: plan.id, outcome: `failed: ${message}` })
        }
      } catch (planErr) {
        const message = planErr instanceof Error ? planErr.message : String(planErr)
        results.push({ planId: plan.id, outcome: `error: ${message}` })
      }
    }

    return Response.json({ processed: results.length, results })
  }),
}
