import { supabase } from './supabase';
import type { Tables } from './database.types';

export type Transaction = Tables<'transactions'> & {
  users: Pick<Tables<'users'>, 'full_name' | 'email'> | null;
};

export async function listTransactions(whipId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, users!transactions_user_id_fkey(full_name, email)')
    .eq('whip_id', whipId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Transaction[]) ?? [];
}

export async function flagTransaction(transactionId: string, reason: string) {
  const { error } = await supabase.rpc('flag_transaction', {
    p_transaction_id: transactionId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function payPendingContribution(transactionId: string) {
  const { error } = await supabase.rpc('pay_pending_contribution', {
    p_transaction_id: transactionId,
  });
  if (error) throw error;
}
