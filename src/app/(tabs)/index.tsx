import { Link } from 'expo-router';
import { CircleCheck, Info, Trophy, TriangleAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CardBadge } from '../../components/CardBadge';
import { CategoryIcon } from '../../components/CategoryIcon';
import { ConditionBadges } from '../../components/ConditionBadges';
import { Button, Card, Chip, Pill, ProgressBar, SectionTitle } from '../../components/ui';
import { CARDS, CATEGORIES, PROGRAMS, PROGRAM_LIST } from '../../data/catalog';
import { useAppStore } from '../../store/useAppStore';
import { colors, radius } from '../../theme';
import type { CategoryId, ProgramId } from '../../types';
import { todayISO } from '../../utils/date';
import {
  recommendCards,
  type CampaignEvaluation,
  type CardRecommendation,
} from '../../utils/decisionEngine';
import { formatPercent, formatTL, parseAmount } from '../../utils/format';

const QUICK_AMOUNTS = [250, 500, 750, 1000, 1500, 2500];

export default function KasadayimScreen() {
  const ownedCardIds = useAppStore((s) => s.ownedCardIds);
  const campaigns = useAppStore((s) => s.campaigns);
  const progress = useAppStore((s) => s.progress);
  const recordTransaction = useAppStore((s) => s.recordTransaction);

  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<CategoryId>('akaryakit');
  const [posProgramId, setPosProgramId] = useState<ProgramId | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const amount = parseAmount(amountText);
  const today = todayISO();
  const cards = useMemo(() => CARDS.filter((c) => ownedCardIds.includes(c.id)), [ownedCardIds]);

  const recommendations = useMemo(
    () =>
      amount > 0
        ? recommendCards({ amount, category, date: today, cards, campaigns, progress, posProgramId })
        : [],
    [amount, category, today, cards, campaigns, progress, posProgramId],
  );
  const best = recommendations[0];
  const hasWinner = !!best && best.totalEffectiveValue > 0;

  const payWith = (rec: CardRecommendation) => {
    const results = rec.evaluations
      .filter((e) => e.status === 'eligible')
      .map((e) => recordTransaction(e.campaign.id, amount, { date: today, posProgramId }));
    const applied = results.filter((r) => r.applied).length;
    const earned = results.reduce((s, r) => s + (r.applied ? (r.evaluation?.immediateReward ?? 0) : 0), 0);
    setFeedback(
      applied
        ? `${rec.card.name} ile ${formatTL(amount)} harcama ${applied} kampanya sayacına işlendi.` +
            (earned > 0 ? ` Hesabınıza geçecek puan: ${formatTL(earned)}.` : '')
        : 'Bu kartta harcamanın sayılacağı bir kampanya yok.',
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 14 }}>
          <Text style={styles.label}>Harcama Tutarı</Text>
          <View style={styles.amountRow}>
            <TextInput
              value={amountText}
              onChangeText={(t) => {
                setAmountText(t.replace(/[^\d.,]/g, ''));
                setFeedback(null);
              }}
              placeholder="0"
              placeholderTextColor="#C0C6D0"
              keyboardType="decimal-pad"
              inputMode="decimal"
              style={styles.amountInput}
              accessibilityLabel="Harcama tutarı"
            />
            <Text style={styles.currency}>TL</Text>
          </View>
          <View style={styles.wrap}>
            {QUICK_AMOUNTS.map((a) => (
              <Chip
                key={a}
                label={formatTL(a)}
                selected={amount === a}
                onPress={() => {
                  setAmountText(String(a));
                  setFeedback(null);
                }}
              />
            ))}
          </View>

          <Text style={styles.label}>Kategori</Text>
          <View style={styles.wrap}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                label={c.label}
                selected={category === c.id}
                onPress={() => {
                  setCategory(c.id);
                  setFeedback(null);
                }}
                icon={
                  <CategoryIcon
                    category={c.id}
                    color={category === c.id ? '#FFFFFF' : colors.textMuted}
                  />
                }
              />
            ))}
          </View>

          <Text style={styles.label}>Kasadaki POS hangi bankanın? (isteğe bağlı)</Text>
          <View style={styles.wrap}>
            <Chip label="Bilmiyorum" selected={posProgramId === null} onPress={() => setPosProgramId(null)} />
            {PROGRAM_LIST.map((p) => (
              <Chip
                key={p.id}
                label={p.bank}
                color={p.color}
                selected={posProgramId === p.id}
                onPress={() => setPosProgramId(p.id)}
              />
            ))}
          </View>
        </Card>

        {cards.length === 0 && (
          <Card style={{ gap: 10 }}>
            <Text style={styles.emptyTitle}>Cüzdanınızda kart yok</Text>
            <Text style={styles.muted}>Önerileri görebilmek için Cüzdan sekmesinden kartlarınızı seçin.</Text>
            <Link href="/cuzdan" style={styles.link}>Cüzdana git →</Link>
          </Card>
        )}

        {cards.length > 0 && amount === 0 && (
          <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Info color={colors.primary} size={20} />
            <Text style={[styles.muted, { flex: 1 }]}>
              Tutarı girin; cüzdanınızdaki {cards.length} kart, aktif kampanyalara göre en kârlıdan en aza sıralansın.
            </Text>
          </Card>
        )}

        {feedback && (
          <View style={styles.feedback}>
            <CircleCheck color={colors.success} size={18} />
            <Text style={styles.feedbackText}>{feedback}</Text>
          </View>
        )}

        {recommendations.length > 0 && (
          <>
            {hasWinner ? (
              <View style={[styles.winner, { backgroundColor: PROGRAMS[best.card.programId].color }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Trophy color="#FFFFFF" size={20} />
                  <Text style={styles.winnerKicker}>Bu harcamada kullanılacak kart</Text>
                </View>
                <Text style={styles.winnerTitle}>{best.card.name}</Text>
                <Text style={styles.winnerValue}>
                  ≈ {formatTL(best.totalEffectiveValue, true)} kazanç ({formatPercent(best.effectiveRate)})
                </Text>
                {best.totalImmediateReward > 0 && (
                  <Text style={styles.winnerSub}>
                    Hemen hesaba geçecek: {formatTL(best.totalImmediateReward, true)} {PROGRAMS[best.card.programId].pointName}
                  </Text>
                )}
              </View>
            ) : (
              <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TriangleAlert color={colors.warning} size={20} />
                <Text style={[styles.muted, { flex: 1 }]}>
                  Bu tutar ve kategoride kartlarınızda kazanç sağlayan aktif kampanya bulunamadı. Aşağıdaki ipuçlarına göz atın.
                </Text>
              </Card>
            )}

            <SectionTitle>Kart Sıralaması</SectionTitle>
            {recommendations.map((rec, i) => (
              <RecommendationCard
                key={rec.card.id}
                rank={i + 1}
                rec={rec}
                isBest={i === 0 && hasWinner}
                onPay={() => payWith(rec)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RecommendationCard({
  rec,
  rank,
  isBest,
  onPay,
}: {
  rec: CardRecommendation;
  rank: number;
  isBest: boolean;
  onPay: () => void;
}) {
  return (
    <Card style={[{ gap: 12 }, isBest && { borderColor: colors.success, borderWidth: 2 }]}>
      <View style={styles.recHeader}>
        <Text style={styles.rank}>{rank}</Text>
        <CardBadge programId={rec.card.programId} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{rec.card.name}</Text>
          <Text style={styles.muted}>
            {rec.evaluations.length
              ? `${rec.eligibleCount}/${rec.evaluations.length} kampanyaya uygun`
              : 'Bu kategoride aktif kampanya yok'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.value, rec.totalEffectiveValue === 0 && { color: colors.textMuted }]}>
            {formatTL(rec.totalEffectiveValue, true)}
          </Text>
          <Text style={styles.muted}>{formatPercent(rec.effectiveRate)} efektif</Text>
        </View>
      </View>

      {rec.evaluations.map((e) => (
        <EvaluationRow key={e.campaign.id} e={e} />
      ))}

      {rec.eligibleCount > 0 && (
        <Button
          label={isBest ? 'Bu kartla ödedim → sayaçlara işle' : 'Bu kartla ödedim'}
          variant={isBest ? 'primary' : 'secondary'}
          onPress={onPay}
        />
      )}
    </Card>
  );
}

const STATUS_LABEL = {
  eligible: { label: 'Uygun', tone: 'success' },
  belowMin: { label: 'Min. tutar altında', tone: 'warning' },
  blocked: { label: 'Sayılmaz', tone: 'danger' },
  exhausted: { label: 'Tamamlandı', tone: 'neutral' },
} as const;

function EvaluationRow({ e }: { e: CampaignEvaluation }) {
  const s = STATUS_LABEL[e.status];
  const pointName = PROGRAMS[e.campaign.programId].pointName;
  const tiered = e.campaign.rule.kind === 'tieredCount' || e.campaign.rule.kind === 'tieredAmount';
  return (
    <View style={styles.evalRow}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <Text style={[styles.evalTitle, { flex: 1 }]}>{e.campaign.title}</Text>
        <Pill label={s.label} tone={s.tone} />
      </View>

      {e.status === 'eligible' && (
        <Text style={styles.evalValue}>
          {tiered
            ? `İşlem başı efektif: ${formatTL(e.effectiveValue, true)}`
            : `+${formatTL(e.immediateReward, true)} ${pointName}`}
          {tiered && e.immediateReward > 0 ? ` · Şimdi: +${formatTL(e.immediateReward)}` : ''}
        </Text>
      )}

      {e.progressBefore && e.progressRatioBefore !== undefined && (e.progressRatioBefore > 0 || tiered) && (
        <View style={{ gap: 4 }}>
          <ProgressBar
            ratio={e.progressRatioBefore}
            previewRatio={e.status === 'eligible' ? e.progressRatioAfter : undefined}
            color={PROGRAMS[e.campaign.programId].color}
          />
          <Text style={styles.muted}>
            {e.progressBefore}
            {e.status === 'eligible' && e.progressAfter ? `  →  ${e.progressAfter}` : ''}
          </Text>
        </View>
      )}

      <ConditionBadges badges={e.badges} />

      {e.warnings.map((w) => (
        <Text key={w} style={[styles.small, { color: e.status === 'blocked' ? colors.danger : colors.warning }]}>
          ⚠ {w}
        </Text>
      ))}
      {e.hint && <Text style={[styles.small, { color: colors.primary }]}>💡 {e.hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, paddingBottom: 40, maxWidth: 760, width: '100%', alignSelf: 'center' },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    paddingVertical: 4,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  currency: { fontSize: 24, fontWeight: '700', color: colors.textMuted },
  muted: { fontSize: 13, color: colors.textMuted },
  small: { fontSize: 12, lineHeight: 17 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  link: { color: colors.primary, fontWeight: '700' },
  feedback: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: 12,
  },
  feedbackText: { flex: 1, color: colors.success, fontWeight: '600' },
  winner: { borderRadius: radius.lg, padding: 18, gap: 4 },
  winnerKicker: { color: '#FFFFFF', opacity: 0.9, fontWeight: '600' },
  winnerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  winnerValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  winnerSub: { color: '#FFFFFF', opacity: 0.9 },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { fontSize: 18, fontWeight: '800', color: colors.textMuted, width: 18 },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.text },
  value: { fontSize: 17, fontWeight: '800', color: colors.success },
  evalRow: {
    gap: 6,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  evalTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  evalValue: { fontSize: 13, fontWeight: '700', color: colors.success },
});
