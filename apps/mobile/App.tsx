import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useFonts, Anton_400Regular } from '@expo-google-fonts/anton';
import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './screens/AuthScreen';
import { HomeScreen } from './screens/HomeScreen';
import { CreateWhipScreen } from './screens/CreateWhipScreen';
import { WipDetailScreen } from './screens/WipDetailScreen';
import { BiometricLockScreen } from './screens/BiometricLockScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { FriendsScreen } from './screens/FriendsScreen';
import { MessageThreadScreen } from './screens/MessageThreadScreen';
import { Colors } from './constants/theme';
import { registerForPushNotifications } from './lib/pushNotifications';
import { isBiometricLockAvailable } from './lib/biometrics';
import { getOrCreateDirectConversation } from './lib/messages';
import type { WipType } from './constants/wipTypes';
import type { Friend } from './lib/friends';

type Screen =
  | { name: 'home' }
  | { name: 'create'; initialType?: WipType }
  | { name: 'detail'; wipId: string; startInEdit?: boolean }
  | { name: 'profile' }
  | { name: 'friends' }
  | { name: 'thread'; conversationId: string; title: string };

function AppContent() {
  const { session, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [locked, setLocked] = useState<boolean | null>(null); // null = still checking
  const [fontsLoaded] = useFonts({ Anton_400Regular });

  useEffect(() => {
    if (session) {
      registerForPushNotifications(session.user.id).catch((err) =>
        console.log('Push registration failed', err),
      );
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      setLocked(null);
      return;
    }
    isBiometricLockAvailable().then((available) => setLocked(available));
  }, [session]);

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
        <StatusBar style="light" />
      </View>
    );
  }

  if (!session) {
    return (
      <>
        <AuthScreen />
        <StatusBar style="light" />
      </>
    );
  }

  if (locked === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
        <StatusBar style="light" />
      </View>
    );
  }

  if (locked) {
    return (
      <>
        <BiometricLockScreen onUnlocked={() => setLocked(false)} />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <>
      {screen.name === 'create' && (
        <CreateWhipScreen
          session={session}
          initialType={screen.initialType}
          onDone={(wipId) => setScreen({ name: 'detail', wipId, startInEdit: true })}
          onCancel={() => setScreen({ name: 'home' })}
        />
      )}
      {screen.name === 'detail' && (
        <WipDetailScreen
          wipId={screen.wipId}
          session={session}
          startInEdit={screen.startInEdit}
          onBack={() => setScreen({ name: 'home' })}
          onOpenThread={(conversationId, title) => setScreen({ name: 'thread', conversationId, title })}
        />
      )}
      {screen.name === 'profile' && (
        <ProfileScreen session={session} onBack={() => setScreen({ name: 'home' })} />
      )}
      {screen.name === 'friends' && (
        <FriendsScreen
          onBack={() => setScreen({ name: 'home' })}
          onMessageFriend={async (friend: Friend) => {
            try {
              const conversationId = await getOrCreateDirectConversation(friend.user_id);
              setScreen({ name: 'thread', conversationId, title: friend.full_name });
            } catch (err) {
              console.log('Failed to open conversation', err);
            }
          }}
        />
      )}
      {screen.name === 'thread' && (
        <MessageThreadScreen
          conversationId={screen.conversationId}
          title={screen.title}
          session={session}
          onBack={() => setScreen({ name: 'home' })}
        />
      )}
      {screen.name === 'home' && (
        <HomeScreen
          session={session}
          onCreateWhip={(initialType) => setScreen({ name: 'create', initialType })}
          onOpenWip={(wipId) => setScreen({ name: 'detail', wipId })}
          onOpenProfile={() => setScreen({ name: 'profile' })}
          onOpenFriends={() => setScreen({ name: 'friends' })}
        />
      )}
      <StatusBar style="light" />
    </>
  );
}

export default function App() {
  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
      urlScheme="wipz"
      merchantIdentifier="merchant.com.wipzapp.wipz"
    >
      <AppContent />
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: Colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
