import type { ISODate } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

/** Yerel saat diliminde güvenli tarih ayrıştırma (UTC kaymasını önler). */
export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** b - a gün farkı. */
export function diffDays(a: ISODate, b: ISODate): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatDateTR(iso: ISODate): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** "dd.mm.yyyy" veya "dd/mm/yyyy" metnini ISO tarihe çevirir. */
export function parseTRDate(text: string): ISODate | undefined {
  const m = text.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!m) return undefined;
  const iso = `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
  return toISODate(parseISODate(iso)) === iso ? iso : undefined;
}
