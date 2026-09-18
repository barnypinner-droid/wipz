import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/theme';

const DAYS: Array<{ value: string; label: string }> = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

export function dayLabel(value: string | null) {
  return DAYS.find((d) => d.value === value)?.label ?? value ?? '';
}

export function DayOfWeekPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.row}>
      {DAYS.map((day) => (
        <Pressable
          key={day.value}
          style={[styles.chip, value === day.value && styles.chipActive]}
          onPress={() => onChange(day.value)}
        >
          <Text style={[styles.chipText, value === day.value && styles.chipTextActive]}>{day.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
});
