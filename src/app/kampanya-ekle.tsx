import { router } from 'expo-router';
import { ClipboardPaste, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryIcon } from '../components/CategoryIcon';
import { Button, Card, Chip, Field, Pill, SectionTitle, Toggle } from '../components/ui';
import { CATEGORIES, PROGRAM_LIST } from '../data/catalog';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme';
import type { Campaign, CampaignRule, CategoryId, ProgramId } from '../types';
import { addDays, formatDateTR, parseTRDate, todayISO } from '../utils/date';
import { parseCampaignText, type CampaignDraft, type RuleKind } from '../utils/campaignParser';
import { parseAmount } from '../utils/format';

const SAMPLE_TEXT =
  "Bonus Card'ınızla 01.11.2026 - 30.11.2026 tarihleri arasında Opet istasyonlarında 4 farklı günde yapacağınız 1.000 TL ve üzeri akaryakıt alışverişlerinize toplam 300 TL Bonus! Katılım için BONUSOPET yazıp 3340'a SMS gönderin. Kazanılan Bonuslar 60 gün içinde kullanılmalıdır.";

const RULE_KINDS: { id: RuleKind; label: string }[] = [
  { id: 'tieredCount', label: 'Sayaçlı (N işlem)' },
  { id: 'tieredAmount', label: 'Tutar hedefli' },
  { id: 'percent', label: 'Yüzde (%)' },
  { id: 'fixed', label: 'Sabit puan' },
  { id: 'perStep', label: "Her X TL'ye Y TL" },
];

interface FormState {
  programId: ProgramId | null;
  title: string;
  categories: CategoryId[];
  merchants: string;
  ruleKind: RuleKind;
  minAmount: string;
  rate: string;
  reward: string;
  requiredCount: string;
  targetAmount: string;
  stepAmount: string;
  maxPerTransaction: string;
  maxTotal: string;
  maxUses: string;
  differentDayRequired: boolean;
  bankPosRequired: boolean;
  requiresJoin: boolean;
  joinInfo: string;
  startDate: string;
  endDate: string;
  pointValidityDays: string;
}

const initialForm = (): FormState => ({
  programId: null,
  title: '',
  categories: [],
  merchants: '',
  ruleKind: 'tieredCount',
  minAmount: '',
  rate: '',
  reward: '',
  requiredCount: '',
  targetAmount: '',
  stepAmount: '',
  maxPerTransaction: '',
  maxTotal: '',
  maxUses: '',
  differentDayRequired: false,
  bankPosRequired: false,
  requiresJoin: false,
  joinInfo: '',
  startDate: formatDateTR(todayISO()),
  endDate: formatDateTR(addDays(todayISO(), 30)),
  pointValidityDays: '60',
});

const str = (n?: number) => (n === undefined || Number.isNaN(n) ? '' : String(n));

function draftToForm(d: CampaignDraft, prev: FormState): FormState {
  return {
    ...prev,
    programId: d.programId ?? prev.programId,
    title: d.title ?? prev.title,
    categories: d.categories.length ? d.categories : prev.categories,
    merchants: d.merchants.join(', ') || prev.merchants,
    ruleKind: d.ruleKind ?? prev.ruleKind,
    minAmount: str(d.minAmount) || prev.minAmount,
    rate: d.rate !== undefined ? str(Math.round(d.rate * 1000) / 10) : prev.rate,
    reward: str(d.reward) || prev.reward,
    requiredCount: str(d.requiredCount) || prev.requiredCount,
    targetAmount: str(d.targetAmount) || prev.targetAmount,
    stepAmount: str(d.stepAmount) || prev.stepAmount,
    maxPerTransaction: str(d.maxPerTransaction) || prev.maxPerTransaction,
    maxTotal: str(d.maxTotal) || prev.maxTotal,
    maxUses: str(d.maxUses) || prev.maxUses,
    differentDayRequired: d.differentDayRequired,
    bankPosRequired: d.bankPosRequired,
    requiresJoin: d.requiresJoin,
    joinInfo: d.joinInfo ?? prev.joinInfo,
    startDate: d.startDate ? formatDateTR(d.startDate) : prev.startDate,
    endDate: d.endDate ? formatDateTR(d.endDate) : prev.endDate,
    pointValidityDays: str(d.pointValidityDays) || prev.pointValidityDays,
  };
}

