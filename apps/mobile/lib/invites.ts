import { Linking, Platform } from 'react-native';
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

export type ContactMethod = 'sms' | 'whatsapp';

function buildSmsUrl(phones: string[], message: string) {
  const encodedMessage = encodeURIComponent(message);
  // iOS wants "&body=", Android wants "?body=", same sms: scheme, different separator.
  // Both accept a comma-separated recipient list, opening one shared thread
  // instead of one compose screen per person.
  const separator = Platform.OS === 'ios' ? '&' : '?';
  return `sms:${phones.join(',')}${separator}body=${encodedMessage}`;
}

function buildWhatsAppUrl(phone: string, message: string) {
  // wa.me wants digits only, no "+". There's no multi-recipient equivalent,
  // WhatsApp only ever opens a single chat from a deep link.
  const digits = phone.replace(/[^\d]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildInviteMessage(whipTitle: string) {
  return (
    `You've been invited to join "${whipTitle}" on Wipz. Download the app, set this as your ` +
    `phone number in your profile, and confirm your spot.`
  );
}

// invitedBy must be the caller's own auth.uid(): the "staff create wip
// invites" RLS policy requires invited_by = auth.uid() on the inserted row,
// so leaving it unset makes every insert fail RLS silently (it defaults to
// null, and null = auth.uid() is never true).
export async function recordWipInvite(whipId: string, phone: string, invitedBy: string, name?: string) {
  const { error } = await supabase
    .from('wip_invites')
    .upsert(
      { whip_id: whipId, phone, status: 'pending', invited_by: invitedBy, name: name ?? null },
      { onConflict: 'whip_id,phone' },
    );
  if (error) throw error;
}

// Records the invite, then hands off to the device's own Messages or
// WhatsApp app with the recipient and message pre-filled, free, no
// per-message cost either way. For more than one person at once, prefer
// recordWipInvite + sendBulkSmsInvite so everyone gets combined into a
// single compose screen instead of one app-switch per person.
export async function sendWipInvite(
  whipId: string,
  phone: string,
  whipTitle: string,
  invitedBy: string,
  method: ContactMethod = 'sms',
  name?: string,
) {
  await recordWipInvite(whipId, phone, invitedBy, name);
  const message = buildInviteMessage(whipTitle);
  await Linking.openURL(method === 'whatsapp' ? buildWhatsAppUrl(phone, message) : buildSmsUrl([phone], message));
}

// Opens one SMS compose screen addressed to every phone number at once.
// Note this creates a single shared group thread: everyone in it sees
// everyone else's number, and replies go to the whole thread.
export async function sendBulkSmsInvite(phones: string[], whipTitle: string) {
  if (phones.length === 0) return;
  await Linking.openURL(buildSmsUrl(phones, buildInviteMessage(whipTitle)));
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
