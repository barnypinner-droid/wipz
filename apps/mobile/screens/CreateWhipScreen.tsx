import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { pickContactPhone } from '../lib/contacts';
import { findUserByPhone, addMemberByUserId } from '../lib/members';
import { sendWipInvite } from '../lib/invites';

// A person picked before the wip exists: either a Wipz user we can add
// directly, or a phone number to invite once the wip has been created.
type PendingMember = { key: string; name: string; userId?: string; phone?: string };

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
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [rules, setRules] = useState<string[]>([]);
  const [ruleInput, setRuleInput] = useState('');
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleCreate() {
    const targetPence = Math.round(parseFloat(targetAmount) * 100);

    if (!title.trim() || !purpose.trim() || !Number.isFinite(targetPence) || targetPence <= 0) {
      setError('Fill in a title, purpose, and a target amount above £0.');
      return;
    }

    if (type === 'savings_goal' && !deadline) {
      setError('Savings goals need a deadline.');
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
        target_balance: targetPence,
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
    for (const member of pendingMembers) {
      try {
        if (member.userId) {
          await addMemberByUserId(newWip.id, member.userId);
        } else if (member.phone) {
          await sendWipInvite(newWip.id, member.phone, title.trim(), session.user.id);
        }
      } catch (err) {
        console.log('Failed to add member', member.name, err);
      }
    }

    setLoading(false);
    onDone(newWip.id);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
      <Text style={styles.typeHint}>{WIP_TYPES.find((option) => option.value === type)?.hint}</Text>

      <TextInput
        style={styles.input}
        placeholder={WIP_TYPES.find((option) => option.value === type)?.titlePlaceholder}
        placeholderTextColor="#64748b"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder={WIP_TYPES.find((option) => option.value === type)?.purposePlaceholder}
        placeholderTextColor="#64748b"
        value={purpose}
        onChangeText={setPurpose}
      />
      <TextInput
        style={styles.input}
        placeholder="Target amount (£)"
        placeholderTextColor="#64748b"
        keyboardType="decimal-pad"
        value={targetAmount}
        onChangeText={setTargetAmount}
      />
      {type === 'savings_goal' && (
        <DatePickerField value={deadline} onChange={setDeadline} placeholder="Deadline" minimumDate={new Date()} />
      )}

      <Text style={styles.sectionTitle}>Members (optional)</Text>
      {pendingMembers.map((member) => (
        <View key={member.key} style={styles.ruleRow}>
          <Text style={styles.ruleText}>
            {member.name}
            {!member.userId && ' (will be invited)'}
          </Text>
          <Pressable onPress={() => removePendingMember(member.key)}>
            <Text style={styles.removeLink}>Remove</Text>
          </Pressable>
        </View>
      ))}
      <Pressable onPress={addMemberFromContacts} disabled={addingMember}>
        <Text style={styles.addMemberLink}>
          {addingMember ? 'Opening contacts...' : '+ Add from contacts'}
        </Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Rules (optional)</Text>
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
          placeholder="e.g. Only pitch hire comes out of this pot"
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
    justifyContent: 'center',
    paddingHorizontal: 24,
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
  addMemberLink: {
    color: Colors.secondary,
    fontSize: 14,
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
