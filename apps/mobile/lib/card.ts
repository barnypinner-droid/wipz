import { supabase } from './supabase';

export async function createWipCard(
  whipId: string,
  billingAddress?: { line1: string; city: string; postal_code: string; country?: string },
) {
  const { data, error } = await supabase.functions.invoke('create-wip-card', {
    body: { whip_id: whipId, billing_address: billingAddress },
  });
  if (error) throw error;
  return data as { cardId: string; last4: string; expMonth: number; expYear: number };
}
