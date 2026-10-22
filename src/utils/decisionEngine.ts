/**
 * Karar Motoru — "Şu An Kasadayım"
 *
 * Kullanıcının cüzdanındaki kartlar için, girilen kategori ve tutara göre
 * aktif kampanyaları tarar ve kartları en kârlıdan en az kârlıya sıralar.
 *
 * Kurallar:
 *  - Kampanya tarih aralığı ve kategori eşleşmesi
 *  - Minimum işlem tutarı (altındaysa "X TL daha harca" ipucu)
 *  - Doğrudan kampanyalar: yüzde (işlem başı / toplam limit), sabit (kullanım adedi),
 *    "her X TL'ye Y TL" kademeli puan
 *  - Kademeli sayaçlı kampanyalar: bu harcamanın sayacı n/N'den n+1/N'e taşıyıp
 *    taşımadığı ve işlem başı efektif değeri (ödül / N)
 *  - Tutar biriktirmeli kampanyalar: hedefe katkı oranında efektif değer
 *  - Farklı gün şartı: aynı gün işlem yapıldıysa sayılmaz, uyarı verilir
 *  - Banka POS şartı: POS bankası biliniyorsa eşleşme kontrolü, bilinmiyorsa uyarı rozeti
 *  - Kalan gün sayısı, kalan farklı-gün işlem sayısına yetmiyorsa kampanya değersizdir
 */
import { PROGRAMS } from '../data/catalog';
import type {
  Campaign,
  CampaignProgress,
  Card,
  CategoryId,
  ISODate,
  ProgramId,
  ProgressMap,
} from '../types';
import { addDays, diffDays, formatDateTR } from './date';
import { formatTL } from './format';

export type BadgeKind = 'differentDay' | 'bankPos' | 'join' | 'merchant' | 'completes';

export interface Badge {
  kind: BadgeKind;
  label: string;
  /** Şart bu işlem için sorun yaratıyorsa true (kırmızı gösterilir). */
  violated?: boolean;
}

export type EvaluationStatus =
  /** Harcama kampanyaya sayılır. */
  | 'eligible'
  /** Tutar minimumun altında. */
  | 'belowMin'
  /** Farklı gün / POS şartı ihlali ya da süre yetersizliği. */
  | 'blocked'
  /** Kampanya limiti doldu veya tamamlandı. */
  | 'exhausted';

export interface CampaignEvaluation {
  campaign: Campaign;
  status: EvaluationStatus;
  /** Bu işlemle hesaba geçecek puan (TL). */
  immediateReward: number;
  /** Sıralama için kullanılan işlem başı efektif kazanç (TL). */
  effectiveValue: number;
  /** Kampanyaya sayılacak tutar (TL). */
  countedAmount: number;
  completesCampaign: boolean;
  progressBefore?: string;
  progressAfter?: string;
  /** Yalnızca kademeli kampanyalar için 0..1 ilerleme. */
  progressRatioBefore?: number;
  progressRatioAfter?: number;
  needsJoin: boolean;
  badges: Badge[];
  warnings: string[];
  hint?: string;
}

export interface CardRecommendation {
  card: Card;
  totalEffectiveValue: number;
  totalImmediateReward: number;
  /** Efektif kazanç / harcama tutarı. */
  effectiveRate: number;
  evaluations: CampaignEvaluation[];
  /** Kampanyalara sayılan değerlendirmeler (eligible). */
  eligibleCount: number;
}

export interface DecisionInput {
  amount: number;
  category: CategoryId;
  date: ISODate;
  cards: Card[];
  campaigns: Campaign[];
  progress: ProgressMap;
  /** Kasadaki POS'un ait olduğu banka programı. `null`/undefined = bilinmiyor. */
  posProgramId?: ProgramId | null;
}

export interface EvaluateContext {
  amount: number;
  date: ISODate;
  posProgramId?: ProgramId | null;
}

export const emptyProgress = (campaignId: string): CampaignProgress => ({
  campaignId,
  joined: false,
  count: 0,
  totalSpent: 0,
  earned: 0,
  transactions: [],
});

