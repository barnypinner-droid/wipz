import { supabase } from './supabase';

export type Friend = {
  friendship_id: string;
  user_id: string;
  full_name: string;
  email: string;
  status: 'pending' | 'accepted';
  i_am_requester: boolean;
};

export async function listMyFriends(): Promise<Friend[]> {
  const { data, error } = await supabase.rpc('list_my_friends');
  if (error) throw error;
  return (data as Friend[]) ?? [];
}

export async function sendFriendRequest(userId: string) {
  const { error } = await supabase.rpc('send_friend_request', { p_user_id: userId });
  if (error) throw error;
}

export async function respondFriendRequest(friendshipId: string, accept: boolean) {
  const { error } = await supabase.rpc('respond_friend_request', {
    p_friendship_id: friendshipId,
    p_accept: accept,
  });
  if (error) throw error;
}

export async function removeFriend(userId: string) {
  const { error } = await supabase.rpc('remove_friend', { p_user_id: userId });
  if (error) throw error;
}
