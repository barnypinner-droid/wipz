import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import RNDateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Colors } from '../constants/theme';

// Value is "HH:MM" (24h), matching a Postgres `time` column.
function toDate(value: string) {
  const [hours, minutes] = value ? value.split(':').map(Number) : [19, 0];
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function toHHMM(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDisplay(value: string) {
  const date = toDate(value);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function TimePickerField({
  value,
  onChange,
  placeholder = 'Select a time',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [showIOSPicker, setShowIOSPicker] = useState(false);

  function open() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(value),
        mode: 'time',
        is24Hour: false,
        onValueChange: (_event, date) => {
          if (date) onChange(toHHMM(date));
        },
      });
    } else {
      setShowIOSPicker(true);
    }
  }

  return (
    <>
      <Pressable style={styles.field} onPress={open}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' && showIOSPicker && (
        <RNDateTimePicker
          value={toDate(value)}
          mode="time"
          display="spinner"
          onValueChange={(_event, date) => {
            if (date) onChange(toHHMM(date));
            setShowIOSPicker(false);
          }}
          onDismiss={() => setShowIOSPicker(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  valueText: {
    color: '#fff',
  },
  placeholderText: {
    color: '#64748b',
  },
});
