import { supabase } from './supabase';

type CreatePaymentIntentArgs =
  | { transactionId: string; whipId?: never; amount?: never }
  | { whipId: string; amount: number; transactionId?: never };

export async function createPaymentIntent(args: CreatePaymentIntentArgs) {
  const body =
    'transactionId' in args && args.transactionId
      ? { transaction_id: args.transactionId }
      : { whip_id: args.whipId, amount: args.amount };

  const { data, error } = await supabase.functions.invoke('create-payment-intent', { body });
  if (error) throw error;
  return data as { clientSecret: string; transactionId: string };
}
