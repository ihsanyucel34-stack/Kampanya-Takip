import { router } from 'expo-router';
import { Check, Plus, RotateCcw, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CardBadge } from '../../components/CardBadge';
import { CategoryIcon } from '../../components/CategoryIcon';
import { ConditionBadges } from '../../components/ConditionBadges';
import { Button, Card, Chip, Pill, SectionTitle } from '../../components/ui';
import { CARDS, CATEGORIES, PROGRAMS, categoryLabel } from '../../data/catalog';
import { useAppStore } from '../../store/useAppStore';
import { colors, radius } from '../../theme';
import type { Campaign, CategoryId } from '../../types';
import { diffDays, formatDateTR, todayISO } from '../../utils/date';
import type { Badge } from '../../utils/decisionEngine';
import { describeRule } from '../../utils/describeRule';
import { formatTL } from '../../utils/format';

export default function CuzdanScreen() {
  const ownedCardIds = useAppStore((s) => s.ownedCardIds);
  const campaigns = useAppStore((s) => s.campaigns);
  const progress = useAppStore((s) => s.progress);
  const toggleCard = useAppStore((s) => s.toggleCard);
  const joinCampaign = useAppStore((s) => s.joinCampaign);
  const leaveCampaign = useAppStore((s) => s.leaveCampaign);
  const removeCampaign = useAppStore((s) => s.removeCampaign);
  const resetDemoData = useAppStore((s) => s.resetDemoData);

  const [filter, setFilter] = useState<CategoryId | 'all'>('all');
  const [confirmReset, setConfirmReset] = useState(false);
  const today = todayISO();

  const ownedPrograms = useMemo(
    () => new Set(CARDS.filter((c) => ownedCardIds.includes(c.id)).map((c) => c.programId)),
    [ownedCardIds],
  );

  const visibleCampaigns = campaigns
    .filter((c) => ownedPrograms.has(c.programId) && c.endDate >= today)
    .filter((c) => filter === 'all' || c.categories.includes(filter));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SectionTitle right={<Text style={styles.muted}>{ownedCardIds.length} kart seçili</Text>}>
        Kartlarım
      </SectionTitle>
      <Card style={{ gap: 4, padding: 8 }}>
        {CARDS.map((card) => {
          const owned = ownedCardIds.includes(card.id);
          const p = PROGRAMS[card.programId];
          return (
            <Pressable
              key={card.id}
              onPress={() => toggleCard(card.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: owned }}
              style={({ pressed }) => [styles.cardRow, pressed && { backgroundColor: colors.surfaceMuted }]}
            >
              <CardBadge programId={card.programId} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{card.name}</Text>
                <Text style={styles.muted}>
                  {p.bank} · {p.name} · {card.network}
                </Text>
              </View>
              <View style={[styles.check, owned && { backgroundColor: colors.success, borderColor: colors.success }]}>
                {owned && <Check color="#FFFFFF" size={16} />}
              </View>
            </Pressable>
          );
        })}
      </Card>

      <SectionTitle>Kampanyalar</SectionTitle>
      <Button
        label="Yeni Kampanya Ekle"
        icon={<Plus color="#FFFFFF" size={18} />}
        onPress={() => router.push('/kampanya-ekle')}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="Tümü" selected={filter === 'all'} onPress={() => setFilter('all')} />
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={c.label}
            selected={filter === c.id}
            onPress={() => setFilter(c.id)}
            icon={<CategoryIcon category={c.id} color={filter === c.id ? '#FFFFFF' : colors.textMuted} />}
          />
        ))}
      </ScrollView>

      {visibleCampaigns.length === 0 && (
        <Card>
          <Text style={styles.muted}>
            Seçili kartlarınız için bu kategoride aktif kampanya yok. Yeni kampanya ekleyebilirsiniz.
          </Text>
        </Card>
      )}

      {visibleCampaigns.map((c) => {
        const joined = !!progress[c.id]?.joined;
        const p = PROGRAMS[c.programId];
        const daysLeft = diffDays(today, c.endDate);
        const badges: Badge[] = [];
        if (c.differentDayRequired) badges.push({ kind: 'differentDay', label: 'Farklı gün şartı' });
        if (c.bankPosRequired) badges.push({ kind: 'bankPos', label: `${p.bank} POS şartı` });
        if (c.merchants?.length) badges.push({ kind: 'merchant', label: c.merchants.join(', ') });
        return (
          <Card key={c.id} style={{ gap: 8 }}>
            <View style={styles.headerRow}>
              <CardBadge programId={c.programId} size="sm" />
              <Text style={[styles.title, { flex: 1 }]}>{c.title}</Text>
              {c.isCustom && <Pill label="Manuel" tone="primary" />}
            </View>
            <Text style={styles.desc}>{c.description}</Text>
            <View style={styles.wrap}>
              <Pill tone="success" label={describeRule(c)} />
              <Pill label={`Min. ${formatTL(c.minAmount)}`} />
              {c.categories.map((cat) => (
                <Pill key={cat} label={categoryLabel(cat)} />
              ))}
            </View>
            <ConditionBadges badges={badges} />
            <Text style={styles.muted}>
              Son gün {formatDateTR(c.endDate)} ({daysLeft} gün) · Puan geçerliliği {c.pointValidityDays} gün
            </Text>
            {c.requiresJoin && c.joinInfo && !joined && (
              <Text style={[styles.muted, { color: colors.warning }]}>Katılım: {c.joinInfo}</Text>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                label={joined ? 'Takipte ✓' : c.requiresJoin ? 'Katıldım, takip et' : 'Takibe al'}
                variant={joined ? 'secondary' : 'primary'}
                onPress={() => (joined ? leaveCampaign(c.id) : joinCampaign(c.id))}
                style={{ flex: 1, paddingVertical: 10 }}
              />
              {c.isCustom && (
                <Button
                  label="Sil"
                  variant="danger"
                  icon={<Trash2 color={colors.danger} size={16} />}
                  onPress={() => removeCampaign(c.id)}
                  style={{ paddingVertical: 10 }}
                />
              )}
            </View>
          </Card>
        );
      })}

      <SectionTitle>Veri</SectionTitle>
      {confirmReset ? (
        <Card style={{ gap: 10 }}>
          <Text style={styles.desc}>
            Tüm kart seçimleri, eklediğiniz kampanyalar ve sayaçlar silinip demo verisi yeniden yüklenecek.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Vazgeç" variant="ghost" onPress={() => setConfirmReset(false)} style={{ flex: 1 }} />
            <Button
              label="Sıfırla"
              variant="danger"
              onPress={() => {
                resetDemoData();
                setConfirmReset(false);
              }}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      ) : (
        <Button
          label="Demo verisini sıfırla"
          variant="ghost"
          icon={<RotateCcw color={colors.textMuted} size={16} />}
          onPress={() => setConfirmReset(true)}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 40, maxWidth: 760, width: '100%', alignSelf: 'center' },
  muted: { fontSize: 12, color: colors.textMuted },
  desc: { fontSize: 13, color: colors.text, lineHeight: 19 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: radius.md },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.text },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
});
