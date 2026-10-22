import type { Campaign } from '../types';
import { formatPercent, formatTL } from './format';

/** Kampanya kuralının tek satırlık Türkçe özeti. */
export function describeRule(c: Campaign): string {
  const r = c.rule;
  switch (r.kind) {
    case 'percent':
      return `${formatPercent(r.rate)} puan${r.maxPerTransaction ? `, işlem başı max ${formatTL(r.maxPerTransaction)}` : ''}${r.maxTotal ? `, toplam ${formatTL(r.maxTotal)}` : ''}`;
    case 'fixed':
      return `${formatTL(r.reward)} sabit puan${r.maxUses ? ` × ${r.maxUses} kez` : ''}`;
    case 'perStep':
      return `Her ${formatTL(r.stepAmount)}'ye ${formatTL(r.stepReward)}${r.maxTotal ? `, toplam ${formatTL(r.maxTotal)}` : ''}`;
    case 'tieredCount':
      return `${r.requiredCount} işleme toplam ${formatTL(r.reward)}`;
    case 'tieredAmount':
      return `Toplam ${formatTL(r.targetAmount)} harcamaya ${formatTL(r.reward)}`;
  }
}
