import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/theme';

// Shown alongside the type carousel on an empty home screen. Someone who
// installed the app directly (not via the website) has never seen this
// explained anywhere, so it can't assume any context.
const STEPS = [
  'Create a wipz pot, set its type, purpose, and rules.',
  'Invite your group from your phone contacts, by link, or straight to their phone.',
  'Everyone pays in, the pot fills live for the whole group to see.',
  'Spend transparently: every withdrawal is logged, reasoned, and visible.',
];

export function HowItWorks() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>How it works</Text>
      {STEPS.map((step, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.number}>
            <Text style={styles.numberText}>{index + 1}</Text>
          </View>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  number: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  numberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
});
