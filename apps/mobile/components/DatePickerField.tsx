import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import RNDateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Colors } from '../constants/theme';

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function fromISODate(value: string) {
  return value ? new Date(`${value}T00:00:00`) : new Date();
}

export function DatePickerField({
  value,
  onChange,
  placeholder = 'Select a date',
  minimumDate,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: Date;
}) {
  const [showIOSPicker, setShowIOSPicker] = useState(false);

  function open() {
    const current = fromISODate(value);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        minimumDate,
        onValueChange: (_event, date) => {
          if (date) onChange(toISODate(date));
        },
      });
    } else {
      setShowIOSPicker(true);
    }
  }

  return (
    <>
      <Pressable style={styles.field} onPress={open}>
        <Text style={value ? styles.valueText : styles.placeholderText}>{value || placeholder}</Text>
      </Pressable>

      {Platform.OS === 'ios' && showIOSPicker && (
        <RNDateTimePicker
          value={fromISODate(value)}
          mode="date"
          display="inline"
          minimumDate={minimumDate}
          onValueChange={(_event, date) => {
            onChange(toISODate(date));
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