export function isCampaignActive(c: Campaign, date: ISODate): boolean {
  return date >= c.startDate && date <= c.endDate;
}

export function hasTransactionOn(p: CampaignProgress, date: ISODate): boolean {
  return p.lastTransactionDate === date || p.transactions.some((t) => t.date === date);
}

/** Kampanyanın ulaşabileceği toplam azami puan. */
export function maxCampaignReward(c: Campaign): number | undefined {
  const r = c.rule;
  switch (r.kind) {
    case 'percent':
      return r.maxTotal;
    case 'fixed':
      return r.maxUses ? r.maxUses * r.reward : undefined;
    case 'perStep':
      return r.maxTotal;
    case 'tieredCount':
    case 'tieredAmount':
      return r.reward;
  }
}

export function isCampaignCompleted(c: Campaign, p: CampaignProgress): boolean {
  const r = c.rule;
  if (r.kind === 'tieredCount') return p.count >= r.requiredCount;
  if (r.kind === 'tieredAmount') return p.totalSpent >= r.targetAmount;
  if (r.kind === 'fixed') return r.maxUses !== undefined && p.count >= r.maxUses;
  const max = maxCampaignReward(c);
  return max !== undefined && p.earned >= max;
}

/** "2 / 4 Harcama" veya "1.500 TL / 5.000 TL" gibi ilerleme etiketi ve oranı. */
export function describeProgress(
  c: Campaign,
  p: CampaignProgress,
): { label: string; ratio: number } {
  const r = c.rule;
  switch (r.kind) {
    case 'tieredCount':
      return {
        label: `${Math.min(p.count, r.requiredCount)} / ${r.requiredCount} Harcama`,
        ratio: Math.min(1, p.count / r.requiredCount),
      };
    case 'tieredAmount':
      return {
        label: `${formatTL(Math.min(p.totalSpent, r.targetAmount))} / ${formatTL(r.targetAmount)}`,
        ratio: Math.min(1, p.totalSpent / r.targetAmount),
      };
    case 'fixed':
      if (r.maxUses) {
        return {
          label: `${Math.min(p.count, r.maxUses)} / ${r.maxUses} Kullanım`,
          ratio: Math.min(1, p.count / r.maxUses),
        };
      }
      return { label: `${formatTL(p.earned)} kazanıldı`, ratio: 0 };
    case 'percent':
    case 'perStep': {
      const max = maxCampaignReward(c);
      if (max) {
        return {
          label: `${formatTL(p.earned)} / ${formatTL(max)} Puan`,
          ratio: Math.min(1, p.earned / max),
        };
      }
      return { label: `${formatTL(p.earned)} kazanıldı`, ratio: 0 };
    }
  }
}

function buildBadges(c: Campaign, ctx: EvaluateContext, p: CampaignProgress): Badge[] {
  const badges: Badge[] = [];
  const program = PROGRAMS[c.programId];
  if (c.differentDayRequired) {
    badges.push({
      kind: 'differentDay',
      label: 'Farklı gün şartı',
      violated: hasTransactionOn(p, ctx.date),
    });
  }
  if (c.bankPosRequired) {
    badges.push({
      kind: 'bankPos',
      label: `${program.bank} POS şartı`,
      violated: !!ctx.posProgramId && ctx.posProgramId !== c.programId,
    });
  }
  if (c.merchants?.length) {
    badges.push({ kind: 'merchant', label: `Sadece ${c.merchants.join(', ')}` });
  }
  if (c.requiresJoin && !p.joined) {
    badges.push({ kind: 'join', label: 'Katılım gerekli', violated: true });
  }
  return badges;
}

/**
 * Tek bir kampanyayı verilen harcama için değerlendirir.
 * Kampanyanın kategori/tarih eşleşmesi çağıran tarafından kontrol edilir.
 */
