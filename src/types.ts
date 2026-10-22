/** Kart programları (CLAUDE.md'de listelenen ana programlar). */
export type ProgramId = 'bonus' | 'world' | 'maximum' | 'axess' | 'bankkart' | 'paraf' | 'qnb';

export type CategoryId =
  | 'akaryakit'
  | 'market'
  | 'eticaret'
  | 'restoran'
  | 'giyim'
  | 'elektronik'
  | 'seyahat';

/** YYYY-MM-DD biçiminde yerel tarih. */
export type ISODate = string;

export interface Program {
  id: ProgramId;
  name: string;
  /** Kart görselinde kullanılan kısa ad. */
  shortName: string;
  bank: string;
  /** Kazanılan puanın adı (Bonus, Worldpuan, MaxiPuan, chip-para...). */
  pointName: string;
  color: string;
  textColor: string;
}

export interface Card {
  id: string;
  programId: ProgramId;
  name: string;
  network: 'Visa' | 'Mastercard' | 'Troy';
}

export interface Category {
  id: CategoryId;
  label: string;
}

/**
 * Kampanya kuralları.
 * - `percent`: harcamanın %'si kadar puan (işlem başı ve toplam limitli olabilir)
 * - `fixed`: min tutarı geçen her işleme sabit puan (kullanım adedi limitli olabilir)
 * - `perStep`: "her 500 TL'ye 25 TL" tipi kademeli puan
 * - `tieredCount`: "4 farklı günde 1.000 TL+ harcamaya toplam 300 TL" tipi sayaçlı kampanya
 * - `tieredAmount`: "toplam 5.000 TL harcamaya 250 TL" tipi tutar biriktirmeli kampanya
 */
export type CampaignRule =
  | { kind: 'percent'; rate: number; maxPerTransaction?: number; maxTotal?: number }
  | { kind: 'fixed'; reward: number; maxUses?: number }
  | { kind: 'perStep'; stepAmount: number; stepReward: number; maxTotal?: number }
  | { kind: 'tieredCount'; requiredCount: number; reward: number }
  | { kind: 'tieredAmount'; targetAmount: number; reward: number };

export interface Campaign {
  id: string;
  programId: ProgramId;
  title: string;
  description: string;
  categories: CategoryId[];
  /** Belirli üye işyeri şartı (Opet, Migros...). Boşsa kategori genelinde geçerli. */
  merchants?: string[];
  /** Kampanyaya sayılması için tek işlemde gereken en düşük tutar (TL). */
  minAmount: number;
  rule: CampaignRule;
  /** Aynı gün yapılan ikinci işlem sayılmaz. */
  differentDayRequired: boolean;
  /** Yalnızca kampanyayı veren bankanın POS cihazlarında geçerli. */
  bankPosRequired: boolean;
  /** SMS / mobil uygulama üzerinden katılım gerekiyor mu? */
  requiresJoin: boolean;
  joinInfo?: string;
  startDate: ISODate;
  endDate: ISODate;
  /** Kazanılan puanın kaç gün içinde harcanması gerektiği (Puan Silinme Tarihi). */
  pointValidityDays: number;
  isCustom?: boolean;
}

export interface TransactionRecord {
  date: ISODate;
  amount: number;
  /** Kampanyaya sayılan kısım (tutar hedefli kampanyada hedefi aşan kısım sayılmaz). */
  counted?: number;
  reward: number;
}

export interface CampaignProgress {
  campaignId: string;
  joined: boolean;
  /** Sayılan işlem adedi (kademeli sayaç için). */
  count: number;
  /** Kampanyaya sayılan toplam harcama (TL). */
  totalSpent: number;
  /** Kazanılan toplam puan (TL karşılığı). */
  earned: number;
  lastTransactionDate?: ISODate;
  transactions: TransactionRecord[];
  /** Kazanılan puanın silineceği tarih. */
  pointExpiryDate?: ISODate;
}

export type ProgressMap = Record<string, CampaignProgress>;
