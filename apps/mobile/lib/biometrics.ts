import * as LocalAuthentication from 'expo-local-authentication';

// Whether this device can even be asked to unlock with biometrics —
// used to decide whether to show the lock screen at all.
export async function isBiometricLockAvailable() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return isEnrolled;
}

export async function unlockWithBiometrics() {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Wipz',
    disableDeviceFallback: false,
  });
  return result.success;
}
