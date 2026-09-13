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
import { Colors } from './constants/theme';
import { registerForPushNotifications } from './lib/pushNotifications';
import { isBiometricLockAvailable } from './lib/biometrics';

type Screen =
  | { name: 'home' }
  | { name: 'create' }
  | { name: 'detail'; wipId: string; startInEdit?: boolean };

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
        />
      )}
      {screen.name === 'home' && (
        <HomeScreen
          session={session}
          onCreateWhip={() => setScreen({ name: 'create' })}
          onOpenWip={(wipId) => setScreen({ name: 'detail', wipId })}
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
