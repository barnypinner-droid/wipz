import { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/theme';
import { WIP_TYPES, type WipType } from '../constants/wipTypes';
import { DatePickerField } from '../components/DatePickerField';
import { DateTimePickerField } from '../components/DateTimePickerField';
import { pickContactPhone } from '../lib/contacts';
import { findUserByPhone, addMemberByUserId } from '../lib/members';
import { sendWipInvite, recordWipInvite, sendBulkSmsInvite, type ContactMethod } from '../lib/invites';

// A person picked before the wip exists: either a Wipz user we can add
// directly, or a phone number to invite once the wip has been created.
// contactMethod only applies to the invite case, it's how we'll reach them.
type PendingMember = {
  key: string;
  name: string;
  userId?: string;
  phone?: string;
  contactMethod?: ContactMethod;
};

export function CreateWhipScreen({
  session,
  onDone,
  onCancel,
}: {
  session: Session;
  onDone: (wipId: string) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<WipType>('ad_hoc');
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [personAmount, setPersonAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [showPaymentWindow, setShowPaymentWindow] = useState(false);
  const [activeFrom, setActiveFrom] = useState('');
  const [activeUntil, setActiveUntil] = useState('');
  const [rules, setRules] = useState<string[]>([]);
  const [ruleInput, setRuleInput] = useState('');
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedType = WIP_TYPES.find((option) => option.value === type)!;
  const peopleCount = pendingMembers.length + 1;
  const personPence = Math.round(parseFloat(personAmount) * 100);
  const totalPence = Number.isFinite(personPence) && personPence > 0 ? personPence * peopleCount : null;

  function addRuleToList() {
    const text = ruleInput.trim();
    if (!text) return;
    setRules((current) => [...current, text]);
    setRuleInput('');
  }

  function removeRuleFromList(index: number) {
    setRules((current) => current.filter((_, i) => i !== index));
  }

  async function addMemberFromContacts() {
    setAddingMember(true);
    try {
      const picked = await pickContactPhone();
      if (!picked) return;

      const existingUser = await findUserByPhone(picked.phone);
      setPendingMembers((current) => [
        ...current,
        {
          key: picked.phone,
          name: picked.name,
          userId: existingUser?.id,
          phone: existingUser ? undefined : picked.phone,
          contactMethod: existingUser ? undefined : 'sms',
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that contact.');
    } finally {
      setAddingMember(false);
    }
  }

  function removePendingMember(key: string) {
    setPendingMembers((current) => current.filter((m) => m.key !== key));
  }

  function setPendingMemberContactMethod(key: string, method: ContactMethod) {
    setPendingMembers((current) => current.map((m) => (m.key === key ? { ...m, contactMethod: method } : m)));
  }

  async function handleCreate() {
    if (!title.trim() || !purpose.trim() || !Number.isFinite(personPence) || personPence <= 0) {
      setError(`Fill in a title, purpose, and an ${selectedType.amountLabel.toLowerCase()} above £0.`);
      return;
    }

    if (pendingMembers.length === 0) {
      setError('Add at least one other person, every wipz pot needs more than one person in it.');
      return;
    }

    if (rules.length === 0) {
      setError('Add at least one rule so everyone agrees what the pot can be used for.');
      return;
    }

    if (type === 'savings_goal' && !deadline) {
      setError('Savings goals need a deadline.');
      return;
    }

    if (activeFrom && activeUntil && new Date(activeUntil) <= new Date(activeFrom)) {
      setError('The payment window needs to close after it opens.');
      return;
    }

    setLoading(true);
    setError(null);

    const { data: newWip, error: insertError } = await supabase
      .from('whips')
      .insert({
        type,
        title: title.trim(),
        purpose: purpose.trim(),
        active_from: activeFrom || null,
        active_until: activeUntil || null,
        target_balance: totalPence!,
        creator_id: session.user.id,
        deadline: type === 'savings_goal' ? deadline : null,
      })
      .select()
      .single();

    if (insertError || !newWip) {
      setLoading(false);
      setError(insertError?.message ?? 'Failed to create wip.');
      return;
    }

    if (rules.length > 0) {
      // Non-fatal: the wip already exists, so a rules failure shouldn't
      // strand the user, they can always add rules from the edit screen.
      const { error: rulesError } = await supabase
        .from('wip_rules')
        .insert(rules.map((rule_text) => ({ whip_id: newWip.id, rule_text })));
      if (rulesError) {
        console.log('Failed to save rules', rulesError);
      }
    }

    // Same non-fatal approach as rules: members picked before creation get
    // added now that the wip has an id, but a failure on any one of them
    // shouldn't strand the user, they can always add people afterward.
    // Everyone invited by text is recorded individually but sent as one
    // combined SMS compose below, rather than opening Messages once per
    // person, texters get combined; WhatsApp has no multi-recipient deep
    // link, so those still go out one at a time.
    const smsPhones: string[] = [];
    for (const member of pendingMembers) {
      try {
        if (member.userId) {
          await addMemberByUserId(newWip.id, member.userId);
        } else if (member.phone) {
          if (member.contactMethod === 'whatsapp') {
            await sendWipInvite(newWip.id, member.phone, title.trim(), session.user.id, 'whatsapp', member.name);
          } else {
            await recordWipInvite(newWip.id, member.phone, session.user.id, member.name);
            smsPhones.push(member.phone);
          }
        }
      } catch (err) {
        console.log('Failed to add member', member.name, err);
      }
    }
    if (smsPhones.length > 0) {
      try {
        await sendBulkSmsInvite(smsPhones, title.trim());
      } catch (err) {
        console.log('Failed to open bulk SMS invite', err);
      }
    }

    setLoading(false);
    onDone(newWip.id);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1566915541858-48b56240e292?w=1200&q=60&fm=jpg&fit=crop&auto=format' }}
        style={styles.flex}
      >
        <View style={styles.overlay} />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>New Wip</Text>

      <View style={styles.typeRow}>
        {WIP_TYPES.map((option) => (
          <Pressable
            key={option.value}
            style={[styles.typeOption, type === option.value && styles.typeOptionActive]}
            onPress={() => setType(option.value)}
          >
            <Text
              style={[styles.typeLabel, type === option.value && styles.typeLabelActive]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.typeHint}>{selectedType.hint}</Text>

      <View style={styles.featuresBox}>
        {selectedType.features.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder={selectedType.titlePlaceholder}
        placeholderTextColor="#64748b"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder={selectedType.purposePlaceholder}
        placeholderTextColor="#64748b"
        value={purpose}
        onChangeText={setPurpose}
      />
      <TextInput
        style={styles.input}
        placeholder={selectedType.amountLabel}
        placeholderTextColor="#64748b"
        keyboardType="decimal-pad"
        value={personAmount}
        onChangeText={setPersonAmount}
      />
      {totalPence != null && (
        <Text style={styles.totalHint}>
          £{(totalPence / 100).toFixed(2)} total pot, £{(personPence / 100).toFixed(2)} × {peopleCount}{' '}
          {peopleCount === 1 ? 'person' : 'people'}
        </Text>
      )}
      {type === 'savings_goal' && (
        <DatePickerField value={deadline} onChange={setDeadline} placeholder="Deadline" minimumDate={new Date()} />
      )}

      {showPaymentWindow ? (
        <View style={styles.paymentWindowBox}>
          <Text style={styles.sectionHint}>
            Only take payments and allow card spending in this window, e.g. Saturday night, 6:30pm to 11:30pm.
            Outside it, the card switches off automatically.
          </Text>
          <DateTimePickerField value={activeFrom} onChange={setActiveFrom} placeholder="Opens" minimumDate={new Date()} />
          <DateTimePickerField value={activeUntil} onChange={setActiveUntil} placeholder="Closes" minimumDate={new Date()} />
          <Pressable
            onPress={() => {
              setShowPaymentWindow(false);
              setActiveFrom('');
              setActiveUntil('');
            }}
          >
            <Text style={styles.removeLink}>Remove payment window</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setShowPaymentWindow(true)}>
          <Text style={styles.link}>+ Only allow payments in a set time window</Text>
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>Members</Text>
      <Text style={styles.sectionHint}>
        Every wipz pot needs at least one other person in it, add them from your contacts below.
      </Text>
      {pendingMembers.map((member) => (
        <View key={member.key} style={styles.memberPendingRow}>
          <View style={styles.ruleRow}>
            <Text style={styles.ruleText}>
              {member.name}
              {!member.userId && ' (will be invited)'}
            </Text>
            <Pressable onPress={() => removePendingMember(member.key)}>
              <Text style={styles.removeLink}>Remove</Text>
            </Pressable>
          </View>
          {!member.userId && (
            <View style={styles.contactMethodRow}>
              <Text style={styles.contactMethodLabel}>Contact by:</Text>
              <Pressable onPress={() => setPendingMemberContactMethod(member.key, 'sms')}>
                <Text
                  style={[
                    styles.contactMethodOption,
                    member.contactMethod === 'sms' && styles.contactMethodOptionActive,
                  ]}
                >
                  Text message
                </Text>
              </Pressable>
              <Pressable onPress={() => setPendingMemberContactMethod(member.key, 'whatsapp')}>
                <Text
                  style={[
                    styles.contactMethodOption,
                    member.contactMethod === 'whatsapp' && styles.contactMethodOptionActive,
                  ]}
                >
                  WhatsApp
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      ))}
      {pendingMembers.filter((m) => !m.userId && m.contactMethod === 'sms').length > 1 && (
        <Text style={styles.sectionHint}>
          Everyone you're texting gets combined into one message, so they'll see each other's numbers and share one
          reply thread.
        </Text>
      )}
      <Pressable style={styles.addContactButton} onPress={addMemberFromContacts} disabled={addingMember}>
        <Text style={styles.addContactButtonText}>
          {addingMember ? 'Opening contacts...' : '+ Add from contacts'}
        </Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Rules</Text>
      <Text style={styles.sectionHint}>
        Rules say what the pot's money can be used for, so everyone agrees upfront and there's no argument when it's
        spent. Every wip needs at least one. Example: "{selectedType.ruleExample}".
      </Text>
      {rules.map((rule, index) => (
        <View key={index} style={styles.ruleRow}>
          <Text style={styles.ruleText}>• {rule}</Text>
          <Pressable onPress={() => removeRuleFromList(index)}>
            <Text style={styles.removeLink}>Remove</Text>
          </Pressable>
        </View>
      ))}
      <View style={styles.ruleInputRow}>
        <TextInput
          style={[styles.input, styles.ruleInput]}
          placeholder={`e.g. ${selectedType.ruleExample}`}
          placeholderTextColor="#64748b"
          value={ruleInput}
          onChangeText={setRuleInput}
          onSubmitEditing={addRuleToList}
        />
        <Pressable style={styles.addRuleButton} onPress={addRuleToList}>
          <Text style={styles.addRuleButtonText}>Add</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={handleCreate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create</Text>}
      </Pressable>

      <Pressable onPress={onCancel} disabled={loading}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 15, 25, 0.88)',
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  featuresBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  featureCheck: {
    color: Colors.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  featureText: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  typeOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  typeLabelActive: {
    color: '#fff',
  },
  typeHint: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  totalHint: {
    color: Colors.secondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: -6,
    marginBottom: 14,
  },
  sectionHint: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  memberPendingRow: {
    marginBottom: 4,
  },
  contactMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: -4,
    marginBottom: 8,
  },
  contactMethodLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  contactMethodOption: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  contactMethodOptionActive: {
    color: '#fff',
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  ruleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleText: {
    color: '#94a3b8',
    fontSize: 14,
    flex: 1,
  },
  removeLink: {
    color: '#f87171',
    fontSize: 12,
  },
  addContactButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  addContactButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  link: {
    color: Colors.secondary,
    fontSize: 14,
    marginBottom: 20,
  },
  paymentWindowBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  ruleInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  ruleInput: {
    flex: 1,
  },
  addRuleButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addRuleButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
  },
  error: {
    color: '#f87171',
    marginBottom: 8,
    textAlign: 'center',
  },
});