/** Formu doğrular ve kampanya kuralını oluşturur; hata varsa mesaj listesi döner. */
function buildCampaign(f: FormState): { campaign?: Campaign; errors: string[] } {
  const errors: string[] = [];
  const num = (s: string) => parseAmount(s);
  const opt = (s: string) => (num(s) > 0 ? num(s) : undefined);

  if (!f.programId) errors.push('Kart programı seçin.');
  if (!f.title.trim()) errors.push('Kampanya başlığı girin.');
  if (!f.categories.length) errors.push('En az bir kategori seçin.');
  const startDate = parseTRDate(f.startDate);
  const endDate = parseTRDate(f.endDate);
  if (!startDate) errors.push('Başlangıç tarihini GG.AA.YYYY biçiminde girin.');
  if (!endDate) errors.push('Son tarihi GG.AA.YYYY biçiminde girin.');
  else if (endDate < todayISO()) errors.push('Son tarih geçmişte olamaz.');
  if (startDate && endDate && startDate > endDate) errors.push('Başlangıç tarihi son tarihten sonra olamaz.');

  let rule: CampaignRule | undefined;
  switch (f.ruleKind) {
    case 'tieredCount':
      if (!(num(f.requiredCount) >= 1)) errors.push('İşlem adedini girin.');
      if (!num(f.reward)) errors.push('Toplam ödülü girin.');
      rule = { kind: 'tieredCount', requiredCount: Math.round(num(f.requiredCount)), reward: num(f.reward) };
      break;
    case 'tieredAmount':
      if (!num(f.targetAmount)) errors.push('Hedef harcama tutarını girin.');
      if (!num(f.reward)) errors.push('Ödülü girin.');
      rule = { kind: 'tieredAmount', targetAmount: num(f.targetAmount), reward: num(f.reward) };
      break;
    case 'percent': {
      const rate = num(f.rate);
      if (!rate || rate > 100) errors.push('Geçerli bir oran (%) girin.');
      rule = {
        kind: 'percent',
        rate: rate / 100,
        maxPerTransaction: opt(f.maxPerTransaction),
        maxTotal: opt(f.maxTotal),
      };
      break;
    }
    case 'fixed':
      if (!num(f.reward)) errors.push('İşlem başı ödülü girin.');
      rule = { kind: 'fixed', reward: num(f.reward), maxUses: opt(f.maxUses) && Math.round(num(f.maxUses)) };
      break;
    case 'perStep':
      if (!num(f.stepAmount)) errors.push('Kademe tutarını (her X TL) girin.');
      if (!num(f.reward)) errors.push('Kademe başı ödülü girin.');
      rule = { kind: 'perStep', stepAmount: num(f.stepAmount), stepReward: num(f.reward), maxTotal: opt(f.maxTotal) };
      break;
  }

  if (errors.length || !rule || !f.programId || !startDate || !endDate) return { errors };

  const merchants = f.merchants.split(',').map((m) => m.trim()).filter(Boolean);
  return {
    errors,
    campaign: {
      id: `custom-${Date.now().toString(36)}`,
      programId: f.programId,
      title: f.title.trim(),
      description: 'Manuel eklenen kampanya.',
      categories: f.categories,
      merchants: merchants.length ? merchants : undefined,
      minAmount: num(f.minAmount) || (rule.kind === 'perStep' ? rule.stepAmount : 0),
      rule,
      differentDayRequired: f.differentDayRequired,
      bankPosRequired: f.bankPosRequired,
      requiresJoin: f.requiresJoin,
      joinInfo: f.joinInfo.trim() || undefined,
      startDate,
      endDate,
      pointValidityDays: Math.round(num(f.pointValidityDays)) || 60,
      isCustom: true,
    },
  };
}

