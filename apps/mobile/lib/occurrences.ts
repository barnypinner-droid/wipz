import { supabase } from './supabase';
import type { Tables } from './database.types';

export type WipOccurrence = Tables<'wip_occurrences'>;
export type WipRsvp = Tables<'wip_rsvps'>;

export async function listOccurrences(whipId: string): Promise<WipOccurrence[]> {
  const { data, error } = await supabase
    .from('wip_occurrences')
    .select('*')
    .eq('whip_id', whipId)
    .order('occurs_on', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createOccurrence(whipId: string, occursOn: string) {
  const { error } = await supabase
    .from('wip_occurrences')
    .insert({ whip_id: whipId, occurs_on: occursOn });
  if (error) throw error;
}

export async function listRsvps(occurrenceId: string): Promise<WipRsvp[]> {
  const { data, error } = await supabase
    .from('wip_rsvps')
    .select('*')
    .eq('occurrence_id', occurrenceId);
  if (error) throw error;
  return data ?? [];
}

export async function setRsvp(occurrenceId: string, status: 'in' | 'out') {
  const { error } = await supabase.rpc('set_rsvp', {
    p_occurrence_id: occurrenceId,
    p_status: status,
  });
  if (error) throw error;
}

export async function listMyRsvpsForWhip(whipId: string, userId: string): Promise<WipRsvp[]> {
  const { data, error } = await supabase
    .from('wip_rsvps')
    .select('*, wip_occurrences!inner(whip_id)')
    .eq('user_id', userId)
    .eq('wip_occurrences.whip_id', whipId);
  if (error) throw error;
  return (data as WipRsvp[]) ?? [];
}
