import { withSupabase } from 'npm:@supabase/server'
import Stripe from 'npm:stripe'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const { whip_id, billing_address } = await req.json()

    if (!whip_id) {
      return Response.json({ error: 'whip_id is required' }, { status: 400 })
    }

    const { data: isStaff } = await ctx.supabase.rpc('is_wip_staff', { p_whip_id: whip_id })
    if (!isStaff) {
      return Response.json({ error: 'Only an organiser or treasurer can provision a card' }, { status: 403 })
    }

    const { data: wip } = await ctx.supabase
      .from('whips')
      .select('id, title, stripe_card_id')
      .eq('id', whip_id)
      .single()

    if (!wip) {
      return Response.json({ error: 'Wip not found' }, { status: 404 })
    }
    if (wip.stripe_card_id) {
      return Response.json({ error: 'This wip already has a card' }, { status: 400 })
    }

    const {
      data: { user },
    } = await ctx.supabase.auth.getUser()

    const { data: profile } = await ctx.supabase
      .from('users')
      .select('full_name, email, stripe_cardholder_id')
      .eq('id', user!.id)
      .single()

    try {
      let cardholderId = profile?.stripe_cardholder_id ?? null

      if (!cardholderId) {
        if (!billing_address?.line1 || !billing_address?.city || !billing_address?.postal_code) {
          return Response.json(
            { error: 'A billing address (line1, city, postal_code) is required the first time you provision a card.' },
            { status: 400 },
          )
        }

        const cardholder = await stripe.issuing.cardholders.create({
          type: 'individual',
          name: profile?.full_name ?? user!.email ?? 'Wipz organiser',
          email: profile?.email ?? user!.email,
          billing: {
            address: {
              line1: billing_address.line1,
              city: billing_address.city,
              postal_code: billing_address.postal_code,
              country: billing_address.country ?? 'GB',
            },
          },
        })
        cardholderId = cardholder.id

        await ctx.supabaseAdmin
          .from('users')
          .update({ stripe_cardholder_id: cardholderId })
          .eq('id', user!.id)
      }

      const card = await stripe.issuing.cards.create({
        cardholder: cardholderId,
        currency: 'gbp',
        type: 'virtual',
        status: 'active',
        metadata: { whip_id },
      })

      await ctx.supabaseAdmin
        .from('whips')
        .update({
          stripe_card_id: card.id,
          stripe_card_last4: card.last4,
          stripe_card_exp_month: card.exp_month,
          stripe_card_exp_year: card.exp_year,
        })
        .eq('id', whip_id)

      return Response.json({
        cardId: card.id,
        last4: card.last4,
        expMonth: card.exp_month,
        expYear: card.exp_year,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return Response.json({ error: message }, { status: 500 })
    }
  }),
}
