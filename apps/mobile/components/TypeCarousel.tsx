import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/theme';
import { WIP_TYPES, type WipType } from '../constants/wipTypes';

// Shown on the home screen before someone has any wips yet, so the three
// group types are explained visually before they've created one. Swipeable
// rather than stacked so it fits on screen without pushing everything else
// down, matching the same three photos used on wipzapp.com. Tapping a card
// (or its button) jumps straight into creating that type, pre-selected.
const CARD_WIDTH = Math.min(Dimensions.get('window').width - 64, 320);

export function TypeCarousel({ onSelect }: { onSelect: (type: WipType) => void }) {
  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_WIDTH + 12}
      decelerationRate="fast"
      contentContainerStyle={styles.scrollContent}
    >
      {WIP_TYPES.map((type) => (
        <Pressable
          key={type.value}
          style={[styles.card, { width: CARD_WIDTH }]}
          onPress={() => onSelect(type.value)}
        >
          <Image source={{ uri: type.image }} style={styles.image} />
          <View style={styles.overlay} />
          <View style={styles.body}>
            <Text style={styles.tag}>{type.label}</Text>
            <Text style={styles.hint}>{type.hint}</Text>
            <View style={styles.createButton}>
              <Text style={styles.createButtonText}>+ Create a {type.label.toLowerCase()} wip</Text>
            </View>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 12,
    paddingRight: 20,
  },
  card: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 15, 25, 0.55)',
  },
  body: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  tag: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  hint: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
  },
  createButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
});
