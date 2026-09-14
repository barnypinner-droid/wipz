import { supabase } from './supabase';

export type ContributionPlanProgress = {
  id: string;
  user_id: string;
  full_name: string | null;
  amount: number;
  total_installments: number;
  installments_paid: number;
  status: 'active' | 'completed' | 'cancelled' | 'failed';
  next_charge_date: string;
};

export async function createSetupIntent() {
  const { data, error } = await supabase.functions.invoke('create-setup-intent', { body: {} });
  if (error) throw error;
  return data as {
    customerId: string;
    ephemeralKeySecret: string;
    setupIntentClientSecret: string;
    setupIntentId: string;
  };
}

export async function createContributionPlan(args: {
  whipId: string;
  amount: number;
  totalInstallments: number;
  setupIntentId: string;
}) {
  const { data, error } = await supabase.functions.invoke('create-contribution-plan', {
    body: {
      whip_id: args.whipId,
      amount: args.amount,
      total_installments: args.totalInstallments,
      setup_intent_id: args.setupIntentId,
    },
  });
  if (error) throw error;
  return data;
}

export async function listContributionPlans(whipId: string): Promise<ContributionPlanProgress[]> {
  const { data, error } = await supabase.rpc('list_wip_contribution_plans', { p_whip_id: whipId });
  if (error) throw error;
  return (data as ContributionPlanProgress[]) ?? [];
}

export async function cancelContributionPlan(planId: string) {
  const { error } = await supabase.from('wip_contribution_plans').update({ status: 'cancelled' }).eq('id', planId);
  if (error) throw error;
}
