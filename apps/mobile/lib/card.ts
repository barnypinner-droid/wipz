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

// Stand-in for the real card while Stripe Issuing isn't enabled on the
// account yet, so testers can still try the "spend from the card" flow.
export async function createFakeWipCard(whipId: string) {
  const { data, error } = await supabase.functions.invoke('create-fake-wip-card', {
    body: { whip_id: whipId },
  });
  if (error) throw error;
  return data as { cardId: string; last4: string; expMonth: number; expYear: number };
}
