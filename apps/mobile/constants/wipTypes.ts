// The three wip types from the business plan (Section 3, Table 1).
export const WIP_TYPES = [
  {
    value: 'recurring',
    label: 'Recurring',
    hint: 'For a regular weekly cost, like five-a-side subs. Only charges people on weeks they RSVP in.',
    titlePlaceholder: 'Title (e.g. Five-a-side subs)',
    purposePlaceholder: 'Purpose (e.g. Weekly pitch hire)',
  },
  {
    value: 'ad_hoc',
    label: 'Ad-hoc',
    hint: 'For a one-off group cost, like a night out. Propose an amount and watch the pot fill.',
    titlePlaceholder: 'Title (e.g. Saturday night out)',
    purposePlaceholder: 'Purpose (e.g. Drinks, taxi, entry)',
  },
  {
    value: 'savings_goal',
    label: 'Savings goal',
    hint: 'For saving toward something together, like a group holiday. Locked until you book.',
    titlePlaceholder: 'Title (e.g. Group holiday)',
    purposePlaceholder: 'Purpose (e.g. Flights and villa)',
  },
] as const;

export type WipType = (typeof WIP_TYPES)[number]['value'];
