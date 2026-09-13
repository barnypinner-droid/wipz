import { withSupabase } from 'npm:@supabase/server'

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send'

async function sendExpoPush(expoPushToken: string, title: string, body: string) {
  const res = await fetch(EXPO_PUSH_API, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
      },
    ]),
  })

  if (!res.ok) {
    console.error('Expo push send failed', res.status, await res.text())
    return { sent: false, reason: 'api_error' as const }
  }

  const json = await res.json()
  const ticket = json?.data?.[0]
  if (ticket?.status === 'error') {
    console.error('Expo push ticket error', ticket)
    return { sent: false, reason: ticket.details?.error ?? 'ticket_error' }
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

    const { data: wip } = await ctx.supabase.from('whips').select('title').eq('id', whip_id).single()
    const title = wip?.title ? `Wipz — ${wip.title}` : 'Wipz'

    // Recipients: the one target, or every other member for a group-wide nudge.
    // Uses the admin client since a member can't otherwise read others' push tokens.
    let recipientQuery = ctx.supabaseAdmin
      .from('users')
      .select('id, expo_push_token')
      .not('expo_push_token', 'is', null)

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
        const outcome = await sendExpoPush(recipient.expo_push_token!, title, message)
        return { user_id: recipient.id, ...outcome }
      }),
    )

    return Response.json({ nudge, push: results })
  }),
}
