import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Tables } from '../lib/database.types';
import { Colors } from '../constants/theme';
import { WIP_TYPES } from '../constants/wipTypes';
import { listMyPendingInvites, acceptWipInvite, type PendingInvite } from '../lib/invites';

type Whip = Tables<'whips'>;

function typeLabel(type: string) {
  return WIP_TYPES.find((option) => option.value === type)?.label ?? type;
}

function formatPence(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

export function HomeScreen({
  session,
  onCreateWhip,
  onOpenWip,
}: {
  session: Session;
  onCreateWhip: () => void;
  onOpenWip: (wipId: string) => void;
}) {
  const [whips, setWhips] = useState<Whip[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  const loadWhips = useCallback(async () => {
    const { data, error } = await supabase
      .from('whips')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setWhips(data);
  }, []);

  const loadProfile = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('whatsapp_phone')
      .eq('id', session.user.id)
      .single();
    setWhatsappPhone(data?.whatsapp_phone ?? '');
  }, [session.user.id]);

  const loadPendingInvites = useCallback(async () => {
    setPendingInvites(await listMyPendingInvites());
  }, []);

  useEffect(() => {
    loadWhips();
    loadProfile();
    loadPendingInvites();
  }, [loadWhips, loadProfile, loadPendingInvites]);

  async function saveWhatsappPhone() {
    setSavingPhone(true);
    const { error } = await supabase
      .from('users')
      .update({ whatsapp_phone: whatsappPhone.trim() || null })
      .eq('id', session.user.id);
    setSavingPhone(false);
    if (!error) {
      setEditingPhone(false);
      loadPendingInvites();
    }
  }

  async function joinPendingInvite(inviteId: string) {
    await acceptWipInvite(inviteId);
    await Promise.all([loadPendingInvites(), loadWhips()]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Your Wipz</Text>
          <Text style={styles.headerSubtitle}>{session.user.email}</Text>
        </View>
        <Pressable style={styles.addButton} onPress={onCreateWhip}>
          <Text style={styles.addButtonText}>+ New</Text>
        </Pressable>
      </View>

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
        <Pressable style={styles.phoneRow} onPress={() => setEditingPhone(true)}>
          <Text style={styles.phoneLink}>
            {whatsappPhone ? `WhatsApp: ${whatsappPhone}` : '+ Add your WhatsApp number for nudges'}
          </Text>
        </Pressable>
      )}

      {pendingInvites.length > 0 && (
        <View style={styles.invites}>
          <Text style={styles.invitesTitle}>Invites waiting for you</Text>
          {pendingInvites.map((invite) => (
            <View key={invite.id} style={styles.inviteRow}>
              <Text style={styles.rowText}>{invite.whip_title}</Text>
              <Pressable style={styles.addButton} onPress={() => joinPendingInvite(invite.id)}>
                <Text style={styles.addButtonText}>Join</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={whips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadWhips();
              setRefreshing(false);
            }}
            tintColor={Colors.secondary}
          />
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onOpenWip(item.id)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{typeLabel(item.type)}</Text>
              </View>
            </View>
            <Text style={styles.cardPurpose}>{item.purpose}</Text>
            <Text style={styles.cardBalance}>
              {formatPence(item.current_balance)} / {formatPence(item.target_balance)}
            </Text>
            {item.deadline && <Text style={styles.cardDeadline}>By {item.deadline}</Text>}
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No wipz yet — create your first one.</Text>}
      />

      <Pressable style={styles.signOut} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  phoneLink: {
    color: Colors.secondary,
    fontSize: 13,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
  },
  phoneSaveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  phoneSaveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  invites: {
    marginBottom: 16,
  },
  invitesTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  inviteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  rowText: {
    color: '#fff',
    fontSize: 14,
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  typeBadge: {
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    color: Colors.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  cardPurpose: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 2,
  },
  cardBalance: {
    color: Colors.secondary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
  cardDeadline: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  empty: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
  },
  signOut: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: '#64748b',
  },
});
