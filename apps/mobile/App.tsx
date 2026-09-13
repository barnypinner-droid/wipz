import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './screens/AuthScreen';
import { HomeScreen } from './screens/HomeScreen';
import { CreateWhipScreen } from './screens/CreateWhipScreen';
import { WipDetailScreen } from './screens/WipDetailScreen';
import { Colors } from './constants/theme';

type Screen = { name: 'home' } | { name: 'create' } | { name: 'detail'; wipId: string };

export default function App() {
  const { session, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  if (loading) {
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

  return (
    <>
      {screen.name === 'create' && (
        <CreateWhipScreen
          session={session}
          onDone={() => setScreen({ name: 'home' })}
          onCancel={() => setScreen({ name: 'home' })}
        />
      )}
      {screen.name === 'detail' && (
        <WipDetailScreen
          wipId={screen.wipId}
          session={session}
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

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: Colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
