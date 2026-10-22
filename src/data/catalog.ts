import type { Card, Category, CategoryId, Program, ProgramId } from '../types';

export const PROGRAMS: Record<ProgramId, Program> = {
  bonus: { id: 'bonus', name: 'Bonus', shortName: 'Bonus', bank: 'Garanti BBVA', pointName: 'Bonus', color: '#0E8A5F', textColor: '#FFFFFF' },
  world: { id: 'world', name: 'World', shortName: 'World', bank: 'Yapı Kredi', pointName: 'Worldpuan', color: '#5B2C83', textColor: '#FFFFFF' },
  maximum: { id: 'maximum', name: 'Maximum', shortName: 'Maximum', bank: 'İş Bankası', pointName: 'MaxiPuan', color: '#E2007A', textColor: '#FFFFFF' },
  axess: { id: 'axess', name: 'Axess', shortName: 'Axess', bank: 'Akbank', pointName: 'chip-para', color: '#D6001C', textColor: '#FFFFFF' },
  bankkart: { id: 'bankkart', name: 'Bankkart', shortName: 'Bankkart', bank: 'Ziraat Bankası', pointName: 'Bankkart Lira', color: '#C8102E', textColor: '#FFFFFF' },
  paraf: { id: 'paraf', name: 'Paraf', shortName: 'Paraf', bank: 'Halkbank', pointName: 'ParafPara', color: '#00A3E0', textColor: '#FFFFFF' },
  qnb: { id: 'qnb', name: 'QNB Kart', shortName: 'QNB', bank: 'QNB', pointName: 'ParaPuan', color: '#4B0A55', textColor: '#FFFFFF' },
};

export const PROGRAM_LIST: Program[] = Object.values(PROGRAMS);

export const CARDS: Card[] = [
  { id: 'garanti-bonus', programId: 'bonus', name: 'Garanti BBVA Bonus Card', network: 'Mastercard' },
  { id: 'garanti-bonus-flexi', programId: 'bonus', name: 'Bonus Flexi', network: 'Visa' },
  { id: 'yk-world', programId: 'world', name: 'Yapı Kredi World Card', network: 'Visa' },
  { id: 'yk-world-play', programId: 'world', name: 'Play Card', network: 'Mastercard' },
  { id: 'is-maximum', programId: 'maximum', name: 'İş Bankası Maximum Kart', network: 'Visa' },
  { id: 'is-maximiles', programId: 'maximum', name: 'Maximiles', network: 'Mastercard' },
  { id: 'akbank-axess', programId: 'axess', name: 'Akbank Axess', network: 'Mastercard' },
  { id: 'ziraat-bankkart', programId: 'bankkart', name: 'Ziraat Bankkart Combo', network: 'Troy' },
  { id: 'halkbank-paraf', programId: 'paraf', name: 'Halkbank Paraf', network: 'Mastercard' },
  { id: 'qnb-kart', programId: 'qnb', name: 'QNB Kart', network: 'Visa' },
];

/** İlk açılışta cüzdanda hazır gelen kartlar. */
export const DEFAULT_OWNED_CARD_IDS = [
  'garanti-bonus',
  'yk-world',
  'is-maximum',
  'akbank-axess',
  'ziraat-bankkart',
];

export const CATEGORIES: Category[] = [
  { id: 'akaryakit', label: 'Akaryakıt' },
  { id: 'market', label: 'Market' },
  { id: 'eticaret', label: 'E-Ticaret' },
  { id: 'restoran', label: 'Restoran' },
  { id: 'giyim', label: 'Giyim' },
  { id: 'elektronik', label: 'Elektronik' },
  { id: 'seyahat', label: 'Seyahat' },
];

export const categoryLabel = (id: CategoryId) =>
  CATEGORIES.find((c) => c.id === id)?.label ?? id;

export const getCard = (id: string) => CARDS.find((c) => c.id === id);
