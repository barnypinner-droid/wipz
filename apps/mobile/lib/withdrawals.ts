import { supabase } from './supabase';
import type { Tables } from './database.types';

export type WithdrawalRequest = Tables<'withdrawal_requests'>;
export type WithdrawalApproval = Tables<'withdrawal_approvals'>;

export async function listWithdrawalRequests(whipId: string): Promise<WithdrawalRequest[]> {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('whip_id', whipId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listApprovals(requestId: string): Promise<WithdrawalApproval[]> {
  const { data, error } = await supabase
    .from('withdrawal_approvals')
    .select('*')
    .eq('request_id', requestId);
  if (error) throw error;
  return data ?? [];
}

export async function requestWithdrawal(whipId: string, amountPence: number, description: string) {
  const { data, error } = await supabase.rpc('request_withdrawal', {
    p_whip_id: whipId,
    p_amount: amountPence,
    p_description: description,
  });
  if (error) throw error;
  return data;
}

export async function approveWithdrawalRequest(requestId: string) {
  const { error } = await supabase.rpc('approve_withdrawal_request', {
    p_request_id: requestId,
  });
  if (error) throw error;
}
