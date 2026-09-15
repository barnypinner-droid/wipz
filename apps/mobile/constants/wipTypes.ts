// The three wip types from the business plan (Section 3, Table 1). Images
// match the ones used for the same three types on wipzapp.com, so the app
// and the website tell a consistent visual story.
export const WIP_TYPES = [
  {
    value: 'recurring',
    label: 'Recurring',
    hint: 'For a regular weekly cost, like five-a-side subs. Only charges people on weeks they RSVP in.',
    titlePlaceholder: 'Title (e.g. Five-a-side subs)',
    purposePlaceholder: 'Purpose (e.g. Weekly pitch hire)',
    image: 'https://images.unsplash.com/photo-1632300951015-42d7df909581?w=800&q=65&fm=jpg&fit=crop&auto=format',
    features: [
      "RSVP-gated, only pay when you're in",
      'Automatic weekly reminders',
      'Pay by card, Apple Pay, Google Pay, PayPal or bank transfer',
      "Spend from the group's virtual card",
    ],
  },
  {
    value: 'ad_hoc',
    label: 'Ad-hoc',
    hint: 'For a one-off group cost, like a night out. Propose an amount and watch the pot fill.',
    titlePlaceholder: 'Title (e.g. Saturday night out)',
    purposePlaceholder: 'Purpose (e.g. Drinks, taxi, entry)',
    image: 'https://images.unsplash.com/photo-1621112904887-419379ce6824?w=800&q=65&fm=jpg&fit=crop&auto=format',
    features: [
      'Anyone proposes an amount',
      'Watch the pot fill live',
      'Pay by card, Apple Pay, Google Pay, PayPal or bank transfer',
      "Spend from the group's virtual card",
    ],
  },
  {
    value: 'savings_goal',
    label: 'Savings goal',
    hint: 'For saving toward something together, like a group holiday. Locked until you book.',
    titlePlaceholder: 'Title (e.g. Group holiday)',
    purposePlaceholder: 'Purpose (e.g. Flights and villa)',
    image: 'https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?w=800&q=65&fm=jpg&fit=crop&auto=format',
    features: [
      'Set a target amount and deadline',
      'Funds locked until the group agrees',
      'Pay by card, Apple Pay, Google Pay, PayPal or bank transfer',
      "Spend from the group's virtual card",
    ],
  },
] as const;

export type WipType = (typeof WIP_TYPES)[number]['value'];
