import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Tables } from '../lib/database.types';
import { Colors } from '../constants/theme';
import { WIP_TYPES, type WipType } from '../constants/wipTypes';
import { listMyPendingInvites, acceptWipInvite, type PendingInvite } from '../lib/invites';
import { TypeCarousel } from '../components/TypeCarousel';
import { HowItWorks } from '../components/HowItWorks';

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
  onOpenProfile,
}: {
  session: Session;
  onCreateWhip: (initialType?: WipType) => void;
  onOpenWip: (wipId: string) => void;
  onOpenProfile: () => void;
}) {
  const [whips, setWhips] = useState<Whip[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  const loadWhips = useCallback(async () => {
    const { data, error } = await supabase
      .from('whips')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setWhips(data);
  }, []);

  const loadPendingInvites = useCallback(async () => {
    setPendingInvites(await listMyPendingInvites());
  }, []);

  useEffect(() => {
    loadWhips();
    loadPendingInvites();
  }, [loadWhips, loadPendingInvites]);

  async function joinPendingInvite(inviteId: string) {
    await acceptWipInvite(inviteId);
    await Promise.all([loadPendingInvites(), loadWhips()]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Wipz</Text>
        <View style={styles.headerButtons}>
          <Pressable style={styles.addButton} onPress={() => onCreateWhip()}>
            <Text style={styles.addButtonText}>+ New</Text>
          </Pressable>
          <Pressable style={styles.profileButton} onPress={onOpenProfile}>
            <Text style={styles.profileButtonText}>
              {(session.user.email || '?').trim().charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        </View>
      </View>

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
        ListEmptyComponent={
          <View>
            <Text style={styles.emptyTitle}>Three ways to wipz</Text>
            <Text style={styles.emptyLead}>
              A wipz pot is a shared pot for your group, pre-funded and fully transparent. No more one
              person fronting it and chasing everyone else for money. Swipe to see the three types.
            </Text>
            <TypeCarousel onSelect={onCreateWhip} />
            <HowItWorks />
            <Pressable style={styles.emptyCreateButton} onPress={() => onCreateWhip()}>
              <Text style={styles.emptyCreateButtonText}>Create your first wipz pot</Text>
            </Pressable>
          </View>
        }
      />
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
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButtonText: {
    color: Colors.secondary,
    fontWeight: '700',
    fontSize: 15,
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
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyLead: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  emptyCreateButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  emptyCreateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
