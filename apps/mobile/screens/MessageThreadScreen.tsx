import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { listMessages, sendMessage, subscribeToMessages, type Message } from '../lib/messages';

export function MessageThreadScreen({
  conversationId,
  title,
  whipId,
  session,
  onBack,
  onOpenWip,
}: {
  conversationId: string;
  title: string;
  whipId?: string;
  session: Session;
  onBack: () => void;
  onOpenWip?: (wipId: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const loadSenderNames = useCallback(async (list: Message[]) => {
    const ids = [...new Set(list.map((m) => m.sender_id))];
    if (ids.length === 0) return;
    const { data } = await supabase.from('users').select('id, full_name').in('id', ids);
    if (data) {
      setSenderNames((current) => {
        const next = { ...current };
        for (const row of data) next[row.id] = row.full_name;
        return next;
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listMessages(conversationId);
        if (cancelled) return;
        setMessages(list);
        await loadSenderNames(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const unsubscribe = subscribeToMessages(conversationId, (message) => {
      setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));
      loadSenderNames([message]);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [conversationId, loadSenderNames]);

  async function handleSend() {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      setDraft('');
      await sendMessage(conversationId, body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>{'< Back'}</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        {whipId && onOpenWip && (
          <Pressable onPress={() => onOpenWip(whipId)}>
            <Text style={styles.viewGroupLink}>View group →</Text>
          </Pressable>
        )}

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loadingSpinner} />
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && <Text style={styles.emptyText}>No messages yet, say hello.</Text>}
            {messages.map((message) => {
              const isMe = message.sender_id === session.user.id;
              return (
                <View key={message.id} style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
                  <View style={[styles.bubble, isMe && styles.bubbleMe]}>
                    {!isMe && (
                      <Text style={styles.senderName}>{senderNames[message.sender_id] ?? '...'}</Text>
                    )}
                    <Text style={styles.bubbleText}>{message.body}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Message"
            placeholderTextColor="#64748b"
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Pressable style={styles.sendButton} disabled={sending} onPress={handleSend}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendButtonText}>Send</Text>}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  back: {
    color: Colors.secondary,
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  viewGroupLink: {
    color: Colors.secondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  loadingSpinner: {
    flex: 1,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: 12,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bubbleRowMe: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  senderName: {
    color: Colors.secondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  bubbleText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 19,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#f87171',
    marginBottom: 4,
  },
});
