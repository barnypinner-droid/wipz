// The three wip types from the business plan (Section 3, Table 1).
export const WIP_TYPES = [
  { value: 'recurring', label: 'Recurring', hint: 'RSVP-gated weekly subs' },
  { value: 'ad_hoc', label: 'Ad-hoc', hint: 'Propose an amount, watch it fill' },
  { value: 'savings_goal', label: 'Savings goal', hint: 'Target + deadline, locked until booked' },
] as const;

export type WipType = (typeof WIP_TYPES)[number]['value'];