export function evaluateCampaign(
  campaign: Campaign,
  progress: CampaignProgress | undefined,
  ctx: EvaluateContext,
): CampaignEvaluation {
  const p = progress ?? emptyProgress(campaign.id);
  const program = PROGRAMS[campaign.programId];
  const rule = campaign.rule;
  const badges = buildBadges(campaign, ctx, p);
  const warnings: string[] = [];
  const needsJoin = campaign.requiresJoin && !p.joined;

  const before = describeProgress(campaign, p);
  const base: CampaignEvaluation = {
    campaign,
    status: 'eligible',
    immediateReward: 0,
    effectiveValue: 0,
    countedAmount: 0,
    completesCampaign: false,
    progressBefore: before.label,
    progressRatioBefore: before.ratio,
    needsJoin,
    badges,
    warnings,
  };

  if (needsJoin) {
    warnings.push(
      `Kampanyaya henüz katılmadınız${campaign.joinInfo ? ` (${campaign.joinInfo})` : ''}. Ödemeden önce katılın.`,
    );
  }

  // 0) Tarih aralığı
  if (!isCampaignActive(campaign, ctx.date)) {
    return {
      ...base,
      status: 'blocked',
      warnings: [
        ...warnings,
        ctx.date < campaign.startDate
          ? `Kampanya henüz başlamadı (başlangıç ${formatDateTR(campaign.startDate)}).`
          : 'Kampanya sona erdi.',
      ],
    };
  }

  // 1) Limit / tamamlanma kontrolü
  if (isCampaignCompleted(campaign, p)) {
    return {
      ...base,
      status: 'exhausted',
      warnings: [...warnings, 'Kampanya tamamlandı veya limit doldu.'],
    };
  }

  // 2) Banka POS şartı
  if (campaign.bankPosRequired) {
    if (ctx.posProgramId && ctx.posProgramId !== campaign.programId) {
      return {
        ...base,
        status: 'blocked',
        warnings: [
          ...warnings,
          `Kasadaki POS ${PROGRAMS[ctx.posProgramId].bank}'a ait; kampanya yalnızca ${program.bank} POS'larında geçerli.`,
        ],
      };
    }
    if (!ctx.posProgramId) {
      warnings.push(`Banka POS şartı: Kasadaki POS'un ${program.bank}'a ait olduğundan emin olun.`);
    }
  }

  // 3) Farklı gün şartı
  if (campaign.differentDayRequired && hasTransactionOn(p, ctx.date)) {
    return {
      ...base,
      status: 'blocked',
      warnings: [
        ...warnings,
        'Bugün bu kampanyaya zaten işlem yaptınız. Farklı gün şartı nedeniyle bu harcama sayılmaz — yarın tekrar deneyin.',
      ],
    };
  }

  // 4) Minimum tutar
  if (ctx.amount < campaign.minAmount) {
    const missing = campaign.minAmount - ctx.amount;
    return {
      ...base,
      status: 'belowMin',
      hint: `${formatTL(missing)} daha harcarsanız kampanyaya dahil olur (min. ${formatTL(campaign.minAmount)}).`,
    };
  }

  const maxTotal = maxCampaignReward(campaign);
  const remainingCap = maxTotal !== undefined ? Math.max(0, maxTotal - p.earned) : Infinity;

  switch (rule.kind) {
    case 'percent': {
      let reward = ctx.amount * rule.rate;
      if (rule.maxPerTransaction !== undefined) reward = Math.min(reward, rule.maxPerTransaction);
      reward = Math.min(reward, remainingCap);
      const after = describeProgress(campaign, { ...p, earned: p.earned + reward });
      if (rule.maxPerTransaction !== undefined && ctx.amount * rule.rate > rule.maxPerTransaction) {
        const optimal = rule.maxPerTransaction / rule.rate;
        warnings.push(
          `İşlem başı limit ${formatTL(rule.maxPerTransaction)}; ${formatTL(optimal)} üzeri tutar ek puan kazandırmaz.`,
        );
      }
      return {
        ...base,
        immediateReward: reward,
        effectiveValue: reward,
        countedAmount: ctx.amount,
        completesCampaign: reward >= remainingCap,
        progressAfter: after.label,
        progressRatioAfter: after.ratio,
      };
    }

    case 'fixed': {
      const reward = Math.min(rule.reward, remainingCap);
      const after = describeProgress(campaign, { ...p, count: p.count + 1, earned: p.earned + reward });
      return {
        ...base,
        immediateReward: reward,
        effectiveValue: reward,
        countedAmount: ctx.amount,
        completesCampaign: rule.maxUses !== undefined && p.count + 1 >= rule.maxUses,
        progressAfter: after.label,
        progressRatioAfter: after.ratio,
      };
    }

    case 'perStep': {
      const steps = Math.floor(ctx.amount / rule.stepAmount);
      const reward = Math.min(steps * rule.stepReward, remainingCap);
      const leftover = ctx.amount - steps * rule.stepAmount;
      const toNextStep = rule.stepAmount - leftover;
      const after = describeProgress(campaign, { ...p, earned: p.earned + reward });
      const canEarnMore = steps * rule.stepReward < remainingCap;
      return {
        ...base,
        immediateReward: reward,
        effectiveValue: reward,
        countedAmount: ctx.amount,
        completesCampaign: reward >= remainingCap,
        progressAfter: after.label,
        progressRatioAfter: after.ratio,
        hint:
          canEarnMore && leftover > 0 && toNextStep <= rule.stepAmount * 0.25
            ? `${formatTL(toNextStep)} daha harcarsanız +${formatTL(rule.stepReward)} kazanırsınız.`
            : undefined,
      };
    }

    case 'tieredCount': {
      const remainingSteps = rule.requiredCount - p.count;
      const daysLeft = diffDays(ctx.date, campaign.endDate) + 1;
      // Bugünkü işlem dahil kalan adımların kampanya bitmeden yapılabilmesi gerekir.
      if (campaign.differentDayRequired && remainingSteps > daysLeft) {
        return {
          ...base,
          status: 'blocked',
          warnings: [
            ...warnings,
            `Kampanya bitimine ${daysLeft} gün kaldı; farklı günlerde ${remainingSteps} işlem daha gerekiyor. Tamamlanması mümkün değil.`,
          ],
        };
      }
      const nextCount = p.count + 1;
      const completes = nextCount >= rule.requiredCount;
      const after = describeProgress(campaign, { ...p, count: nextCount });
      const perStepValue = rule.reward / rule.requiredCount;
      return {
        ...base,
        immediateReward: completes ? rule.reward : 0,
        effectiveValue: perStepValue,
        countedAmount: ctx.amount,
        completesCampaign: completes,
        progressAfter: after.label,
        progressRatioAfter: after.ratio,
        badges: completes
          ? [...badges, { kind: 'completes', label: `${formatTL(rule.reward)} kazandırır` }]
          : badges,
        hint: completes
          ? `Bu harcama kampanyayı tamamlar: ${formatTL(rule.reward)} ${program.pointName} hesabınıza geçer.`
          : `Sayaç ${p.count}/${rule.requiredCount} → ${nextCount}/${rule.requiredCount}. İşlem başı efektif değer ${formatTL(perStepValue, true)}.` +
            (campaign.differentDayRequired
              ? ` Sonraki işlem en erken ${formatDateTR(addDays(ctx.date, 1))}.`
              : ''),
      };
    }

    case 'tieredAmount': {
      const remainingTarget = rule.targetAmount - p.totalSpent;
      const counted = Math.min(ctx.amount, remainingTarget);
      const completes = counted >= remainingTarget;
      const after = describeProgress(campaign, { ...p, totalSpent: p.totalSpent + counted });
      const value = (rule.reward * counted) / rule.targetAmount;
      return {
        ...base,
        immediateReward: completes ? rule.reward : 0,
        effectiveValue: value,
        countedAmount: counted,
        completesCampaign: completes,
        progressAfter: after.label,
        progressRatioAfter: after.ratio,
        badges: completes
          ? [...badges, { kind: 'completes', label: `${formatTL(rule.reward)} kazandırır` }]
          : badges,
        hint: completes
          ? `Bu harcama hedefi tamamlar: ${formatTL(rule.reward)} ${program.pointName} hesabınıza geçer.`
          : `Hedefe ${formatTL(remainingTarget - counted)} kalacak.`,
      };
    }
  }
}

