import { Link } from 'expo-router';
import { CalendarDays, Clock, Plus, RotateCcw, TriangleAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CardBadge } from '../../components/CardBadge';
import { ConditionBadges } from '../../components/ConditionBadges';
import { Button, Card, Pill, ProgressBar, SectionTitle } from '../../components/ui';
import { PROGRAMS } from '../../data/catalog';
import { useAppStore } from '../../store/useAppStore';
import { colors, radius } from '../../theme';
import type { Campaign, CampaignProgress, ProgramId } from '../../types';
import { diffDays, formatDateTR, todayISO } from '../../utils/date';
import {
  describeProgress,
  hasTransactionOn,
  isCampaignCompleted,
  type Badge,
} from '../../utils/decisionEngine';
import { formatTL, parseAmount } from '../../utils/format';

interface Tracked {
  campaign: Campaign;
  progress: CampaignProgress;
}

export default function SayaclarimScreen() {
  const campaigns = useAppStore((s) => s.campaigns);
  const progress = useAppStore((s) => s.progress);
  const today = todayISO();

  const tracked = useMemo<Tracked[]>(
    () =>
      campaigns
        .filter((c) => progress[c.id]?.joined)
        .map((c) => ({ campaign: c, progress: progress[c.id] })),
    [campaigns, progress],
  );

  const active = tracked.filter(
    (t) => !isCampaignCompleted(t.campaign, t.progress) && t.campaign.endDate >= today,
  );
  const finished = tracked.filter(
    (t) => isCampaignCompleted(t.campaign, t.progress) || t.campaign.endDate < today,
  );

  // Puan özeti: süresi geçmemiş kazanılmış puanlar
  const earnedEntries = tracked
    .filter((t) => t.progress.earned > 0)
    .map((t) => ({
      ...t,
      daysLeft: t.progress.pointExpiryDate ? diffDays(today, t.progress.pointExpiryDate) : undefined,
    }));
  const validEntries = earnedEntries.filter((e) => e.daysLeft === undefined || e.daysLeft >= 0);
  const totalEarned = validEntries.reduce((s, e) => s + e.progress.earned, 0);
  const byProgram = validEntries.reduce<Partial<Record<ProgramId, number>>>((acc, e) => {
    acc[e.campaign.programId] = (acc[e.campaign.programId] ?? 0) + e.progress.earned;
    return acc;
  }, {});
  const expiring = [...earnedEntries]
    .filter((e) => e.daysLeft !== undefined)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Card style={{ gap: 10 }}>
        <Text style={styles.label}>Kazanılan Toplam Puan</Text>
        <Text style={styles.total}>{formatTL(totalEarned)}</Text>
        <View style={styles.wrap}>
          {(Object.keys(byProgram) as ProgramId[]).map((id) => (
            <View key={id} style={styles.programTotal}>
              <CardBadge programId={id} size="sm" />
              <Text style={styles.programTotalText}>
                {formatTL(byProgram[id] ?? 0)} {PROGRAMS[id].pointName}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {expiring.length > 0 && (
        <>
          <SectionTitle>Puan Silinme Tarihleri</SectionTitle>
          {expiring.map((e) => (
            <ExpiryRow
              key={e.campaign.id}
              campaign={e.campaign}
              amount={e.progress.earned}
              expiry={e.progress.pointExpiryDate!}
              daysLeft={e.daysLeft!}
            />
          ))}
        </>
      )}

      <SectionTitle right={<Text style={styles.muted}>{active.length} aktif</Text>}>
        Devam Eden Kampanyalar
      </SectionTitle>
      {active.length === 0 && (
        <Card style={{ gap: 8 }}>
          <Text style={styles.muted}>Takip ettiğiniz aktif kampanya yok.</Text>
          <Link href="/cuzdan" style={styles.link}>Kampanyalara katıl →</Link>
        </Card>
      )}
      {active.map((t) => (
        <CounterCard key={t.campaign.id} {...t} today={today} />
      ))}

      {finished.length > 0 && (
        <>
          <SectionTitle>Tamamlanan / Sona Eren</SectionTitle>
          {finished.map((t) => (
            <CounterCard key={t.campaign.id} {...t} today={today} finished />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function ExpiryRow({
  campaign,
  amount,
  expiry,
  daysLeft,
}: {
  campaign: Campaign;
  amount: number;
  expiry: string;
  daysLeft: number;
}) {
  const tone = daysLeft < 0 ? 'neutral' : daysLeft <= 7 ? 'danger' : daysLeft <= 30 ? 'warning' : 'success';
  const bg = { neutral: colors.surfaceMuted, danger: colors.dangerSoft, warning: colors.warningSoft, success: colors.surface }[tone];
  const fg = { neutral: colors.textMuted, danger: colors.danger, warning: colors.warning, success: colors.success }[tone];
  const label =
    daysLeft < 0 ? 'Silindi' : daysLeft === 0 ? 'Bugün siliniyor!' : `${daysLeft} gün kaldı`;
  return (
    <View style={[styles.expiry, { backgroundColor: bg, borderColor: tone === 'success' ? colors.border : bg }]}>
      {tone === 'danger' ? <TriangleAlert color={fg} size={20} /> : <Clock color={fg} size={20} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.expiryTitle}>
          {formatTL(amount)} {PROGRAMS[campaign.programId].pointName}
        </Text>
        <Text style={styles.muted} numberOfLines={1}>
          {campaign.title}
        </Text>
        <Text style={styles.muted}>Son kullanım: {formatDateTR(expiry)}</Text>
      </View>
      <Text style={[styles.expiryDays, { color: fg }]}>{label}</Text>
    </View>
  );
}

function CounterCard({
  campaign,
  progress,
  today,
  finished,
}: Tracked & { today: string; finished?: boolean }) {
  const recordTransaction = useAppStore((s) => s.recordTransaction);
  const undoLastTransaction = useAppStore((s) => s.undoLastTransaction);
  const [amountText, setAmountText] = useState(String(campaign.minAmount || ''));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const program = PROGRAMS[campaign.programId];
  const { label, ratio } = describeProgress(campaign, progress);
  const daysToEnd = diffDays(today, campaign.endDate);
  const doneToday = hasTransactionOn(progress, today);
  const blockedToday = campaign.differentDayRequired && doneToday;

  const badges: Badge[] = [];
  if (campaign.differentDayRequired) {
    badges.push({
      kind: 'differentDay',
      label: blockedToday ? 'Bugün işlendi · yarın tekrar' : 'Farklı gün şartı',
      violated: blockedToday,
    });
  }
  if (campaign.bankPosRequired) badges.push({ kind: 'bankPos', label: `${program.bank} POS şartı` });
  if (campaign.merchants?.length) badges.push({ kind: 'merchant', label: campaign.merchants.join(', ') });

  const onAdd = () => {
    const amount = parseAmount(amountText);
    if (amount <= 0) {
      setMessage({ ok: false, text: 'Geçerli bir tutar girin.' });
      return;
    }
    const res = recordTransaction(campaign.id, amount, { date: today });
    if (res.applied) {
      const r = res.evaluation?.immediateReward ?? 0;
      setMessage({
        ok: true,
        text: r > 0 ? `İşlendi! +${formatTL(r, true)} ${program.pointName} kazandınız.` : 'Harcama işlendi, sayaç ilerledi.',
      });
    } else {
      const ev = res.evaluation;
      setMessage({
        ok: false,
        text: ev?.hint ?? ev?.warnings[ev.warnings.length - 1] ?? 'Harcama işlenemedi.',
      });
    }
  };

  return (
    <Card style={[{ gap: 10 }, finished && { opacity: 0.85 }]}>
      <View style={styles.headerRow}>
        <CardBadge programId={campaign.programId} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{campaign.title}</Text>
          <Text style={styles.muted}>
            {program.bank} · {program.name}
          </Text>
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={[styles.muted, { fontWeight: '700' }]}>{Math.round(ratio * 100)}%</Text>
        </View>
        <ProgressBar ratio={ratio} color={program.color} />
      </View>

      <View style={styles.metaRow}>
        <CalendarDays color={colors.textMuted} size={14} />
        <Text style={styles.muted}>
          Son işlem: {progress.lastTransactionDate ? formatDateTR(progress.lastTransactionDate) : '—'}
        </Text>
        <Text style={styles.muted}>·</Text>
        <Text style={[styles.muted, daysToEnd <= 3 && daysToEnd >= 0 && { color: colors.danger, fontWeight: '700' }]}>
          {daysToEnd < 0 ? 'Kampanya sona erdi' : daysToEnd === 0 ? 'Bugün bitiyor' : `Bitime ${daysToEnd} gün`}
        </Text>
      </View>

      <ConditionBadges badges={badges} />
      {progress.earned > 0 && (
        <Pill tone="success" label={`Kazanılan: ${formatTL(progress.earned, true)} ${program.pointName}`} />
      )}

      {!finished && (
        <View style={styles.actionRow}>
          <View style={styles.amountBox}>
            <TextInput
              value={amountText}
              onChangeText={(t) => setAmountText(t.replace(/[^\d.,]/g, ''))}
              keyboardType="decimal-pad"
              inputMode="decimal"
              style={styles.amountInput}
              accessibilityLabel="Harcama tutarı"
            />
            <Text style={styles.muted}>TL</Text>
          </View>
          <Button
            label="+1 Harcama İşle"
            icon={<Plus color="#FFFFFF" size={18} />}
            onPress={onAdd}
            disabled={blockedToday}
            style={{ flex: 1 }}
          />
        </View>
      )}
      {!finished && (
        <Text style={styles.small}>
          Min. {formatTL(campaign.minAmount)}
          {blockedToday ? ' · Farklı gün şartı nedeniyle bugün yeni işlem sayılmaz.' : ''}
        </Text>
      )}

      {message && (
        <Text style={[styles.small, { color: message.ok ? colors.success : colors.danger, fontWeight: '600' }]}>
          {message.text}
        </Text>
      )}

      {progress.transactions.length > 0 && (
        <Button
          label="Son işlemi geri al"
          variant="ghost"
          icon={<RotateCcw color={colors.textMuted} size={14} />}
          onPress={() => {
            undoLastTransaction(campaign.id);
            setMessage(null);
          }}
          style={{ paddingVertical: 8 }}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, paddingBottom: 40, maxWidth: 760, width: '100%', alignSelf: 'center' },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  total: { fontSize: 34, fontWeight: '800', color: colors.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  programTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingRight: 10,
    padding: 4,
  },
  programTotalText: { fontSize: 13, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  small: { fontSize: 12, color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '700' },
  expiry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  expiryTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  expiryDays: { fontSize: 13, fontWeight: '800' },
  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  actionRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    width: 120,
  },
  amountInput: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text, paddingVertical: 8, minWidth: 0 },
});
