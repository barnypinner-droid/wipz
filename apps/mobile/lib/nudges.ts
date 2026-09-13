import { supabase } from './supabase';

export async function sendNudge(whipId: string, message: string, targetUserId?: string) {
  const { data, error } = await supabase.functions.invoke('send-nudge', {
    body: { whip_id: whipId, message, target_user_id: targetUserId ?? null },
  });
  if (error) throw error;
  return data;
}
