import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/theme';
import { pickAndUploadAvatar } from '../lib/avatar';

export function ProfileScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const [fullName, setFullName] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('full_name, whatsapp_phone, avatar_url')
      .eq('id', session.user.id)
      .single();
    setFullName(data?.full_name ?? '');
    setWhatsappPhone(data?.whatsapp_phone ?? '');
    setAvatarUrl(data?.avatar_url ?? null);
    setLoading(false);
  }, [session.user.id]);

  async function changePhoto() {
    setUploadingPhoto(true);
    setError(null);
    try {
      const url = await pickAndUploadAvatar(session.user.id);
      if (url) setAvatarUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }

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

      <Pressable style={styles.avatar} onPress={changePhoto} disabled={uploadingPhoto}>
        {uploadingPhoto || loading ? (
          <ActivityIndicator color="#fff" />
        ) : avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{initial}</Text>
        )}
      </Pressable>
      <Pressable onPress={changePhoto} disabled={uploadingPhoto}>
        <Text style={styles.changePhotoLink}>{avatarUrl ? 'Change photo' : 'Add a photo'}</Text>
      </Pressable>

      <Text style={styles.title}>{fullName || 'Your profile'}</Text>
      <Text style={styles.email}>{session.user.email}</Text>

      {error && <Text style={styles.error}>{error}</Text>}

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
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  changePhotoLink: {
    color: Colors.secondary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  error: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
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
