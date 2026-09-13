import { withSupabase } from 'npm:@supabase/server'
import Stripe from 'npm:stripe'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const { whip_id, amount, transaction_id } = await req.json()

    const {
      data: { user },
    } = await ctx.supabase.auth.getUser()

    let resolvedTransactionId: string
    let resolvedWhipId: string
    let resolvedAmount: number

    if (transaction_id) {
      // Reusing an existing pending contribution (e.g. from an RSVP'd
      // recurring wip occurrence) — confirm it's really this user's.
      const { data: transaction, error } = await ctx.supabase
        .from('transactions')
        .select('id, whip_id, amount, status, type, user_id')
        .eq('id', transaction_id)
        .single()

      if (error || !transaction || transaction.user_id !== user!.id) {
        return Response.json({ error: 'Transaction not found' }, { status: 404 })
      }
      if (transaction.status !== 'pending' || transaction.type !== 'contribution') {
        return Response.json({ error: 'Transaction is not a pending contribution' }, { status: 400 })
      }

      resolvedTransactionId = transaction.id
      resolvedWhipId = transaction.whip_id
      resolvedAmount = transaction.amount
    } else {
      // A fresh, ad-hoc contribution — must be a member, must be a sane amount.
      if (!whip_id || !amount || amount <= 0) {
        return Response.json({ error: 'whip_id and a positive amount are required' }, { status: 400 })
      }

      const { data: isMember } = await ctx.supabase.rpc('is_wip_member', { p_whip_id: whip_id })
      if (!isMember) {
        return Response.json({ error: 'Not a member of this wip' }, { status: 403 })
      }

      const { data: wip } = await ctx.supabase.from('whips').select('title').eq('id', whip_id).single()

      // Uses the admin client: transactions deliberately has no client-facing
      // INSERT policy (all writes normally go through SECURITY DEFINER RPCs)
      // — membership was already verified above, so this is the edge
      // function's own equivalent of that pattern.
      const { data: newTransaction, error: insertError } = await ctx.supabaseAdmin
        .from('transactions')
        .insert({
          whip_id,
          user_id: user!.id,
          amount,
          type: 'contribution',
          status: 'pending',
          description: `Contribution to ${wip?.title ?? 'wip'}`,
        })
        .select()
        .single()

      if (insertError || !newTransaction) {
        return Response.json({ error: insertError?.message ?? 'Failed to create transaction' }, { status: 500 })
      }

      resolvedTransactionId = newTransaction.id
      resolvedWhipId = whip_id
      resolvedAmount = amount
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: resolvedAmount,
      currency: 'gbp',
      automatic_payment_methods: { enabled: true },
      metadata: {
        whip_id: resolvedWhipId,
        user_id: user!.id,
        transaction_id: resolvedTransactionId,
      },
    })

    // Uses the admin client since a plain user can't update stripe_ fields
    // via RLS (there's deliberately no client-facing UPDATE policy on
    // transactions) — this is the one legitimate exception, immediately
    // after the row was created on the user's own behalf.
    await ctx.supabaseAdmin
      .from('transactions')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', resolvedTransactionId)

    return Response.json({
      clientSecret: paymentIntent.client_secret,
      transactionId: resolvedTransactionId,
    })
  }),
}
