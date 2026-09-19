import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/theme';
import { listMyInbox, type InboxEntry } from '../lib/inbox';
import { getOrCreateDirectConversation, getOrCreateGroupConversation } from '../lib/messages';

function formatWhen(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function InboxScreen({
  onBack,
  onOpenThread,
}: {
  onBack: () => void;
  onOpenThread: (conversationId: string, title: string, whipId?: string) => void;
}) {
  const [entries, setEntries] = useState<InboxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEntries(await listMyInbox());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function open(entry: InboxEntry) {
    const key = `${entry.target_type}:${entry.target_id}`;
    setOpeningId(key);
    setError(null);
    try {
      const conversationId =
        entry.conversation_id ??
        (entry.target_type === 'group'
          ? await getOrCreateGroupConversation(entry.target_id)
          : await getOrCreateDirectConversation(entry.target_id));
      onOpenThread(conversationId, entry.title, entry.target_type === 'group' ? entry.target_id : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that conversation.');
    } finally {
      setOpeningId(null);
    }
  }

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
      <Text style={styles.title}>Messages</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {entries.length === 0 && (
        <Text style={styles.emptyText}>
          Nothing here yet, join a wip or add a friend to start a conversation.
        </Text>
      )}

      {entries.map((entry) => {
        const key = `${entry.target_type}:${entry.target_id}`;
        return (
          <Pressable
            key={key}
            style={styles.row}
            disabled={openingId === key}
            onPress={() => open(entry)}
          >
            <View style={styles.rowTop}>
              <Text style={styles.rowTitle}>
                {entry.target_type === 'group' ? '💬 ' : ''}
                {entry.title}
              </Text>
              {openingId === key ? (
                <ActivityIndicator color={Colors.secondary} size="small" />
              ) : (
                <Text style={styles.rowWhen}>{formatWhen(entry.last_message_at)}</Text>
              )}
            </View>
            <Text style={styles.rowPreview} numberOfLines={1}>
              {entry.last_message ?? 'No messages yet'}
            </Text>
          </Pressable>
        );
      })}
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
  row: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rowTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rowWhen: {
    color: '#64748b',
    fontSize: 11,
  },
  rowPreview: {
    color: '#94a3b8',
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
