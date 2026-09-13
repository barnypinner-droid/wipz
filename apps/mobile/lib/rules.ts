import { supabase } from './supabase';
import type { Tables } from './database.types';

export type WipRule = Tables<'wip_rules'>;

export async function listRules(whipId: string): Promise<WipRule[]> {
  const { data, error } = await supabase
    .from('wip_rules')
    .select('*')
    .eq('whip_id', whipId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addRule(whipId: string, ruleText: string) {
  const { error } = await supabase
    .from('wip_rules')
    .insert({ whip_id: whipId, rule_text: ruleText });
  if (error) throw error;
}

export async function deleteRule(ruleId: string) {
  const { error } = await supabase.from('wip_rules').delete().eq('id', ruleId);
  if (error) throw error;
}
