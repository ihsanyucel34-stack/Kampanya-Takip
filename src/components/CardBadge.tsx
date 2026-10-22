import { StyleSheet, Text, View } from 'react-native';

import { PROGRAMS } from '../data/catalog';
import type { ProgramId } from '../types';

/** Banka programının renginde küçük kart görseli. */
export function CardBadge({ programId, size = 'md' }: { programId: ProgramId; size?: 'sm' | 'md' }) {
  const p = PROGRAMS[programId];
  const small = size === 'sm';
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: p.color },
        small ? { width: 46, height: 30, borderRadius: 5 } : { width: 62, height: 40 },
      ]}
    >
      <Text style={[styles.text, { color: p.textColor, fontSize: small ? 8 : 10 }]} numberOfLines={1}>
        {p.shortName}
      </Text>
      <View style={[styles.chip, small && { width: 7, height: 5 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 6, padding: 4, justifyContent: 'space-between' },
  text: { fontWeight: '800' },
  chip: { width: 10, height: 7, borderRadius: 2, backgroundColor: '#F5D57A' },
});
