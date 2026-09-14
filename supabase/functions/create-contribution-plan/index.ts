import { withSupabase } from 'npm:@supabase/server'
import Stripe from 'npm:stripe'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

// Second step of setting up an instalment plan: called once the client has
// confirmed the SetupIntent from create-setup-intent (payment method saved
// against the user's Stripe Customer). The client's PaymentSheet result
// doesn't hand back a payment method id directly, so this looks the
// confirmed SetupIntent up from Stripe itself rather than trusting a
// client-supplied value — also lets us confirm it really succeeded and
// really belongs to this user's own customer before recording a plan.
export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const { whip_id, amount, total_installments, setup_intent_id } = await req.json()

    if (!whip_id || !amount || amount <= 0 || !total_installments || total_installments <= 0) {
      return Response.json(
        { error: 'whip_id, a positive amount, and a positive total_installments are required' },
        { status: 400 },
      )
    }
    if (!setup_intent_id) {
      return Response.json({ error: 'setup_intent_id is required' }, { status: 400 })
    }

    const {
      data: { user },
    } = await ctx.supabase.auth.getUser()

    const { data: isMember } = await ctx.supabase.rpc('is_wip_member', { p_whip_id: whip_id })
    if (!isMember) {
      return Response.json({ error: 'Not a member of this wip' }, { status: 403 })
    }

    const { data: wip } = await ctx.supabase.from('whips').select('type').eq('id', whip_id).single()
    if (wip?.type !== 'savings_goal') {
      return Response.json({ error: 'Instalment plans are only available on savings-goal wips' }, { status: 400 })
    }

    const { data: profile } = await ctx.supabase.from('users').select('stripe_customer_id').eq('id', user!.id).single()

    const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id, { expand: ['payment_method'] })

    if (setupIntent.status !== 'succeeded') {
      return Response.json({ error: 'Payment method has not been confirmed yet' }, { status: 400 })
    }
    if (!profile?.stripe_customer_id || setupIntent.customer !== profile.stripe_customer_id) {
      return Response.json({ error: 'This setup intent does not belong to you' }, { status: 403 })
    }

    const paymentMethod = setupIntent.payment_method
    const paymentMethodId = typeof paymentMethod === 'string' ? paymentMethod : paymentMethod?.id
    const paymentMethodType = typeof paymentMethod === 'string' ? undefined : paymentMethod?.type

    if (!paymentMethodId || (paymentMethodType !== 'card' && paymentMethodType !== 'bacs_debit')) {
      return Response.json({ error: 'Unsupported payment method for an instalment plan' }, { status: 400 })
    }

    // Uses the admin client: wip_contribution_plans deliberately has no
    // client-facing INSERT policy (plans are only ever created here, after
    // the SetupIntent above has actually succeeded), same pattern as
    // transactions.
    const { data: plan, error } = await ctx.supabaseAdmin
      .from('wip_contribution_plans')
      .insert({
        whip_id,
        user_id: user!.id,
        amount,
        total_installments,
        next_charge_date: new Date().toISOString().slice(0, 10),
        stripe_payment_method_id: paymentMethodId,
        stripe_payment_method_type: paymentMethodType,
      })
      .select()
      .single()

    if (error || !plan) {
      return Response.json({ error: error?.message ?? 'Failed to create plan' }, { status: 500 })
    }

    return Response.json({ plan })
  }),
}
