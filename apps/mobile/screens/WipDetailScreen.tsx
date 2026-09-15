import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { usePaymentSheet } from '@stripe/stripe-react-native';
import { supabase } from '../lib/supabase';
import { createPaymentIntent } from '../lib/payments';
import { createWipCard } from '../lib/card';
import type { Tables } from '../lib/database.types';
import { Colors } from '../constants/theme';
import { WIP_TYPES } from '../constants/wipTypes';
import { ProgressRing } from '../components/ProgressRing';
import { DatePickerField } from '../components/DatePickerField';
import {
  listMembers,
  addMemberByEmail,
  addMemberByUserId,
  findUserByPhone,
  removeMember,
  type WipMember,
} from '../lib/members';
import { pickContactPhone } from '../lib/contacts';
import { listRules, addRule, deleteRule, type WipRule } from '../lib/rules';
import {
  listOccurrences,
  createOccurrence,
  listRsvps,
  setRsvp,
  type WipOccurrence,
  type WipRsvp,
} from '../lib/occurrences';
import { listTransactions, flagTransaction, type Transaction } from '../lib/transactions';
import {
  listWithdrawalRequests,
  requestWithdrawal,
  approveWithdrawalRequest,
  type WithdrawalRequest,
} from '../lib/withdrawals';
import { sendNudge } from '../lib/nudges';
import { listWipInvites, sendWipInvite, type WipInvite } from '../lib/invites';
import {
  createSetupIntent,
  createContributionPlan,
  listContributionPlans,
  cancelContributionPlan,
  type ContributionPlanProgress,
} from '../lib/contributionPlans';

type Whip = Tables<'whips'>;