/** Kampanya kategori ve tarih açısından bu harcamaya uygulanabilir mi? */
export function isApplicable(c: Campaign, category: CategoryId, date: ISODate): boolean {
  return c.categories.includes(category) && isCampaignActive(c, date);
}

const STATUS_ORDER: Record<EvaluationStatus, number> = {
  eligible: 0,
  belowMin: 1,
  blocked: 2,
  exhausted: 3,
};

/** Ana fonksiyon: kartları en kârlıdan en aza sıralar. */
export function recommendCards(input: DecisionInput): CardRecommendation[] {
  const { amount, category, date, cards, campaigns, progress, posProgramId } = input;
  const ctx: EvaluateContext = { amount, date, posProgramId };

  const recs = cards.map<CardRecommendation>((card) => {
    const evaluations = campaigns
      .filter((c) => c.programId === card.programId && isApplicable(c, category, date))
      .map((c) => evaluateCampaign(c, progress[c.id], ctx))
      .sort(
        (a, b) =>
          STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.effectiveValue - a.effectiveValue,
      );

    // Aynı karttaki farklı kampanyalar genellikle birbirini engellemez; toplanır.
    const eligible = evaluations.filter((e) => e.status === 'eligible');
    const totalEffectiveValue = eligible.reduce((s, e) => s + e.effectiveValue, 0);
    const totalImmediateReward = eligible.reduce((s, e) => s + e.immediateReward, 0);

    return {
      card,
      totalEffectiveValue,
      totalImmediateReward,
      effectiveRate: amount > 0 ? totalEffectiveValue / amount : 0,
      evaluations,
      eligibleCount: eligible.length,
    };
  });

  return recs.sort(
    (a, b) =>
      b.totalEffectiveValue - a.totalEffectiveValue ||
      b.totalImmediateReward - a.totalImmediateReward ||
      // Katılım gerektirmeyen (hemen kullanılabilir) kart önce
      countJoinNeeded(a) - countJoinNeeded(b) ||
      b.evaluations.length - a.evaluations.length,
  );
}

