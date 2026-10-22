import { CalendarDays, CircleCheck, Landmark, MessageSquare, Store } from 'lucide-react-native';
import { View } from 'react-native';

import { colors } from '../theme';
import type { Badge } from '../utils/decisionEngine';
import { Pill } from './ui';

const ICON = { differentDay: CalendarDays, bankPos: Landmark, join: MessageSquare, merchant: Store, completes: CircleCheck };

export function ConditionBadges({ badges }: { badges: Badge[] }) {
  if (!badges.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {badges.map((b) => {
        const Icon = ICON[b.kind];
        const tone = b.kind === 'completes' ? 'success' : b.violated ? 'danger' : b.kind === 'merchant' ? 'neutral' : 'warning';
        const color = { success: colors.success, danger: colors.danger, neutral: colors.textMuted, warning: colors.warning }[tone];
        return <Pill key={b.kind + b.label} label={b.label} tone={tone} icon={<Icon size={12} color={color} />} />;
      })}
    </View>
  );
}
