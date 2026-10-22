/**
 * Kampanya metni şablon ayrıştırıcısı.
 * Bankanın sitesinden/SMS'inden kopyalanan kampanya metnindeki kalıpları
 * (min. tutar, %, "4 farklı gün", "her 500 TL'ye 25 TL", POS şartı, son tarih...)
 * yakalayıp kampanya formunu önceden doldurur. Kullanıcı sonucu formda düzeltebilir.
 */
import type { CampaignRule, CategoryId, ISODate, ProgramId } from '../types';
import { parseTRDate } from './date';
import { formatTL, parseAmount } from './format';

export type RuleKind = CampaignRule['kind'];

export interface CampaignDraft {
  programId?: ProgramId;
  title?: string;
  categories: CategoryId[];
  merchants: string[];
  minAmount?: number;
  ruleKind?: RuleKind;
  rate?: number; // 0.05
  reward?: number;
  requiredCount?: number;
  targetAmount?: number;
  stepAmount?: number;
  maxPerTransaction?: number;
  maxTotal?: number;
  maxUses?: number;
  differentDayRequired: boolean;
  bankPosRequired: boolean;
  requiresJoin: boolean;
  joinInfo?: string;
  startDate?: ISODate;
  endDate?: ISODate;
  pointValidityDays?: number;
}

export interface ParseResult {
  draft: CampaignDraft;
  /** Kullanıcıya gösterilecek "şunları algıladım" listesi. */
  detected: string[];
}

