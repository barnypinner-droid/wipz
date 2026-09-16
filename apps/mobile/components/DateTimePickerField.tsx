import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import RNDateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Colors } from '../constants/theme';

function formatDisplay(date: Date) {
  return date.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Same picker as DatePickerField, but for a specific moment (date + time)
// rather than just a date, used for a wip's payment window (e.g. "Saturday
// night, 6:30pm to 11:30pm"). Value is a full ISO datetime string.
export function DateTimePickerField({
  value,
  onChange,
  placeholder = 'Select date and time',
  minimumDate,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: Date;
}) {
  const [showIOSDatePicker, setShowIOSDatePicker] = useState(false);
  const [showIOSTimePicker, setShowIOSTimePicker] = useState(false);
  const [draftDate, setDraftDate] = useState<Date | null>(null);

  const current = value ? new Date(value) : new Date();

  function openAndroid() {
    DateTimePickerAndroid.open({
      value: current,
      mode: 'date',
      minimumDate,
      onValueChange: (_event, pickedDate) => {
        if (!pickedDate) return;
        DateTimePickerAndroid.open({
          value: pickedDate,
          mode: 'time',
          onValueChange: (_timeEvent, pickedTime) => {
            if (!pickedTime) return;
            const merged = new Date(pickedDate);
            merged.setHours(pickedTime.getHours(), pickedTime.getMinutes());
            onChange(merged.toISOString());
          },
        });
      },
    });
  }

  function openIOS() {
    setDraftDate(current);
    setShowIOSDatePicker(true);
  }

  return (
    <>
      <Pressable style={styles.field} onPress={Platform.OS === 'android' ? openAndroid : openIOS}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value ? formatDisplay(current) : placeholder}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' && showIOSDatePicker && (
        <RNDateTimePicker
          value={draftDate ?? current}
          mode="date"
          display="inline"
          minimumDate={minimumDate}
          onValueChange={(_event, pickedDate) => {
            if (pickedDate) setDraftDate(pickedDate);
            setShowIOSDatePicker(false);
            setShowIOSTimePicker(true);
          }}
          onDismiss={() => setShowIOSDatePicker(false)}
        />
      )}

      {Platform.OS === 'ios' && showIOSTimePicker && (
        <RNDateTimePicker
          value={draftDate ?? current}
          mode="time"
          display="spinner"
          onValueChange={(_event, pickedTime) => {
            if (pickedTime && draftDate) {
              const merged = new Date(draftDate);
              merged.setHours(pickedTime.getHours(), pickedTime.getMinutes());
              onChange(merged.toISOString());
            }
            setShowIOSTimePicker(false);
          }}
          onDismiss={() => setShowIOSTimePicker(false)}
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
