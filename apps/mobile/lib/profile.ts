import { supabase } from './supabase';

export async function ensureUserProfile(userId: string, email: string, fullName?: string) {
  const { error } = await supabase
    .from('users')
    .upsert(
      { id: userId, email, full_name: fullName?.trim() || email },
      { onConflict: 'id', ignoreDuplicates: true },
    );

  if (error) throw error;
}