/** Hermes'te locale desteğine güvenmeden Türkçe küçük harfe çevirme. */
export function trLower(s: string): string {
  return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

const AMOUNT = String.raw`(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)\s*(?:tl|₺)`;

const PROGRAM_PATTERNS: [ProgramId, RegExp][] = [
  ['bonus', /\bbonus\b|garanti/],
  ['world', /worldpuan|\bworld\b|yapı kredi/],
  ['maximum', /maxipuan|maximum|iş bankası|maximiles/],
  ['axess', /chip-?para|axess|akbank/],
  ['bankkart', /bankkart|ziraat/],
  ['paraf', /parafpara|\bparaf\b|halkbank/],
  ['qnb', /parapuan|\bqnb\b|cardfinans/],
];

const CATEGORY_PATTERNS: [CategoryId, RegExp][] = [
  ['akaryakit', /akaryakıt|benzin|motorin|istasyon|opet|shell|petrol ofisi|\bbp\b|total/],
  ['market', /market|gıda|migros|a101|\bbim\b|\bşok\b|carrefour|macrocenter/],
  ['eticaret', /e-ticaret|internet|online|trendyol|hepsiburada|amazon|n11|getir|yemeksepeti/],
  ['restoran', /restoran|kafe|cafe|yemek|lokanta/],
  ['giyim', /giyim|ayakkabı|moda|tekstil|lc waikiki|koton|zara/],
  ['elektronik', /elektronik|teknosa|mediamarkt|vatan|telefon|beyaz eşya/],
  ['seyahat', /seyahat|uçak|otel|havayolu|tatil|thy|pegasus/],
];

const KNOWN_MERCHANTS = [
  'Opet', 'Shell', 'Petrol Ofisi', 'BP', 'Total', 'Sunpet', 'Migros', 'Macrocenter', 'A101',
  'BİM', 'ŞOK', 'CarrefourSA', 'Trendyol', 'Hepsiburada', 'Amazon', 'n11', 'Getir',
  'Yemeksepeti', 'Teknosa', 'MediaMarkt', 'Vatan', 'LC Waikiki', 'Koton', 'Zara', 'THY', 'Pegasus',
];

const firstNum = (re: RegExp, text: string): number | undefined => {
  const m = text.match(re);
  return m ? parseAmount(m[1]) || undefined : undefined;
};

export function parseCampaignText(raw: string): ParseResult {
  const text = trLower(raw.replace(/\s+/g, ' '));
  const detected: string[] = [];
  const draft: CampaignDraft = {
    categories: [],
    merchants: [],
    differentDayRequired: false,
    bankPosRequired: false,
    requiresJoin: false,
  };

  // Başlık: ilk cümle (tarih/tutar içindeki noktalarda bölünmez); kural bulunursa aşağıda özetle değiştirilir.
  const firstSentence = raw.trim().split(/[!?\n]|\.(?=\s|$)/)[0]?.trim();
  if (firstSentence) draft.title = firstSentence.slice(0, 90);

  // Program
  for (const [id, re] of PROGRAM_PATTERNS) {
    if (re.test(text)) {
      draft.programId = id;
      detected.push(`Kart programı: ${id}`);
      break;
    }
  }

  // Kategori ve üye işyerleri
  for (const [id, re] of CATEGORY_PATTERNS) {
    if (re.test(text)) draft.categories.push(id);
  }
  if (draft.categories.length) detected.push(`Kategori: ${draft.categories.join(', ')}`);
  for (const m of KNOWN_MERCHANTS) {
    const re = new RegExp(`(^|[^a-zçğıöşü])${trLower(m)}([^a-zçğıöşü]|$)`);
    if (re.test(text)) draft.merchants.push(m);
  }
  if (draft.merchants.length) detected.push(`Üye işyeri: ${draft.merchants.join(', ')}`);

  // Min. tutar: "1.000 TL ve üzeri", "500 TL üzeri"
  draft.minAmount = firstNum(new RegExp(`${AMOUNT}\\s*(?:ve\\s*)?(?:üzeri|üstü)`), text);

  // Farklı gün: "4 farklı günde"
  const diffDay = text.match(/(\d+)\s*farklı\s*gün/);
  if (diffDay || /farklı\s*günlerde/.test(text)) {
    draft.differentDayRequired = true;
    detected.push('Farklı gün şartı');
  }

  // POS şartı
  if (/pos'?(?:u|lar|ları|larında|unda|una)?\b/.test(text) && /(banka|bankası|garanti|yapı kredi|iş bankası|akbank|ziraat|halkbank|qnb)[^.]{0,30}pos/.test(text)) {
    draft.bankPosRequired = true;
    detected.push('Banka POS şartı');
  }

  // Katılım
  const joinCode = raw.match(/([A-ZÇĞİÖŞÜ0-9]{3,})\s*yaz(?:ıp|arak)\s*(\d{4})/);
  if (joinCode) {
    draft.requiresJoin = true;
    draft.joinInfo = `${joinCode[1]} yazıp ${joinCode[2]}'e SMS`;
    detected.push(`Katılım: ${draft.joinInfo}`);
  } else if (/katıl|sms|kampanyaya kayıt/.test(text)) {
    draft.requiresJoin = true;
    detected.push('Katılım gerekli');
  }

  // Tarihler
  const dates = [...raw.matchAll(/(\d{1,2}[./]\d{1,2}[./]\d{4})/g)]
    .map((m) => parseTRDate(m[1]))
    .filter((d): d is ISODate => !!d)
    .sort();
  if (dates.length >= 2) draft.startDate = dates[0];
  if (dates.length >= 1) {
    draft.endDate = dates[dates.length - 1];
    detected.push(`Son tarih: ${draft.endDate}`);
  }

  const validity = text.match(/(\d+)\s*gün\s*(?:içinde|içerisinde)\s*(?:kullan|harca)/);
  if (validity) draft.pointValidityDays = Number(validity[1]);

  // Limitler
  draft.maxPerTransaction = firstNum(
    new RegExp(`işlem\\s*başı(?:na)?\\s*(?:en\\s*fazla|maksimum|max\\.?)?\\s*${AMOUNT}`),
    text,
  );
  draft.maxTotal = firstNum(
    new RegExp(`(?:toplam(?:da)?|en\\s*fazla|maksimum|max\\.?)\\s*${AMOUNT}(?:'?(?:ye|ya|e|a)\\s*kadar)?\\s*(?:bonus|worldpuan|maxipuan|chip-?para|bankkart\\s*lira|parafpara|parapuan|puan|indirim|iade)`),
    text,
  );

  const rewardRe = new RegExp(
    `${AMOUNT}(?:'?(?:ye|ya|e|a)\\s*kadar)?\\s*(?:bonus|worldpuan|maxipuan|chip-?para|bankkart\\s*lira|parafpara|parapuan|puan|indirim|iade)`,
    'g',
  );
  const rewards = [...text.matchAll(rewardRe)].map((m) => parseAmount(m[1])).filter(Boolean);

  // Kural tipi
  const perStep = text.match(new RegExp(`her\\s*${AMOUNT}'?(?:ye|ya|e|a)?\\s*${AMOUNT}`));
  const percent = text.match(/(?:%\s*(\d+(?:[.,]\d+)?)|yüzde\s*(\d+(?:[.,]\d+)?))/);
  const countMatch =
    diffDay ??
    text.match(/(\d+)\s*(?:adet|farklı)?\s*(?:alışveriş|harcama|işlem)(?:e|a|ye|ya)?\s*(?:toplam|ve)/) ??
    text.match(/(\d+)\.\s*(?:alışveriş|harcama|işlem)/);
  const targetAmount = firstNum(
    new RegExp(`toplam\\s*${AMOUNT}(?:'?(?:lik|ye|ya|e|a))?\\s*(?:ve\\s*üzeri\\s*)?(?:harcama|alışveriş)`),
    text,
  );

  if (perStep) {
    draft.ruleKind = 'perStep';
    draft.stepAmount = parseAmount(perStep[1]);
    draft.reward = parseAmount(perStep[2]);
    if (!draft.minAmount) draft.minAmount = draft.stepAmount;
    detected.push(`Kademeli: her ${draft.stepAmount} TL'ye ${draft.reward} TL`);
  } else if (countMatch) {
    draft.ruleKind = 'tieredCount';
    draft.requiredCount = Number(countMatch[1]);
    draft.reward = draft.maxTotal ?? rewards[rewards.length - 1];
    detected.push(`Sayaçlı: ${draft.requiredCount} işlem`);
  } else if (targetAmount) {
    draft.ruleKind = 'tieredAmount';
    draft.targetAmount = targetAmount;
    draft.reward = rewards.find((r) => r !== targetAmount);
    detected.push(`Tutar hedefi: ${targetAmount} TL`);
  } else if (percent) {
    draft.ruleKind = 'percent';
    draft.rate = Number((percent[1] ?? percent[2]).replace(',', '.')) / 100;
    detected.push(`Oran: %${draft.rate * 100}`);
  } else if (rewards.length) {
    draft.ruleKind = 'fixed';
    draft.reward = rewards[0];
    if (/defaya\s*mahsus|bir\s*kez|1\s*kez|tek\s*sefer/.test(text)) draft.maxUses = 1;
    else {
      const uses = text.match(/(\d+)\s*(?:kez|defa|kere)/);
      if (uses) draft.maxUses = Number(uses[1]);
    }
    detected.push(`Sabit puan: ${draft.reward} TL`);
  }

  const summary = summarizeDraft(draft);
  if (summary) draft.title = summary;

  if (draft.minAmount) detected.push(`Min. tutar: ${draft.minAmount} TL`);
  if (draft.reward && draft.ruleKind !== 'perStep') detected.push(`Ödül: ${draft.reward} TL`);

  return { draft, detected };
}

const PROGRAM_POINT: Record<ProgramId, string> = {
  bonus: 'Bonus',
  world: 'Worldpuan',
  maximum: 'MaxiPuan',
  axess: 'chip-para',
  bankkart: 'Bankkart Lira',
  paraf: 'ParafPara',
  qnb: 'ParaPuan',
};

/** Algılanan kurallardan kısa başlık üretir: "Opet · 4 farklı günde 1.000 TL'ye 300 TL Bonus" */
function summarizeDraft(d: CampaignDraft): string | undefined {
  const tl = (n?: number) => (n ? formatTL(n) : '');
  const point = d.programId ? PROGRAM_POINT[d.programId] : 'puan';
  const where = d.merchants.length ? `${d.merchants.join(' & ')} · ` : '';
  const min = d.minAmount ? ` ${tl(d.minAmount)}'ye` : '';
  switch (d.ruleKind) {
    case 'tieredCount':
      if (!d.requiredCount || !d.reward) return undefined;
      return `${where}${d.requiredCount}${d.differentDayRequired ? ' farklı günde' : ' işlemde'}${min} ${tl(d.reward)} ${point}`;
    case 'tieredAmount':
      if (!d.targetAmount || !d.reward) return undefined;
      return `${where}Toplam ${tl(d.targetAmount)} harcamaya ${tl(d.reward)} ${point}`;
    case 'percent':
      return d.rate ? `${where}%${Math.round(d.rate * 1000) / 10} ${point}` : undefined;
    case 'perStep':
      return d.stepAmount && d.reward ? `${where}Her ${tl(d.stepAmount)}'ye ${tl(d.reward)} ${point}` : undefined;
    case 'fixed':
      return d.reward ? `${where}${min.trim() ? `${min.trim()} ` : ''}${tl(d.reward)} ${point}` : undefined;
    default:
      return undefined;
  }
}
