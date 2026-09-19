import { supabase } from './supabase';

export type InboxEntry = {
  target_type: 'group' | 'direct';
  target_id: string;
  title: string;
  conversation_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
};

export async function listMyInbox(): Promise<InboxEntry[]> {
  const { data, error } = await supabase.rpc('list_my_inbox');
  if (error) throw error;
  return (data as InboxEntry[]) ?? [];
}