function formatPence(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function rsvpLabel(status: string | undefined) {
  if (status === 'in') return "I'm in";
  if (status === 'out') return "I'm out";
  return 'Pending';
}

export function WipDetailScreen({
  wipId,
  session,
  onBack,
  startInEdit,
}: {
  wipId: string;
  session: Session;
  onBack: () => void;
  startInEdit?: boolean;
}) {
  const [wip, setWip] = useState<Whip | null>(null);
  const [members, setMembers] = useState<WipMember[]>([]);
  const [rules, setRules] = useState<WipRule[]>([]);
  const [occurrences, setOccurrences] = useState<WipOccurrence[]>([]);
  const [occurrenceRsvps, setOccurrenceRsvps] = useState<WipRsvp[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [invites, setInvites] = useState<WipInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(!!startInEdit);

  const [memberEmail, setMemberEmail] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [ruleText, setRuleText] = useState('');
  const [showAddRule, setShowAddRule] = useState(false);
  const [occurrenceDate, setOccurrenceDate] = useState(todayISO());
  const [showAddOccurrence, setShowAddOccurrence] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDescription, setWithdrawDescription] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState('');
  const [showNudge, setShowNudge] = useState(false);
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [contributeAmount, setContributeAmount] = useState('');
  const [showContribute, setShowContribute] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [billingLine1, setBillingLine1] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');
  const [provisioningCard, setProvisioningCard] = useState(false);
  const [contributionPlans, setContributionPlans] = useState<ContributionPlanProgress[]>([]);
  const [showInstalmentForm, setShowInstalmentForm] = useState(false);
  const [instalmentAmount, setInstalmentAmount] = useState('');
  const [instalmentMonths, setInstalmentMonths] = useState('');
  const [settingUpPlan, setSettingUpPlan] = useState(false);

  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

  const load = useCallback(async () => {
    setError(null);
    try {
      const [wipResult, memberList, ruleList, occurrenceList, transactionList, requestList, inviteList, planList] =
        await Promise.all([
          supabase.from('whips').select('*').eq('id', wipId).single(),
          listMembers(wipId),
          listRules(wipId),
          listOccurrences(wipId),
          listTransactions(wipId),
          listWithdrawalRequests(wipId),
          listWipInvites(wipId),
          listContributionPlans(wipId),
        ]);
      if (wipResult.error) throw wipResult.error;
      setWip(wipResult.data);
      setMembers(memberList);
      setRules(ruleList);
      setOccurrences(occurrenceList);
      setTransactions(transactionList);
      setWithdrawalRequests(requestList);
      setInvites(inviteList);
      setContributionPlans(planList);

      // occurrenceList is sorted newest-first, so [0] is the current/latest week.
      const latest = occurrenceList[0];
      setOccurrenceRsvps(latest ? await listRsvps(latest.id) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wip.');
    } finally {
      setLoading(false);
    }
  }, [wipId]);

  useEffect(() => {
    load();
  }, [load]);

  const payWithSheet = useCallback(
    async (args: { transactionId: string } | { amount: number }) => {
      setPaying(true);
      setError(null);
      try {
        const { clientSecret } = await createPaymentIntent(
          'transactionId' in args
            ? { transactionId: args.transactionId }
            : { whipId: wipId, amount: args.amount },
        );

        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: 'Wipz',
          applePay: { merchantCountryCode: 'GB' },
          googlePay: { merchantCountryCode: 'GB', currencyCode: 'GBP', testEnv: true },
          allowsDelayedPaymentMethods: true,
          returnURL: 'wipz://stripe-redirect',
        });
        if (initError) throw new Error(initError.message);

        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          if (presentError.code === 'Canceled') return;
          throw new Error(presentError.message);
        }

        setError(null);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Payment failed.');
      } finally {
        setPaying(false);
      }
    },
    [wipId, initPaymentSheet, presentPaymentSheet, load],
  );

  // Sets up a "£X a month for N months" instalment plan: saves a payment
  // method via a SetupIntent (not a payment, nothing is charged yet), then
  // records the plan. charge-due-plans (a daily cron job) takes it from
  // there, charging the saved card/Bacs mandate each month automatically.
  const setupInstalmentPlan = useCallback(
    async (amount: number, totalInstallments: number) => {
      setSettingUpPlan(true);
      setError(null);
      try {
        const { customerId, ephemeralKeySecret, setupIntentClientSecret, setupIntentId } = await createSetupIntent();

        const { error: initError } = await initPaymentSheet({
          setupIntentClientSecret,
          customerId,
          customerEphemeralKeySecret: ephemeralKeySecret,
          merchantDisplayName: 'Wipz',
          allowsDelayedPaymentMethods: true,
          returnURL: 'wipz://stripe-redirect',
        });
        if (initError) throw new Error(initError.message);

        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          if (presentError.code === 'Canceled') return;
          throw new Error(presentError.message);
        }

        await createContributionPlan({ whipId: wipId, amount, totalInstallments, setupIntentId });

        setError(null);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not set up the instalment plan.');
      } finally {
        setSettingUpPlan(false);
      }
    },
    [wipId, initPaymentSheet, presentPaymentSheet, load],
  );

  const myMembership = members.find((m) => m.user_id === session.user.id);
  const isStaff = myMembership?.role === 'organiser' || myMembership?.role === 'treasurer';
  const latestOccurrence = occurrences[0];

  function paidInBy(userId: string) {
    return transactions
      .filter((t) => t.user_id === userId && t.type === 'contribution' && t.status === 'success')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  async function runAction(action: () => Promise<void>) {
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  if (loading || !wip) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack}>
        <Text style={styles.back}>{'< Back'}</Text>
      </Pressable>

      <Text style={styles.title}>{wip.title}</Text>
      <Text style={styles.typeBadge}>{WIP_TYPES.find((t) => t.value === wip.type)?.label ?? wip.type}</Text>
      <Text style={styles.purpose}>{wip.purpose}</Text>
      {wip.deadline && <Text style={styles.deadline}>By {wip.deadline}</Text>}
      <Text style={styles.typeHint}>{WIP_TYPES.find((t) => t.value === wip.type)?.hint}</Text>

      <ProgressRing current={wip.current_balance} target={wip.target_balance} />

      {showContribute ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Amount (£)"
            placeholderTextColor="#64748b"
            keyboardType="decimal-pad"
            value={contributeAmount}
            onChangeText={setContributeAmount}
          />
          <Pressable
            style={styles.button}
            disabled={paying}
            onPress={() => {
              const pence = Math.round(parseFloat(contributeAmount) * 100);
              if (!Number.isFinite(pence) || pence <= 0) {
                setError('Enter an amount above £0.');
                return;
              }
              setContributeAmount('');
              setShowContribute(false);
              payWithSheet({ amount: pence });
            }}
          >
            {paying ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Pay in</Text>}
          </Pressable>
          <Pressable onPress={() => setShowContribute(false)} disabled={paying}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.button} onPress={() => setShowContribute(true)}>
          <Text style={styles.buttonText}>Pay into this wip</Text>
        </Pressable>
      )}

      {/* Instalment plans: savings-goal wips only */}
      {wip.type === 'savings_goal' && (
        <View>
          <Text style={styles.sectionTitle}>Instalment plans</Text>
          {contributionPlans.length === 0 && (
            <Text style={styles.emptyText}>No instalment plans set up yet.</Text>
          )}
          {contributionPlans.map((plan) => (
            <View key={plan.id} style={styles.row}>
              <Text style={styles.rowText}>
                {plan.user_id === session.user.id ? 'You' : plan.full_name ?? 'Member'}: £
                {(plan.amount / 100).toFixed(2)}/month × {plan.total_installments}
              </Text>
              <Text style={styles.rowMeta}>
                {plan.status === 'active' && `${plan.installments_paid} of ${plan.total_installments} paid`}
                {plan.status === 'completed' && 'completed'}
                {plan.status === 'failed' && 'payment failed, needs attention'}
                {plan.status === 'cancelled' && 'cancelled'}
              </Text>
              {plan.user_id === session.user.id && plan.status === 'active' && (
                <Pressable onPress={() => runAction(() => cancelContributionPlan(plan.id))}>
                  <Text style={styles.deleteLink}>Cancel</Text>
                </Pressable>
              )}
            </View>
          ))}

          {showInstalmentForm ? (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Amount per month (£)"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
                value={instalmentAmount}
                onChangeText={setInstalmentAmount}
              />
              <TextInput
                style={styles.input}
                placeholder="Number of months (e.g. 6)"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
                value={instalmentMonths}
                onChangeText={setInstalmentMonths}
              />
              <Pressable
                style={styles.button}
                disabled={settingUpPlan}
                onPress={() => {
                  const pence = Math.round(parseFloat(instalmentAmount) * 100);
                  const months = parseInt(instalmentMonths, 10);
                  if (!Number.isFinite(pence) || pence <= 0) {
                    setError('Enter a monthly amount above £0.');
                    return;
                  }
                  if (!Number.isInteger(months) || months <= 0) {
                    setError('Enter a whole number of months.');
                    return;
                  }
                  setInstalmentAmount('');
                  setInstalmentMonths('');
                  setShowInstalmentForm(false);
                  setupInstalmentPlan(pence, months);
                }}
              >
                {settingUpPlan ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Save payment method &amp; start plan</Text>
                )}
              </Pressable>
              <Pressable onPress={() => setShowInstalmentForm(false)} disabled={settingUpPlan}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.button} onPress={() => setShowInstalmentForm(true)}>
              <Text style={styles.buttonText}>Set up a monthly instalment plan</Text>
            </Pressable>
          )}
        </View>
      )}

      {isStaff && (
        <Pressable style={styles.editToggle} onPress={() => setEditing((e) => !e)}>
          <Text style={styles.editToggleText}>{editing ? 'Done editing' : 'Edit wip settings'}</Text>
        </Pressable>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Rules */}
      <Text style={styles.sectionTitle}>Rules</Text>
      {rules.length === 0 && <Text style={styles.emptyText}>No rules set yet.</Text>}
      {rules.map((rule) => (
        <View key={rule.id} style={styles.ruleRow}>
          <Text style={styles.ruleText}>• {rule.rule_text}</Text>
          {editing && (
            <Pressable onPress={() => runAction(() => deleteRule(rule.id))}>
              <Text style={styles.deleteLink}>Remove</Text>
            </Pressable>
          )}
        </View>
      ))}
      {editing && (
        <>
          {showAddRule ? (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Only pitch hire comes out of this pot"
                placeholderTextColor="#64748b"
                value={ruleText}
                onChangeText={setRuleText}
              />
              <Pressable
                style={styles.smallButton}
                onPress={() =>
                  runAction(async () => {
                    await addRule(wipId, ruleText.trim());
                    setRuleText('');
                    setShowAddRule(false);
                  })
                }
              >
                <Text style={styles.smallButtonText}>Add</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setShowAddRule(true)}>
              <Text style={styles.link}>+ Add rule</Text>
            </Pressable>
          )}
        </>
      )}

      {/* Members */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Members</Text>
        {isStaff && wip.type === 'recurring' && !showAddOccurrence && (
          <Pressable onPress={() => setShowAddOccurrence(true)}>
            <Text style={styles.link}>+ Open this week's RSVP</Text>
          </Pressable>
        )}
      </View>
      {isStaff && wip.type === 'recurring' && showAddOccurrence && (
        <View style={styles.form}>
          <DatePickerField value={occurrenceDate} onChange={setOccurrenceDate} placeholder="Match date" />
          <Pressable
            style={styles.smallButton}
            onPress={() =>
              runAction(async () => {
                await createOccurrence(wipId, occurrenceDate);
                setShowAddOccurrence(false);
              })
            }
          >
            <Text style={styles.smallButtonText}>Open RSVP</Text>
          </Pressable>
        </View>
      )}

      {members.map((member) => {
        const isMe = member.user_id === session.user.id;
        const paidIn = paidInBy(member.user_id);
        const myRsvp = latestOccurrence
          ? occurrenceRsvps.find((r) => r.user_id === member.user_id)
          : undefined;
        const pendingContribution = latestOccurrence
          ? transactions.find(
              (t) =>
                t.occurrence_id === latestOccurrence.id &&
                t.user_id === member.user_id &&
                t.status === 'pending',
            )
          : undefined;

        return (
          <View key={member.id} style={styles.memberRow}>
            <View style={styles.memberHeader}>
              <Text style={styles.rowText}>{member.users?.full_name ?? member.users?.email}</Text>
              <View style={styles.memberHeaderRight}>
                <Text style={styles.rowMeta}>{member.role}</Text>
                {!isMe && (
                  <Pressable
                    style={styles.nudgeIcon}
                    onPress={() =>
                      runAction(() =>
                        sendNudge(wipId, `Reminder from ${wip.title} on Wipz.`, member.user_id),
                      )
                    }
                  >
                    <Text style={styles.nudgeIconText}>🔔</Text>
                  </Pressable>
                )}
                {editing && !isMe && (
                  <Pressable onPress={() => runAction(() => removeMember(member.id))}>
                    <Text style={styles.deleteLink}>Remove</Text>
                  </Pressable>
                )}
              </View>
            </View>
            <Text style={styles.rowMeta}>Paid in: {formatPence(paidIn)}</Text>

            {wip.type === 'recurring' && latestOccurrence && (
              <>
                {isMe ? (
                  <View style={styles.rsvpButtons}>
                    <Pressable
                      style={[styles.rsvpButton, myRsvp?.status === 'in' && styles.rsvpButtonActiveIn]}
                      onPress={() => runAction(() => setRsvp(latestOccurrence.id, 'in'))}
                    >
                      <Text style={styles.rsvpButtonText}>I'm in</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.rsvpButton, myRsvp?.status === 'out' && styles.rsvpButtonActiveOut]}
                      onPress={() => runAction(() => setRsvp(latestOccurrence.id, 'out'))}
                    >
                      <Text style={styles.rsvpButtonText}>I'm out</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.rowMeta}>RSVP: {rsvpLabel(myRsvp?.status)}</Text>
                )}
                {pendingContribution && isMe && (
                  <Pressable
                    style={styles.smallButton}
                    disabled={paying}
                    onPress={() => payWithSheet({ transactionId: pendingContribution.id })}
                  >
                    {paying ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.smallButtonText}>Pay {formatPence(pendingContribution.amount)}</Text>
                    )}
                  </Pressable>
                )}
              </>
            )}
          </View>
        );
      })}

      {editing && (
        <>
          {invites.map((invite) => (
            <View key={invite.id} style={styles.row}>
              <Text style={styles.rowText}>{invite.phone}</Text>
              <Text style={styles.rowMeta}>{invite.status === 'accepted' ? 'joined' : 'invited'}</Text>
            </View>
          ))}

          <Pressable
            onPress={() =>
              runAction(async () => {
                const picked = await pickContactPhone();
                if (!picked) return;

                const existingUser = await findUserByPhone(picked.phone);
                if (existingUser) {
                  await addMemberByUserId(wipId, existingUser.id);
                } else {
                  await sendWipInvite(wipId, picked.phone, wip.title, session.user.id);
                }
              })
            }
          >
            <Text style={styles.link}>+ Add from contacts</Text>
          </Pressable>

          {showAddMember ? (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Member's email"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                value={memberEmail}
                onChangeText={setMemberEmail}
              />
              <Pressable
                style={styles.smallButton}
                onPress={() =>
                  runAction(async () => {
                    await addMemberByEmail(wipId, memberEmail.trim());
                    setMemberEmail('');
                    setShowAddMember(false);
                  })
                }
              >
                <Text style={styles.smallButtonText}>Add</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setShowAddMember(true)}>
              <Text style={styles.link}>+ Add member by email</Text>
            </Pressable>
          )}

          {showInvite ? (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="+447123456789"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={invitePhone}
                onChangeText={setInvitePhone}
              />
              <Pressable
                style={styles.smallButton}
                onPress={() =>
                  runAction(async () => {
                    await sendWipInvite(wipId, invitePhone.trim(), wip.title, session.user.id);
                    setInvitePhone('');
                    setShowInvite(false);
                  })
                }
              >
                <Text style={styles.smallButtonText}>Send invite text</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setShowInvite(true)}>
              <Text style={styles.link}>+ Invite by phone number (no account needed yet)</Text>
            </Pressable>
          )}
        </>
      )}

      {/* Virtual card */}
      <Text style={styles.sectionTitle}>Card</Text>
      {wip.stripe_card_id ? (
        <View style={styles.row}>
          <Text style={styles.rowText}>Virtual card •••• {wip.stripe_card_last4}</Text>
          <Text style={styles.rowMeta}>
            Expires {wip.stripe_card_exp_month}/{wip.stripe_card_exp_year}
          </Text>
        </View>
      ) : isStaff ? (
        <>
          <Text style={styles.emptyText}>
            No card yet. Note: this requires Stripe Issuing to be enabled on the account. If it isn't yet, this
            will show an error explaining how to enable it.
          </Text>
          {showCardForm ? (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Billing address line 1"
                placeholderTextColor="#64748b"
                value={billingLine1}
                onChangeText={setBillingLine1}
              />
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor="#64748b"
                value={billingCity}
                onChangeText={setBillingCity}
              />
              <TextInput
                style={styles.input}
                placeholder="Postal code"
                placeholderTextColor="#64748b"
                value={billingPostalCode}
                onChangeText={setBillingPostalCode}
              />
              <Text style={styles.emptyText}>
                Only needed the first time you provision a card, it registers you as the cardholder with Stripe.
              </Text>
              <Pressable
                style={styles.smallButton}
                disabled={provisioningCard}
                onPress={() =>
                  runAction(async () => {
                    setProvisioningCard(true);
                    try {
                      await createWipCard(wipId, {
                        line1: billingLine1.trim(),
                        city: billingCity.trim(),
                        postal_code: billingPostalCode.trim(),
                      });
                      setShowCardForm(false);
                    } finally {
                      setProvisioningCard(false);
                    }
                  })
                }
              >
                {provisioningCard ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.smallButtonText}>Get virtual card</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setShowCardForm(true)}>
              <Text style={styles.link}>+ Get a virtual card for this wip</Text>
            </Pressable>
          )}
        </>
      ) : (
        <Text style={styles.emptyText}>No card yet.</Text>
      )}

      {/* Withdrawals */}
      {isStaff && (
        <>
          <Text style={styles.sectionTitle}>Withdraw</Text>
          {showWithdraw ? (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Amount (£)"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
              />
              <TextInput
                style={styles.input}
                placeholder="Reason"
                placeholderTextColor="#64748b"
                value={withdrawDescription}
                onChangeText={setWithdrawDescription}
              />
              <Pressable
                style={styles.smallButton}
                onPress={() =>
                  runAction(async () => {
                    const pence = Math.round(parseFloat(withdrawAmount) * 100);
                    await requestWithdrawal(wipId, pence, withdrawDescription.trim());
                    setWithdrawAmount('');
                    setWithdrawDescription('');
                    setShowWithdraw(false);
                  })
                }
              >
                <Text style={styles.smallButtonText}>Request withdrawal</Text>
              </Pressable>
              {wip.approval_threshold != null && (
                <Text style={styles.emptyText}>
                  Withdrawals of {formatPence(wip.approval_threshold)} or more need a second approval.
                </Text>
              )}
            </View>
          ) : (
            <Pressable onPress={() => setShowWithdraw(true)}>
              <Text style={styles.link}>+ Withdraw from this wip</Text>
            </Pressable>
          )}
          {withdrawalRequests
            .filter((r) => r.status === 'pending')
            .map((request) => (
              <View key={request.id} style={styles.row}>
                <Text style={styles.rowText}>
                  {formatPence(request.amount)}: {request.description}
                </Text>
                <Pressable
                  style={styles.smallButton}
                  onPress={() => runAction(() => approveWithdrawalRequest(request.id))}
                >
                  <Text style={styles.smallButtonText}>Approve</Text>
                </Pressable>
              </View>
            ))}
        </>
      )}

      {/* Activity log */}
      <Text style={styles.sectionTitle}>Activity</Text>
      {transactions.length === 0 && <Text style={styles.emptyText}>No activity yet.</Text>}
      {transactions.map((transaction) => (
        <View key={transaction.id} style={styles.transactionRow}>
          <View style={styles.transactionHeader}>
            <Text style={styles.rowText}>
              {transaction.type === 'withdrawal' ? 'Spent' : 'Deposited'} {formatPence(transaction.amount)}:{' '}
              {transaction.description}
            </Text>
            {transaction.flagged && <Text style={styles.flaggedBadge}>FLAGGED</Text>}
          </View>
          <Text style={styles.rowMeta}>{transaction.status}</Text>
          {transaction.flagged && transaction.flagged_reason && (
            <Text style={styles.flagReasonText}>Reason: {transaction.flagged_reason}</Text>
          )}

          {transaction.type === 'withdrawal' && !transaction.flagged && (
            <>
              {flaggingId === transaction.id ? (
                <View style={styles.form}>
                  <TextInput
                    style={styles.input}
                    placeholder="Why is this outside the rules?"
                    placeholderTextColor="#64748b"
                    value={flagReason}
                    onChangeText={setFlagReason}
                  />
                  <Pressable
                    style={styles.smallButton}
                    onPress={() =>
                      runAction(async () => {
                        await flagTransaction(transaction.id, flagReason.trim());
                        setFlagReason('');
                        setFlaggingId(null);
                      })
                    }
                  >
                    <Text style={styles.smallButtonText}>Flag</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setFlaggingId(transaction.id)}>
                  <Text style={styles.link}>Flag as out of rules</Text>
                </Pressable>
              )}
            </>
          )}

          {transaction.flagged && transaction.user_id && (
            <Pressable
              onPress={() =>
                runAction(() =>
                  sendNudge(
                    wipId,
                    `Reminder: please top up ${formatPence(transaction.amount)} for "${transaction.description}", flagged as outside this wip's rules.`,
                    transaction.user_id!,
                  ),
                )
              }
            >
              <Text style={styles.link}>Remind to top up</Text>
            </Pressable>
          )}
        </View>
      ))}

      {/* Nudges */}
      <Text style={styles.sectionTitle}>Nudge the group</Text>
      {showNudge ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="e.g. Don't forget to pay in for Tuesday!"
            placeholderTextColor="#64748b"
            value={nudgeMessage}
            onChangeText={setNudgeMessage}
          />
          <Pressable
            style={styles.smallButton}
            onPress={() =>
              runAction(async () => {
                await sendNudge(wipId, nudgeMessage.trim());
                setNudgeMessage('');
                setShowNudge(false);
              })
            }
          >
            <Text style={styles.smallButtonText}>Send</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setShowNudge(true)}>
          <Text style={styles.link}>+ Nudge everyone still pending</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  back: {
    color: Colors.secondary,
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  typeBadge: {
    color: Colors.secondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  purpose: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  deadline: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  typeHint: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },
  editToggle: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  editToggleText: {
    color: Colors.secondary,
    fontWeight: '600',
    fontSize: 13,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 28,
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  memberRow: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 4,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nudgeIcon: {
    paddingHorizontal: 2,
  },
  nudgeIconText: {
    fontSize: 15,
  },
  transactionRow: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 4,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowText: {
    color: '#fff',
    fontSize: 14,
  },
  rowMeta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  ruleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ruleText: {
    color: '#94a3b8',
    fontSize: 14,
    flex: 1,
  },
  deleteLink: {
    color: '#f87171',
    fontSize: 12,
  },
  flaggedBadge: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '700',
  },
  flagReasonText: {
    color: '#f87171',
    fontSize: 12,
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  rsvpButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  rsvpButtonActiveIn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rsvpButtonActiveOut: {
    backgroundColor: '#334155',
    borderColor: '#334155',
  },
  rsvpButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  form: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    marginBottom: 8,
  },
  smallButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  smallButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
  },
  link: {
    color: Colors.secondary,
    fontSize: 13,
    marginBottom: 8,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 8,
  },
  error: {
    color: '#f87171',
    marginVertical: 8,
  },
});
