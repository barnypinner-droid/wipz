import { supabase } from './supabase';

// For ad-hoc and savings-goal wips: a single yes/no per member, unlike
// recurring's per-occurrence RSVP (see lib/occurrences.ts).
export async function setWipRsvp(whipId: string, status: 'in' | 'out') {
  const { error } = await supabase.rpc('set_wip_rsvp', { p_whip_id: whipId, p_status: status });
  if (error) throw error;
}
