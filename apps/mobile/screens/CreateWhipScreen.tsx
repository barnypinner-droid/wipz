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

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function CreateWhipScreen({
  session,
  onDone,
  onCancel,
}: {
  session: Session;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<WipType>('ad_hoc');
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const targetPence = Math.round(parseFloat(targetAmount) * 100);

    if (!title.trim() || !purpose.trim() || !Number.isFinite(targetPence) || targetPence <= 0) {
      setError('Fill in a title, purpose, and a target amount above £0.');
      return;
    }

    if (type === 'savings_goal' && !DATE_PATTERN.test(deadline)) {
      setError('Savings goals need a deadline in YYYY-MM-DD format.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from('whips').insert({
      type,
      title: title.trim(),
      purpose: purpose.trim(),
      target_balance: targetPence,
      creator_id: session.user.id,
      deadline: type === 'savings_goal' ? deadline : null,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
    } else {
      onDone();
    }
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
        placeholder="Title (e.g. Five-a-side)"
        placeholderTextColor="#64748b"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder="Purpose (e.g. Weekly pitch hire)"
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
        <TextInput
          style={styles.input}
          placeholder="Deadline (YYYY-MM-DD)"
          placeholderTextColor="#64748b"
          value={deadline}
          onChangeText={setDeadline}
        />
      )}

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
