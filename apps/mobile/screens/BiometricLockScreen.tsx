import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/theme';
import { unlockWithBiometrics } from '../lib/biometrics';

export function BiometricLockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(false);

  async function tryUnlock() {
    setChecking(true);
    setError(false);
    const success = await unlockWithBiometrics();
    setChecking(false);
    if (success) {
      onUnlocked();
    } else {
      setError(true);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>wipz</Text>
      <Text style={styles.subtitle}>Unlock to continue</Text>

      {checking ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <Pressable style={styles.button} onPress={tryUnlock}>
          <Text style={styles.buttonText}>Unlock</Text>
        </Pressable>
      )}

      {error && <Text style={styles.error}>Couldn't verify — try again.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 15,
    marginBottom: 32,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  error: {
    color: '#f87171',
    marginTop: 16,
  },
});
