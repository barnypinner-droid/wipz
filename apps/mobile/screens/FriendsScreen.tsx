import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors } from '../constants/theme';
import { listMyFriends, sendFriendRequest, respondFriendRequest, removeFriend, type Friend } from '../lib/friends';
import { findUserByPhone } from '../lib/members';
import { pickContactPhone } from '../lib/contacts';
import { supabase } from '../lib/supabase';

export function FriendsScreen({
  onBack,
  onMessageFriend,
}: {
  onBack: () => void;
  onMessageFriend: (friend: Friend) => void;
}) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [addingFromContacts, setAddingFromContacts] = useState(false);

  const load = useCallback(async () => {
    try {
      setFriends(await listMyFriends());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load friends.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: () => Promise<void>) {
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  async function addByEmail() {
    const email = emailInput.trim();
    if (!email) return;
    setSearching(true);
    setError(null);
    try {
      const { data, error: lookupError } = await supabase.rpc('find_user_by_email', { p_email: email });
      if (lookupError) throw lookupError;
      if (!data || data.length === 0) {
        throw new Error('No Wipz user found with that email.');
      }
      await sendFriendRequest(data[0].id);
      setEmailInput('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that friend request.');
    } finally {
      setSearching(false);
    }
  }

  async function addFromContacts() {
    setAddingFromContacts(true);
    setError(null);
    try {
      const picked = await pickContactPhone();
      if (!picked) return;
      const match = await findUserByPhone(picked.phone);
      if (!match) {
        throw new Error(`${picked.name} isn't on Wipz yet.`);
      }
      await sendFriendRequest(match.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that friend request.');
    } finally {
      setAddingFromContacts(false);
    }
  }

  const incomingRequests = friends.filter((f) => f.status === 'pending' && !f.i_am_requester);
  const sentRequests = friends.filter((f) => f.status === 'pending' && f.i_am_requester);
  const accepted = friends.filter((f) => f.status === 'accepted');

  if (loading) {
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
      <Text style={styles.title}>Friends</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.sectionTitle}>Add a friend</Text>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Their email"
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          keyboardType="email-address"
          value={emailInput}
          onChangeText={setEmailInput}
        />
        <Pressable style={styles.smallButton} disabled={searching} onPress={addByEmail}>
          {searching ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.smallButtonText}>Send request</Text>}
        </Pressable>
      </View>
      <Pressable style={styles.smallButton} disabled={addingFromContacts} onPress={addFromContacts}>
        <Text style={styles.smallButtonText}>
          {addingFromContacts ? 'Opening contacts...' : '+ Add from contacts'}
        </Text>
      </Pressable>

      {incomingRequests.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Requests</Text>
          {incomingRequests.map((friend) => (
            <View key={friend.friendship_id} style={styles.row}>
              <Text style={styles.rowText}>{friend.full_name}</Text>
              <View style={styles.rowButtons}>
                <Pressable
                  style={styles.smallButton}
                  onPress={() => run(() => respondFriendRequest(friend.friendship_id, true))}
                >
                  <Text style={styles.smallButtonText}>Accept</Text>
                </Pressable>
                <Pressable
                  style={styles.declineButton}
                  onPress={() => run(() => respondFriendRequest(friend.friendship_id, false))}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>Your friends</Text>
      {accepted.length === 0 && <Text style={styles.emptyText}>No friends yet, add one above.</Text>}
      {accepted.map((friend) => (
        <View key={friend.friendship_id} style={styles.row}>
          <Text style={styles.rowText}>{friend.full_name}</Text>
          <View style={styles.rowButtons}>
            <Pressable style={styles.smallButton} onPress={() => onMessageFriend(friend)}>
              <Text style={styles.smallButtonText}>Message</Text>
            </Pressable>
            <Pressable style={styles.declineButton} onPress={() => run(() => removeFriend(friend.user_id))}>
              <Text style={styles.declineButtonText}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {sentRequests.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Waiting on them</Text>
          {sentRequests.map((friend) => (
            <View key={friend.friendship_id} style={styles.row}>
              <Text style={styles.rowText}>{friend.full_name}</Text>
              <Text style={styles.rowMeta}>Request sent</Text>
            </View>
          ))}
        </>
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
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 10,
  },
  form: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
  },
  smallButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  smallButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  declineButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  declineButtonText: {
    color: '#f87171',
    fontWeight: '600',
    fontSize: 13,
  },
  row: {
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
  rowButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rowText: {
    color: '#fff',
    fontSize: 14,
  },
  rowMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
  error: {
    color: '#f87171',
    marginBottom: 12,
  },
});
