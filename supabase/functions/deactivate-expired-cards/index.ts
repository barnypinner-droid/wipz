import { withSupabase } from 'npm:@supabase/server'
import Stripe from 'npm:stripe'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

// Triggered every 10 minutes by pg_cron (same wire-up pattern as
// charge-due-plans). Finds every wip whose payment window has closed and
// whose card is still marked active, deactivates the real Stripe Issuing
// card (skipped for fake test cards, there's nothing to call), then flips
// card_active off so the app stops offering it for spending.
export default {
  fetch: withSupabase({ auth: 'secret' }, async (_req, ctx) => {
    const now = new Date().toISOString()

    const { data: expired, error } = await ctx.supabaseAdmin
      .from('whips')
      .select('id, stripe_card_id')
      .eq('card_active', true)
      .not('active_until', 'is', null)
      .lt('active_until', now)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    const results: Array<{ whipId: string; outcome: string }> = []

    for (const wip of expired ?? []) {
      try {
        if (wip.stripe_card_id && !wip.stripe_card_id.startsWith('fake_')) {
          await stripe.issuing.cards.update(wip.stripe_card_id, { status: 'inactive' })
        }
        await ctx.supabaseAdmin.from('whips').update({ card_active: false }).eq('id', wip.id)
        results.push({ whipId: wip.id, outcome: 'deactivated' })
      } catch (err) {
        results.push({ whipId: wip.id, outcome: `failed: ${err instanceof Error ? err.message : String(err)}` })
      }
    }

    return Response.json({ processed: results.length, results })
  }),
}
