import { supabase } from './supabase';
import type { Tables } from './database.types';

export type WipInvite = Tables<'wip_invites'>;
export type PendingInvite = {
  id: string;
  whip_id: string;
  whip_title: string;
  phone: string;
  created_at: string;
};

export async function listWipInvites(whipId: string): Promise<WipInvite[]> {
  const { data, error } = await supabase
    .from('wip_invites')
    .select('*')
    .eq('whip_id', whipId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function sendWipInvite(whipId: string, phone: string) {
  const { data, error } = await supabase.functions.invoke('send-wip-invite', {
    body: { whip_id: whipId, phone },
  });
  if (error) throw error;
  return data;
}

export async function listMyPendingInvites(): Promise<PendingInvite[]> {
  const { data, error } = await supabase.rpc('list_my_pending_invites');
  if (error) throw error;
  return data ?? [];
}

export async function acceptWipInvite(inviteId: string) {
  const { error } = await supabase.rpc('accept_wip_invite', { p_invite_id: inviteId });
  if (error) throw error;
}
