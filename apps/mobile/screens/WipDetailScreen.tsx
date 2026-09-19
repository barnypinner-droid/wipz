import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { usePaymentSheet } from '@stripe/stripe-react-native';
import { supabase } from '../lib/supabase';
import { createPaymentIntent } from '../lib/payments';
import { createWipCard, createFakeWipCard } from '../lib/card';
import type { Tables } from '../lib/database.types';
import { Colors } from '../constants/theme';
import { WIP_TYPES } from '../constants/wipTypes';
import { ProgressRing } from '../components/ProgressRing';
import { DatePickerField } from '../components/DatePickerField';
import { TimePickerField } from '../components/TimePickerField';
import { DayOfWeekPicker } from '../components/DayOfWeekPicker';
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
import { getOrCreateGroupConversation, getOrCreateDirectConversation } from '../lib/messages';
import { setWipRsvp } from '../lib/rsvp';
import { listWipInvites, sendWipInvite, buildInviteMessage, type ContactMethod, type WipInvite } from '../lib/invites';
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

function formatDateShort(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function WipDetailScreen({
  wipId,
  session,
  onBack,
  startInEdit,
  onOpenThread,
}: {
  wipId: string;
  session: Session;
  onBack: () => void;
  startInEdit?: boolean;
  onOpenThread: (conversationId: string, title: string) => void;
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

  const [scheduleDeadline, setScheduleDeadline] = useState('');
  const [scheduleEventDate, setScheduleEventDate] = useState('');
  const [scheduleEventEndDate, setScheduleEventEndDate] = useState('');
  const [scheduleRecurringDay, setScheduleRecurringDay] = useState('');
  const [scheduleRecurringTime, setScheduleRecurringTime] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [memberEmail, setMemberEmail] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [contactToInvite, setContactToInvite] = useState<{ name: string; phone: string } | null>(null);
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
  const [useFakeCard, setUseFakeCard] = useState(false);
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

  useEffect(() => {
    if (!wip) return;
    setScheduleDeadline(wip.deadline ?? '');
    setScheduleEventDate(wip.event_date ?? '');
    setScheduleEventEndDate(wip.event_end_date ?? '');
    setScheduleRecurringDay(wip.recurring_day ?? '');
    setScheduleRecurringTime(wip.recurring_time ?? '');
  }, [wip]);

  async function saveSchedule() {
    if (!wip) return;
    setSavingSchedule(true);
    setError(null);
    const updates: Partial<
      Pick<Whip, 'event_date' | 'event_end_date' | 'deadline' | 'recurring_day' | 'recurring_time'>
    > = {};
    if (wip.type === 'ad_hoc') {
      updates.event_date = scheduleEventDate || null;
    } else if (wip.type === 'savings_goal') {
      updates.deadline = scheduleDeadline || null;
      updates.event_end_date = scheduleEventEndDate || null;
    } else if (wip.type === 'recurring') {
      updates.recurring_day = scheduleRecurringDay || null;
      updates.recurring_time = scheduleRecurringTime || null;
    }
    const { error: updateError } = await supabase.from('whips').update(updates).eq('id', wipId);
    setSavingSchedule(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      await load();
    }
  }

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

  function formatWindowTime(value: string) {
    return new Date(value).toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

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

  const now = new Date();
  const windowNotOpenYet = !!wip.active_from && now < new Date(wip.active_from);
  const windowClosed = !!wip.active_until && now > new Date(wip.active_until);

  // Hands off to the OS share sheet rather than any WhatsApp-specific API,
  // WhatsApp doesn't expose a way to post into or read the members of an
  // existing group, so the organiser picks the group themselves from here.
  async function shareInvite() {
    try {
      await Share.share({ message: buildInviteMessage(wip!.title) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the share sheet.');
    }
  }

  async function openGroupChat() {
    try {
      const conversationId = await getOrCreateGroupConversation(wipId);
      onOpenThread(conversationId, wip!.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the group chat.');
    }
  }

  async function openMemberThread(userId: string, name: string) {
    try {
      const conversationId = await getOrCreateDirectConversation(userId);
      onOpenThread(conversationId, name);
    } catch (err) {
      setError("You're not friends with them yet, add them as a friend first.");
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
      <Pressable onPress={onBack}>
        <Text style={styles.back}>{'< Back'}</Text>
      </Pressable>

      <Text style={styles.title}>{wip.title}</Text>
      <Text style={styles.typeBadge}>{WIP_TYPES.find((t) => t.value === wip.type)?.label ?? wip.type}</Text>
      <Text style={styles.purpose}>{wip.purpose}</Text>
      {wip.type === 'ad_hoc' && wip.event_date && (
        <Text style={styles.deadline}>Happening {formatDateShort(wip.event_date)}</Text>
      )}
      {wip.type === 'savings_goal' && wip.deadline && (
        <Text style={styles.deadline}>
          {wip.event_end_date
            ? `Holiday: ${formatDateShort(wip.deadline)} – ${formatDateShort(wip.event_end_date)}`
            : `By ${formatDateShort(wip.deadline)}`}
        </Text>
      )}
      {wip.type === 'recurring' && wip.recurring_day && (
        <Text style={styles.deadline}>
          Every {wip.recurring_day.charAt(0).toUpperCase() + wip.recurring_day.slice(1)}
          {wip.recurring_time ? ` at ${formatTime(wip.recurring_time)}` : ''}
        </Text>
      )}
      <Text style={styles.typeHint}>{WIP_TYPES.find((t) => t.value === wip.type)?.hint}</Text>

      <Pressable style={styles.groupChatButton} onPress={openGroupChat}>
        <Text style={styles.groupChatButtonText}>💬 Message the group</Text>
      </Pressable>

      <ProgressRing current={wip.current_balance} target={wip.target_balance} />

      {(wip.active_from || wip.active_until) && (
        <Text style={styles.windowHint}>
          Payments open {wip.active_from ? formatWindowTime(wip.active_from) : 'any time'}
          {wip.active_until ? ` until ${formatWindowTime(wip.active_until)}` : ''}
          {windowClosed ? ' (closed)' : windowNotOpenYet ? ' (not open yet)' : ''}
        </Text>
      )}

      {windowNotOpenYet || windowClosed ? (
        <View style={styles.windowClosedNotice}>
          <Text style={styles.windowClosedNoticeText}>
            {windowClosed ? "This wip's payment window has closed." : "This wip isn't open for payments yet."}
          </Text>
        </View>
      ) : showContribute ? (
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

      {editing ? (
        <View style={styles.scheduleBox}>
          <Text style={styles.sectionTitle}>
            {wip.type === 'recurring' ? 'Day and time' : wip.type === 'savings_goal' ? 'Holiday dates' : 'Event date'}
          </Text>
          {wip.type === 'ad_hoc' && (
            <DatePickerField value={scheduleEventDate} onChange={setScheduleEventDate} placeholder="Event date" />
          )}
          {wip.type === 'savings_goal' && (
            <>
              <DatePickerField value={scheduleDeadline} onChange={setScheduleDeadline} placeholder="Holiday starts" />
              <DatePickerField
                value={scheduleEventEndDate}
                onChange={setScheduleEventEndDate}
                placeholder="Holiday ends"
                minimumDate={scheduleDeadline ? new Date(scheduleDeadline) : undefined}
              />
            </>
          )}
          {wip.type === 'recurring' && (
            <>
              <DayOfWeekPicker value={scheduleRecurringDay} onChange={setScheduleRecurringDay} />
              <TimePickerField value={scheduleRecurringTime} onChange={setScheduleRecurringTime} placeholder="What time" />
            </>
          )}
          <Pressable style={styles.smallButton} disabled={savingSchedule} onPress={saveSchedule}>
            {savingSchedule ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.smallButtonText}>Save</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Rules */}
      <Text style={styles.sectionTitle}>Rules</Text>
      <Text style={styles.emptyText}>
        What the pot's money can be used for, so everyone agrees upfront. Example: "
        {WIP_TYPES.find((t) => t.value === wip.type)?.ruleExample}".
      </Text>
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
            <Pressable style={styles.smallButton} onPress={() => setShowAddRule(true)}>
              <Text style={styles.smallButtonText}>+ Add rule</Text>
            </Pressable>
          )}
        </>
      )}

      {/* Members */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Members</Text>
        {isStaff && wip.type === 'recurring' && !showAddOccurrence && (
          <Pressable style={styles.smallButton} onPress={() => setShowAddOccurrence(true)}>
            <Text style={styles.smallButtonText}>+ Open this week's RSVP</Text>
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
                    onPress={() =>
                      openMemberThread(member.user_id, member.users?.full_name ?? member.users?.email ?? 'Member')
                    }
                  >
                    <Text style={styles.messageLink}>Message</Text>
                  </Pressable>
                )}
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

            {(wip.type === 'ad_hoc' || wip.type === 'savings_goal') && (
              <>
                {isMe ? (
                  <View style={styles.rsvpButtons}>
                    <Pressable
                      style={[styles.rsvpButton, member.rsvp_status === 'in' && styles.rsvpButtonActiveIn]}
                      onPress={() => runAction(() => setWipRsvp(wipId, 'in'))}
                    >
                      <Text style={styles.rsvpButtonText}>I'm in</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.rsvpButton, member.rsvp_status === 'out' && styles.rsvpButtonActiveOut]}
                      onPress={() => runAction(() => setWipRsvp(wipId, 'out'))}
                    >
                      <Text style={styles.rsvpButtonText}>I'm out</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.rowMeta}>RSVP: {rsvpLabel(member.rsvp_status)}</Text>
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
              <Text style={styles.rowText}>{invite.name ?? invite.phone}</Text>
              <Text style={styles.rowMeta}>
                {invite.status === 'accepted' ? 'joined' : "invited, hasn't paid in yet"}
              </Text>
            </View>
          ))}

          <View style={styles.memberButtonRow}>
            <Pressable
              style={styles.smallButton}
              onPress={async () => {
                try {
                  const picked = await pickContactPhone();
                  if (!picked) return;

                  const existingUser = await findUserByPhone(picked.phone);
                  if (existingUser) {
                    await runAction(() => addMemberByUserId(wipId, existingUser.id));
                  } else {
                    setContactToInvite(picked);
                  }
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not add that contact.');
                }
              }}
            >
              <Text style={styles.smallButtonText}>+ Add from contacts</Text>
            </Pressable>
            <Pressable style={styles.shareButton} onPress={shareInvite}>
              <Text style={styles.shareButtonText}>Share invite via WhatsApp</Text>
            </Pressable>
          </View>
          <Text style={styles.emptyText}>
            Sharing opens WhatsApp so you can pick your own group, but whoever joins that way still needs adding
            here afterward, WhatsApp doesn't tell us who's in a group.
          </Text>

          {contactToInvite && (
            <View style={styles.form}>
              <Text style={styles.rowText}>How should we contact {contactToInvite.name}?</Text>
              <View style={styles.contactMethodRow}>
                {(['sms', 'whatsapp'] as ContactMethod[]).map((method) => (
                  <Pressable
                    key={method}
                    style={styles.smallButton}
                    onPress={() =>
                      runAction(async () => {
                        await sendWipInvite(wipId, contactToInvite.phone, wip.title, session.user.id, method, contactToInvite.name);
                        setContactToInvite(null);
                      })
                    }
                  >
                    <Text style={styles.smallButtonText}>{method === 'sms' ? 'Text message' : 'WhatsApp'}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => setContactToInvite(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          )}

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
            <Pressable style={styles.smallButton} onPress={() => setShowAddMember(true)}>
              <Text style={styles.smallButtonText}>+ Add member by email</Text>
            </Pressable>
          )}

          {showInvite ? (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Their name"
                placeholderTextColor="#64748b"
                value={inviteName}
                onChangeText={setInviteName}
              />
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
                    await sendWipInvite(
                      wipId,
                      invitePhone.trim(),
                      wip.title,
                      session.user.id,
                      'sms',
                      inviteName.trim() || undefined,
                    );
                    setInviteName('');
                    setInvitePhone('');
                    setShowInvite(false);
                  })
                }
              >
                <Text style={styles.smallButtonText}>Send invite text</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.smallButton} onPress={() => setShowInvite(true)}>
              <Text style={styles.smallButtonText}>+ Invite by phone number</Text>
            </Pressable>
          )}
        </>
      )}

      {/* Virtual card */}
      <Text style={styles.sectionTitle}>Card</Text>
      {wip.stripe_card_id ? (
        <View style={styles.row}>
          <View style={styles.cardRowHeader}>
            <Text style={styles.rowText}>Virtual card •••• {wip.stripe_card_last4}</Text>
            {wip.card_is_fake && <Text style={styles.fakeCardBadge}>TEST CARD</Text>}
          </View>
          <Text style={styles.rowMeta}>
            Expires {wip.stripe_card_exp_month}/{wip.stripe_card_exp_year}
          </Text>
          {!wip.card_active && (
            <Text style={styles.rowMeta}>Deactivated, outside this wip's payment window.</Text>
          )}
        </View>
      ) : isStaff ? (
        <>
          <Text style={styles.emptyText}>
            No card yet. A real card needs Stripe Issuing enabled on the account, if it isn't yet, that will show
            an error explaining how to enable it. Use a fake test card below to try the feature without it.
          </Text>
          {showCardForm ? (
            <View style={styles.form}>
              <Pressable style={styles.fakeCardToggle} onPress={() => setUseFakeCard((v) => !v)}>
                <Text style={styles.fakeCardToggleText}>
                  {useFakeCard ? '☑' : '☐'} Use a fake test card instead (no billing details needed)
                </Text>
              </Pressable>

              {!useFakeCard && (
                <>
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
                </>
              )}
              <Pressable
                style={styles.smallButton}
                disabled={provisioningCard}
                onPress={() =>
                  runAction(async () => {
                    setProvisioningCard(true);
                    try {
                      if (useFakeCard) {
                        await createFakeWipCard(wipId);
                      } else {
                        await createWipCard(wipId, {
                          line1: billingLine1.trim(),
                          city: billingCity.trim(),
                          postal_code: billingPostalCode.trim(),
                        });
                      }
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
                  <Text style={styles.smallButtonText}>{useFakeCard ? 'Create fake card' : 'Get virtual card'}</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.smallButton} onPress={() => setShowCardForm(true)}>
              <Text style={styles.smallButtonText}>+ Get a virtual card for this wip</Text>
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
            <Pressable style={styles.smallButton} onPress={() => setShowWithdraw(true)}>
              <Text style={styles.smallButtonText}>+ Withdraw from this wip</Text>
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
              {transaction.users?.full_name ?? transaction.users?.email ?? 'Someone'}{' '}
              {transaction.type === 'withdrawal' ? 'spent' : 'deposited'} {formatPence(transaction.amount)}:{' '}
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
                <Pressable style={styles.smallButton} onPress={() => setFlaggingId(transaction.id)}>
                  <Text style={styles.smallButtonText}>Flag as out of rules</Text>
                </Pressable>
              )}
            </>
          )}

          {transaction.flagged && transaction.user_id && (
            <Pressable
              style={styles.smallButton}
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
              <Text style={styles.smallButtonText}>Remind to top up</Text>
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
        <Pressable style={styles.smallButton} onPress={() => setShowNudge(true)}>
          <Text style={styles.smallButtonText}>+ Nudge everyone still pending</Text>
        </Pressable>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  windowHint: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
  windowClosedNotice: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  windowClosedNoticeText: {
    color: '#64748b',
    fontSize: 14,
  },
  groupChatButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  groupChatButtonText: {
    color: Colors.secondary,
    fontWeight: '600',
    fontSize: 13,
  },
  messageLink: {
    color: Colors.secondary,
    fontSize: 12,
    fontWeight: '600',
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
  scheduleBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
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
  contactMethodRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  cardRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fakeCardBadge: {
    color: Colors.secondary,
    fontSize: 10,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  fakeCardToggle: {
    marginBottom: 12,
  },
  fakeCardToggleText: {
    color: '#94a3b8',
    fontSize: 13,
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
  memberButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  shareButton: {
    backgroundColor: '#25D366',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
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
