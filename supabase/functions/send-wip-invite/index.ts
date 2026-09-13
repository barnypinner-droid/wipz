import { withSupabase } from 'npm:@supabase/server'

const WHATSAPP_API_VERSION = 'v20.0'

async function sendWhatsAppText(phone: string, message: string) {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

  if (!token || !phoneNumberId) {
    return { sent: false, reason: 'not_configured' as const }
  }

  const res = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      }),
    },
  )

  if (!res.ok) {
    const body = await res.text()
    console.error('WhatsApp send failed', res.status, body)
    return { sent: false, reason: 'api_error' as const }
  }

  return { sent: true as const }
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const { whip_id, phone } = await req.json()

    if (!whip_id || !phone) {
      return Response.json({ error: 'whip_id and phone are required' }, { status: 400 })
    }

    const { data: isStaff } = await ctx.supabase.rpc('is_wip_staff', { p_whip_id: whip_id })
    if (!isStaff) {
      return Response.json(
        { error: 'Only an organiser or treasurer can invite members' },
        { status: 403 },
      )
    }

    const { data: wip } = await ctx.supabase.from('whips').select('title').eq('id', whip_id).single()

    const {
      data: { user },
    } = await ctx.supabase.auth.getUser()

    const { data: invite, error: upsertError } = await ctx.supabase
      .from('wip_invites')
      .upsert(
        { whip_id, phone, invited_by: user!.id, status: 'pending' },
        { onConflict: 'whip_id,phone' },
      )
      .select()
      .single()

    if (upsertError) {
      return Response.json({ error: upsertError.message }, { status: 500 })
    }

    const message =
      `You've been invited to join "${wip?.title ?? 'a wip'}" on Wipz. ` +
      `Download the app, set this number as your WhatsApp number in your profile, and confirm your spot.`
    const whatsapp = await sendWhatsAppText(phone, message)

    return Response.json({ invite, whatsapp })
  }),
}
