import { supabase } from './supabase';
import type { Tables } from './database.types';

export type WipMember = Tables<'wip_members'> & {
  users: Pick<Tables<'users'>, 'email' | 'full_name'> | null;
};

export async function listMembers(whipId: string): Promise<WipMember[]> {
  const { data, error } = await supabase
    .from('wip_members')
    .select('*, users(email, full_name)')
    .eq('whip_id', whipId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as WipMember[]) ?? [];
}

export async function addMemberByEmail(
  whipId: string,
  email: string,
  role: 'member' | 'treasurer' = 'member',
) {
  const { data: matches, error: lookupError } = await supabase.rpc('find_user_by_email', {
    p_email: email,
  });
  if (lookupError) throw lookupError;
  if (!matches || matches.length === 0) {
    throw new Error('No Wipz user found with that email. They need to sign up first.');
  }

  await addMemberByUserId(whipId, matches[0].id, role);
}

export async function removeMember(memberRowId: string) {
  const { error } = await supabase.from('wip_members').delete().eq('id', memberRowId);
  if (error) throw error;
}

export async function findUserByPhone(phone: string): Promise<{ id: string; full_name: string } | null> {
  const { data, error } = await supabase.rpc('find_user_by_phone', { p_phone: phone });
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

// Being added to the same wip together is treated as a moment of
// connection, this also accepts an instant friendship between the two of
// you (see the add_wip_member_and_friend RPC), unlike a plain insert.
export async function addMemberByUserId(
  whipId: string,
  userId: string,
  role: 'member' | 'treasurer' = 'member',
) {
  const { error } = await supabase.rpc('add_wip_member_and_friend', {
    p_whip_id: whipId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw error;
}
