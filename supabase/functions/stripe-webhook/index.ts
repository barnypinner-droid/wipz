import { withSupabase } from 'npm:@supabase/server'
import Stripe from 'npm:stripe'

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
        Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      )
    } catch {
      return Response.json({ error: 'Invalid signature' }, { status: 401 })
    }

    if (event.type === 'issuing_authorization.request') {
      const auth = event.data.object as Stripe.Issuing.Authorization

      const { data: approved, error } = await ctx.supabaseAdmin.rpc(
        'process_whip_withdrawal',
        {
          p_whip_id: auth.metadata.whip_id,
          p_user_id: null,
          p_amount: auth.amount,
          p_description: `Spent at ${auth.merchant_data.name}`,
          p_stripe_auth_id: auth.id,
        },
      )

      if (error) {
        console.error('process_whip_withdrawal failed', error)
        return Response.json({ approve: false })
      }

      return Response.json({ approve: !!approved })
    }

    return Response.json({ received: true })
  }),
}
