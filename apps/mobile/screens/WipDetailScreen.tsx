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
import { supabase } from '../lib/supabase';
import type { Tables } from '../lib/database.types';
import { Colors } from '../constants/theme';
import { WIP_TYPES } from '../constants/wipTypes';
import { listMembers, addMemberByEmail, type WipMember } from '../lib/members';
import { listRules, addRule, type WipRule } from '../lib/rules';
import {
  listOccurrences,
  createOccurrence,
  listMyRsvpsForWhip,
  setRsvp,
  type WipOccurrence,
  type WipRsvp,
} from '../lib/occurrences';
import {
  listTransactions,
  flagTransaction,
  payPendingContribution,
  type Transaction,
} from '../lib/transactions';
import {
  listWithdrawalRequests,
  requestWithdrawal,
  approveWithdrawalRequest,
  type WithdrawalRequest,
} from '../lib/withdrawals';
import { sendNudge } from '../lib/nudges';
import { listWipInvites, sendWipInvite, type WipInvite } from '../lib/invites';

type Whip = Tables<'whips'>;

function formatPence(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function WipDetailScreen({ wipId, session, onBack }: { wipId: string; session: Session; onBack: () => void }) {
  const [wip, setWip] = useState<Whip | null>(null);
  const [members, setMembers] = useState<WipMember[]>([]);
  const [rules, setRules] = useState<WipRule[]>([]);
  const [occurrences, setOccurrences] = useState<WipOccurrence[]>([]);
  const [myRsvps, setMyRsvps] = useState<WipRsvp[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [invites, setInvites] = useState<WipInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const load = useCallback(async () => {
    setError(null);
    try {
      const [wipResult, memberList, ruleList, occurrenceList, transactionList, requestList, inviteList] =
        await Promise.all([
          supabase.from('whips').select('*').eq('id', wipId).single(),
          listMembers(wipId),
          listRules(wipId),
          listOccurrences(wipId),
          listTransactions(wipId),
          listWithdrawalRequests(wipId),
          listWipInvites(wipId),
        ]);
      if (wipResult.error) throw wipResult.error;
      setWip(wipResult.data);
      setMembers(memberList);
      setRules(ruleList);
      setOccurrences(occurrenceList);
      setTransactions(transactionList);
      setWithdrawalRequests(requestList);
      setInvites(inviteList);
      setMyRsvps(await listMyRsvpsForWhip(wipId, session.user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wip.');
    } finally {
      setLoading(false);
    }
  }, [wipId, session.user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const myMembership = members.find((m) => m.user_id === session.user.id);
  const isStaff = myMembership?.role === 'organiser' || myMembership?.role === 'treasurer';

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
      <Text style={styles.balance}>
        {formatPence(wip.current_balance)} / {formatPence(wip.target_balance)}
      </Text>
      {wip.deadline && <Text style={styles.deadline}>By {wip.deadline}</Text>}

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Members */}
      <Text style={styles.sectionTitle}>Members</Text>
      {members.map((member) => (
        <View key={member.id} style={styles.row}>
          <Text style={styles.rowText}>{member.users?.full_name ?? member.users?.email}</Text>
          <Text style={styles.rowMeta}>{member.role}</Text>
        </View>
      ))}
      {isStaff && (
        <>
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
              <Text style={styles.link}>+ Add member</Text>
            </Pressable>
          )}

          {invites.map((invite) => (
            <View key={invite.id} style={styles.row}>
              <Text style={styles.rowText}>{invite.phone}</Text>
              <Text style={styles.rowMeta}>{invite.status === 'accepted' ? 'joined' : 'invited'}</Text>
            </View>
          ))}
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
                    await sendWipInvite(wipId, invitePhone.trim());
                    setInvitePhone('');
                    setShowInvite(false);
                  })
                }
              >
                <Text style={styles.smallButtonText}>Send WhatsApp invite</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setShowInvite(true)}>
              <Text style={styles.link}>+ Invite by WhatsApp (no account needed yet)</Text>
            </Pressable>
          )}
        </>
      )}

      {/* Rules */}
      <Text style={styles.sectionTitle}>Rules</Text>
      {rules.length === 0 && <Text style={styles.emptyText}>No rules set yet.</Text>}
      {rules.map((rule) => (
        <Text key={rule.id} style={styles.ruleText}>
          • {rule.rule_text}
        </Text>
      ))}
      {isStaff && (
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

      {/* RSVP for recurring wips */}
      {wip.type === 'recurring' && (
        <>
          <Text style={styles.sectionTitle}>Weekly RSVP</Text>
          {wip.contribution_amount == null && (
            <Text style={styles.emptyText}>
              Set a per-week amount when editing this wip to enable payment requests.
            </Text>
          )}
          {occurrences.map((occurrence) => {
            const myRsvp = myRsvps.find((r) => r.occurrence_id === occurrence.id);
            const pendingContribution = transactions.find(
              (t) => t.occurrence_id === occurrence.id && t.user_id === session.user.id && t.status === 'pending',
            );
            return (
              <View key={occurrence.id} style={styles.row}>
                <Text style={styles.rowText}>{occurrence.occurs_on}</Text>
                <View style={styles.rsvpButtons}>
                  <Pressable
                    style={[styles.rsvpButton, myRsvp?.status === 'in' && styles.rsvpButtonActiveIn]}
                    onPress={() => runAction(() => setRsvp(occurrence.id, 'in'))}
                  >
                    <Text style={styles.rsvpButtonText}>I'm in</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.rsvpButton, myRsvp?.status === 'out' && styles.rsvpButtonActiveOut]}
                    onPress={() => runAction(() => setRsvp(occurrence.id, 'out'))}
                  >
                    <Text style={styles.rsvpButtonText}>I'm out</Text>
                  </Pressable>
                </View>
                {pendingContribution && (
                  <Pressable
                    style={styles.smallButton}
                    onPress={() => runAction(() => payPendingContribution(pendingContribution.id))}
                  >
                    <Text style={styles.smallButtonText}>
                      Pay {formatPence(pendingContribution.amount)}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
          {isStaff && (
            <>
              {showAddOccurrence ? (
                <View style={styles.form}>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#64748b"
                    value={occurrenceDate}
                    onChangeText={setOccurrenceDate}
                  />
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
              ) : (
                <Pressable onPress={() => setShowAddOccurrence(true)}>
                  <Text style={styles.link}>+ Open this week's RSVP</Text>
                </Pressable>
              )}
            </>
          )}
        </>
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
                  {formatPence(request.amount)} — {request.description}
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
              {transaction.type === 'withdrawal' ? '-' : '+'}
              {formatPence(transaction.amount)} — {transaction.description}
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
                    `Reminder: please top up ${formatPence(transaction.amount)} for "${transaction.description}" — flagged as outside this wip's rules.`,
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
  balance: {
    color: Colors.secondary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  deadline: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 28,
    marginBottom: 10,
  },
  row: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
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
  ruleText: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 6,
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
    marginTop: 8,
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
