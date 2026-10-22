/** Intl desteğinden bağımsız, Türkçe para biçimi: 1.234,50 TL */
export function formatTL(value: number, withDecimals = false): string {
  const rounded = withDecimals ? Math.round(value * 100) / 100 : Math.round(value);
  const [intPart, decPart] = Math.abs(rounded).toFixed(withDecimals ? 2 : 0).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = rounded < 0 ? '-' : '';
  const dec = decPart && decPart !== '00' ? `,${decPart}` : '';
  return `${sign}${grouped}${dec} TL`;
}

export function formatPercent(rate: number): string {
  return `%${(Math.round(rate * 1000) / 10).toString().replace('.', ',')}`;
}

/** "1.250,50" / "1250.5" / "1250" girdilerini sayıya çevirir. */
export function parseAmount(text: string): number {
  const cleaned = text.replace(/\s|TL/gi, '');
  if (!cleaned) return 0;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(cleaned)
      ? cleaned.replace(/\./g, '')
      : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
