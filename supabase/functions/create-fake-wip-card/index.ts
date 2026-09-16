import { withSupabase } from 'npm:@supabase/server'

// Stand-in for create-wip-card while Stripe Issuing isn't enabled on the
// account yet: makes up a card number instead of calling Stripe, so testers
// can try the "spend from the card" flow without a real Issuing account.
export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const { whip_id } = await req.json()

    if (!whip_id) {
      return Response.json({ error: 'whip_id is required' }, { status: 400 })
    }

    const { data: isStaff } = await ctx.supabase.rpc('is_wip_staff', { p_whip_id: whip_id })
    if (!isStaff) {
      return Response.json({ error: 'Only an organiser or treasurer can provision a card' }, { status: 403 })
    }

    const { data: wip } = await ctx.supabase
      .from('whips')
      .select('id, stripe_card_id')
      .eq('id', whip_id)
      .single()

    if (!wip) {
      return Response.json({ error: 'Wip not found' }, { status: 404 })
    }
    if (wip.stripe_card_id) {
      return Response.json({ error: 'This wip already has a card' }, { status: 400 })
    }

    const last4 = String(Math.floor(1000 + Math.random() * 9000))
    const expiry = new Date()
    expiry.setFullYear(expiry.getFullYear() + 3)

    await ctx.supabaseAdmin
      .from('whips')
      .update({
        stripe_card_id: `fake_${crypto.randomUUID()}`,
        stripe_card_last4: last4,
        stripe_card_exp_month: expiry.getMonth() + 1,
        stripe_card_exp_year: expiry.getFullYear(),
        card_is_fake: true,
      })
      .eq('id', whip_id)

    return Response.json({
      cardId: `fake_${last4}`,
      last4,
      expMonth: expiry.getMonth() + 1,
      expYear: expiry.getFullYear(),
    })
  }),
}
