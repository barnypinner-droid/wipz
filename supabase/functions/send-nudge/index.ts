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
    const { whip_id, target_user_id, message } = await req.json()

    if (!whip_id || !message) {
      return Response.json({ error: 'whip_id and message are required' }, { status: 400 })
    }

    const { data: isMember } = await ctx.supabase.rpc('is_wip_member', { p_whip_id: whip_id })
    if (!isMember) {
      return Response.json({ error: 'Not a member of this wip' }, { status: 403 })
    }

    const {
      data: { user },
    } = await ctx.supabase.auth.getUser()

    const { data: nudge, error: insertError } = await ctx.supabase
      .from('wip_nudges')
      .insert({ whip_id, target_user_id: target_user_id ?? null, message, created_by: user!.id })
      .select()
      .single()

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 })
    }

    // Recipients: the one target, or every other member for a group-wide nudge.
    // Uses the admin client since a member can't otherwise read others' phone numbers.
    let recipientQuery = ctx.supabaseAdmin
      .from('users')
      .select('id, whatsapp_phone')
      .not('whatsapp_phone', 'is', null)

    if (target_user_id) {
      recipientQuery = recipientQuery.eq('id', target_user_id)
    } else {
      const { data: members } = await ctx.supabaseAdmin
        .from('wip_members')
        .select('user_id')
        .eq('whip_id', whip_id)
      const memberIds = (members ?? []).map((m) => m.user_id)
      recipientQuery = recipientQuery.in('id', memberIds)
    }

    const { data: recipients } = await recipientQuery
    const results = await Promise.all(
      (recipients ?? []).map(async (recipient) => {
        const outcome = await sendWhatsAppText(recipient.whatsapp_phone!, message)
        return { user_id: recipient.id, ...outcome }
      }),
    )

    return Response.json({ nudge, whatsapp: results })
  }),
}
