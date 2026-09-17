import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/theme';

export function ProfileScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const [fullName, setFullName] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('full_name, whatsapp_phone')
      .eq('id', session.user.id)
      .single();
    setFullName(data?.full_name ?? '');
    setWhatsappPhone(data?.whatsapp_phone ?? '');
    setLoading(false);
  }, [session.user.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function saveWhatsappPhone() {
    setSavingPhone(true);
    const { error } = await supabase
      .from('users')
      .update({ whatsapp_phone: whatsappPhone.trim() || null })
      .eq('id', session.user.id);
    setSavingPhone(false);
    if (!error) setEditingPhone(false);
  }

  const initial = (fullName || session.user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack}>
        <Text style={styles.back}>{'< Back'}</Text>
      </Pressable>

      <View style={styles.avatar}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.avatarText}>{initial}</Text>}
      </View>

      <Text style={styles.title}>{fullName || 'Your profile'}</Text>
      <Text style={styles.email}>{session.user.email}</Text>

      <Text style={styles.sectionTitle}>Phone number</Text>
      <Text style={styles.sectionHint}>Lets other members add or invite you straight from their contacts.</Text>
      {editingPhone ? (
        <View style={styles.phoneRow}>
          <TextInput
            style={styles.phoneInput}
            placeholder="+447123456789"
            placeholderTextColor="#64748b"
            keyboardType="phone-pad"
            value={whatsappPhone}
            onChangeText={setWhatsappPhone}
          />
          <Pressable style={styles.phoneSaveButton} onPress={saveWhatsappPhone} disabled={savingPhone}>
            <Text style={styles.phoneSaveText}>{savingPhone ? '...' : 'Save'}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.phoneDisplayRow} onPress={() => setEditingPhone(true)}>
          <Text style={styles.phoneLink}>{whatsappPhone ? whatsappPhone : '+ Add your phone number'}</Text>
        </Pressable>
      )}

      <Pressable style={styles.signOut} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  back: {
    color: Colors.secondary,
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  email: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionHint: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  phoneDisplayRow: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 32,
  },
  phoneLink: {
    color: Colors.secondary,
    fontSize: 14,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
  },
  phoneSaveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  phoneSaveText: {
    color: '#fff',
    fontWeight: '600',
  },
  signOut: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: {
    color: '#f87171',
    fontWeight: '600',
  },
});