export default function KampanyaEkleScreen() {
  const addCampaign = useAppStore((s) => s.addCampaign);
  const [rawText, setRawText] = useState('');
  const [detected, setDetected] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<string[]>([]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onParse = (text = rawText) => {
    if (!text.trim()) return;
    const { draft, detected: found } = parseCampaignText(text);
    setForm((f) => draftToForm(draft, f));
    setDetected(found.length ? found : ['Metinden kural çıkarılamadı, formu elle doldurun.']);
  };

  const onSave = () => {
    const { campaign, errors: errs } = buildCampaign(form);
    setErrors(errs);
    if (campaign) {
      addCampaign(campaign, true);
      if (router.canGoBack()) router.back();
      else router.replace('/cuzdan');
    }
  };

  const k = form.ruleKind;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 10 }}>
          <View style={styles.row}>
            <Sparkles color={colors.primary} size={18} />
            <Text style={styles.heading}>Kampanya metninden doldur</Text>
          </View>
          <Field
            label="Bankanın kampanya metnini yapıştırın"
            value={rawText}
            onChangeText={setRawText}
            multiline
            placeholder="Örn: Opet'te 4 farklı günde 1.000 TL ve üzeri harcamaya toplam 300 TL Bonus..."
          />
          <View style={styles.row}>
            <Button label="Kuralları Çıkar" onPress={() => onParse()} style={{ flex: 1 }} />
            <Button
              label="Örnek metin"
              variant="ghost"
              icon={<ClipboardPaste color={colors.textMuted} size={16} />}
              onPress={() => {
                setRawText(SAMPLE_TEXT);
                onParse(SAMPLE_TEXT);
              }}
            />
          </View>
          {detected.length > 0 && (
            <View style={styles.wrap}>
              {detected.map((d) => (
                <Pill key={d} label={d} tone="primary" />
              ))}
            </View>
          )}
        </Card>

        <SectionTitle>Kampanya Bilgileri</SectionTitle>
        <Card style={{ gap: 14 }}>
          <Text style={styles.label}>Kart programı</Text>
          <View style={styles.wrap}>
            {PROGRAM_LIST.map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                color={p.color}
                selected={form.programId === p.id}
                onPress={() => set('programId', p.id)}
              />
            ))}
          </View>

          <Field label="Başlık" value={form.title} onChangeText={(t) => set('title', t)} placeholder="Kampanya adı" />

          <Text style={styles.label}>Kategoriler</Text>
          <View style={styles.wrap}>
            {CATEGORIES.map((c) => {
              const selected = form.categories.includes(c.id);
              return (
                <Chip
                  key={c.id}
                  label={c.label}
                  selected={selected}
                  icon={<CategoryIcon category={c.id} color={selected ? '#FFFFFF' : colors.textMuted} />}
                  onPress={() =>
                    set(
                      'categories',
                      selected ? form.categories.filter((x) => x !== c.id) : [...form.categories, c.id],
                    )
                  }
                />
              );
            })}
          </View>

          <Field
            label="Üye işyerleri (isteğe bağlı)"
            value={form.merchants}
            onChangeText={(t) => set('merchants', t)}
            placeholder="Opet, Shell"
            hint="Virgülle ayırın. Boş bırakılırsa kategori genelinde geçerli."
          />
        </Card>

        <SectionTitle>Kurallar</SectionTitle>
        <Card style={{ gap: 14 }}>
          <Text style={styles.label}>Kampanya tipi</Text>
          <View style={styles.wrap}>
            {RULE_KINDS.map((r) => (
              <Chip key={r.id} label={r.label} selected={k === r.id} onPress={() => set('ruleKind', r.id)} />
            ))}
          </View>

          <View style={styles.grid}>
            <NumField label="Min. işlem tutarı (TL)" value={form.minAmount} onChange={(v) => set('minAmount', v)} />
            {k === 'tieredCount' && (
              <NumField label="Gereken işlem adedi" value={form.requiredCount} onChange={(v) => set('requiredCount', v)} />
            )}
            {k === 'tieredAmount' && (
              <NumField label="Hedef toplam harcama (TL)" value={form.targetAmount} onChange={(v) => set('targetAmount', v)} />
            )}
            {k === 'perStep' && (
              <NumField label="Her ... TL'ye" value={form.stepAmount} onChange={(v) => set('stepAmount', v)} />
            )}
            {k === 'percent' ? (
              <NumField label="Oran (%)" value={form.rate} onChange={(v) => set('rate', v)} />
            ) : (
              <NumField
                label={
                  k === 'fixed' ? 'İşlem başı ödül (TL)' : k === 'perStep' ? 'Kademe başı ödül (TL)' : 'Toplam ödül (TL)'
                }
                value={form.reward}
                onChange={(v) => set('reward', v)}
              />
            )}
            {k === 'percent' && (
              <NumField label="İşlem başı max (TL)" value={form.maxPerTransaction} onChange={(v) => set('maxPerTransaction', v)} />
            )}
            {(k === 'percent' || k === 'perStep') && (
              <NumField label="Toplam max (TL)" value={form.maxTotal} onChange={(v) => set('maxTotal', v)} />
            )}
            {k === 'fixed' && (
              <NumField label="Kullanım adedi" value={form.maxUses} onChange={(v) => set('maxUses', v)} />
            )}
          </View>

          <Toggle
            label="Farklı gün şartı"
            description="Aynı gün yapılan ikinci işlem sayılmaz."
            value={form.differentDayRequired}
            onChange={(v) => set('differentDayRequired', v)}
          />
          <Toggle
            label="Banka POS şartı"
            description="Yalnızca bankanın kendi POS cihazlarında geçerli."
            value={form.bankPosRequired}
            onChange={(v) => set('bankPosRequired', v)}
          />
          <Toggle
            label="Katılım gerekli"
            description="SMS veya mobil uygulamadan katılım."
            value={form.requiresJoin}
            onChange={(v) => set('requiresJoin', v)}
          />
          {form.requiresJoin && (
            <Field label="Katılım bilgisi" value={form.joinInfo} onChangeText={(t) => set('joinInfo', t)} placeholder="KATIL yazıp 1234'e SMS" />
          )}

          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Field label="Başlangıç" value={form.startDate} onChangeText={(t) => set('startDate', t)} placeholder="GG.AA.YYYY" />
            </View>
            <View style={styles.gridItem}>
              <Field label="Son tarih" value={form.endDate} onChangeText={(t) => set('endDate', t)} placeholder="GG.AA.YYYY" />
            </View>
            <NumField label="Puan geçerlilik (gün)" value={form.pointValidityDays} onChange={(v) => set('pointValidityDays', v)} />
          </View>
        </Card>

        {errors.length > 0 && (
          <View style={styles.errorBox}>
            {errors.map((e) => (
              <Text key={e} style={styles.errorText}>• {e}</Text>
            ))}
          </View>
        )}

        <Button label="Kampanyayı Kaydet ve Takibe Al" onPress={onSave} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.gridItem}>
      <Field
        label={label}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^\d.,]/g, ''))}
        keyboardType="decimal-pad"
        inputMode="decimal"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 48, maxWidth: 760, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { fontSize: 16, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { flexGrow: 1, flexBasis: 140 },
  errorBox: { backgroundColor: colors.dangerSoft, padding: 12, borderRadius: 12, gap: 4 },
  errorText: { color: colors.danger, fontWeight: '600' },
});
