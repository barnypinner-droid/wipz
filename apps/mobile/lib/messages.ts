import { supabase } from './supabase';
import type { Tables } from './database.types';

export type Message = Tables<'messages'>;

export async function getOrCreateDirectConversation(friendId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', { p_friend_id: friendId });
  if (error) throw error;
  return data as string;
}

export async function getOrCreateGroupConversation(whipId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_group_conversation', { p_whip_id: whipId });
  if (error) throw error;
  return data as string;
}

export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const { data, error } = await supabase.rpc('send_message', {
    p_conversation_id: conversationId,
    p_body: body,
  });
  if (error) throw error;
  return data as Message;
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Live-updates a thread while it's open. Returns an unsubscribe function.
export function subscribeToMessages(conversationId: string, onInsert: (message: Message) => void) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