const countJoinNeeded = (r: CardRecommendation) =>
  r.evaluations.filter((e) => e.status === 'eligible' && e.needsJoin).length;

export interface ApplyResult {
  progress: CampaignProgress;
  evaluation: CampaignEvaluation;
  applied: boolean;
}

/**
 * Harcamayı kampanya sayacına işler ("+ Harcama Ekle").
 * Kurallara uymayan harcama sayaca eklenmez; nedeni `evaluation.warnings` içindedir.
 */
export function applyTransaction(
  campaign: Campaign,
  progress: CampaignProgress | undefined,
  ctx: EvaluateContext,
): ApplyResult {
  const p = progress ?? emptyProgress(campaign.id);
  const evaluation = evaluateCampaign(campaign, { ...p, joined: true }, ctx);
  if (evaluation.status !== 'eligible') {
    return { progress: p, evaluation, applied: false };
  }
  const reward = evaluation.immediateReward;
  return {
    applied: true,
    evaluation,
    progress: {
      ...p,
      joined: true,
      count: p.count + 1,
      totalSpent: p.totalSpent + evaluation.countedAmount,
      earned: p.earned + reward,
      lastTransactionDate: ctx.date,
      transactions: [
        ...p.transactions,
        { date: ctx.date, amount: ctx.amount, counted: evaluation.countedAmount, reward },
      ],
      // Birden fazla kazanımda, en erken silinecek puanın tarihi gösterilir.
      pointExpiryDate:
        reward > 0 && !(p.pointExpiryDate && p.pointExpiryDate >= ctx.date)
          ? addDays(ctx.date, campaign.pointValidityDays)
          : p.pointExpiryDate,
    },
  };
}
