import type { Campaign, CampaignProgress, ISODate, ProgressMap } from '../types';
import { addDays } from '../utils/date';

/**
 * Gerçekçi örnek kampanyalar. Tarihler, uygulamanın ilk açıldığı güne göre
 * hesaplanır; böylece demo verisi hiçbir zaman "süresi geçmiş" görünmez.
 * Not: Kampanyalar bankaların tipik kampanya yapılarından esinlenmiş örneklerdir.
 */
export function createSeedCampaigns(today: ISODate): Campaign[] {
  const start = addDays(today, -10);
  return [
    // ---------------- AKARYAKIT ----------------
    {
      id: 'bonus-opet-4x1000',
      programId: 'bonus',
      title: "Opet'te 4 farklı günde 1.000 TL'ye toplam 300 TL Bonus",
      description:
        "Opet ve Sunpet istasyonlarında 4 farklı günde yapılacak 1.000 TL ve üzeri her akaryakıt alışverişi sayılır; 4. harcamada toplam 300 TL Bonus yüklenir.",
      categories: ['akaryakit'],
      merchants: ['Opet', 'Sunpet'],
      minAmount: 1000,
      rule: { kind: 'tieredCount', requiredCount: 4, reward: 300 },
      differentDayRequired: true,
      bankPosRequired: false,
      requiresJoin: true,
      joinInfo: "BONUSOPET yazıp 3340'a SMS veya BonusFlaş",
      startDate: start,
      endDate: addDays(today, 24),
      pointValidityDays: 60,
    },
    {
      id: 'world-shell-yuzde5',
      programId: 'world',
      title: "Shell'de %5 Worldpuan (işlem başı 100 TL'ye kadar)",
      description:
        "Shell istasyonlarında Yapı Kredi POS'u ile yapılan 750 TL ve üzeri akaryakıt harcamalarına %5, kampanya boyunca toplam 400 TL'ye kadar Worldpuan.",
      categories: ['akaryakit'],
      merchants: ['Shell'],
      minAmount: 750,
      rule: { kind: 'percent', rate: 0.05, maxPerTransaction: 100, maxTotal: 400 },
      differentDayRequired: false,
      bankPosRequired: true,
      requiresJoin: true,
      joinInfo: 'World Mobil > Kampanyalar > Katıl',
      startDate: start,
      endDate: addDays(today, 38),
      pointValidityDays: 90,
    },
    {
      id: 'axess-akaryakit-yuzde4',
      programId: 'axess',
      title: "Akbank POS'lu istasyonlarda %4 chip-para",
      description:
        "Akbank POS'u bulunan tüm akaryakıt istasyonlarında 500 TL ve üzeri harcamalara %4, işlem başı en fazla 80 TL chip-para.",
      categories: ['akaryakit'],
      minAmount: 500,
      rule: { kind: 'percent', rate: 0.04, maxPerTransaction: 80, maxTotal: 240 },
      differentDayRequired: false,
      bankPosRequired: true,
      requiresJoin: false,
      startDate: start,
      endDate: addDays(today, 15),
      pointValidityDays: 45,
    },
    {
      id: 'bankkart-akaryakit-her500',
      programId: 'bankkart',
      title: "Akaryakıtta her 500 TL'ye 25 TL Bankkart Lira",
      description:
        "Tüm akaryakıt istasyonlarında her 500 TL harcamaya 25 TL, toplamda 150 TL'ye kadar Bankkart Lira.",
      categories: ['akaryakit'],
      minAmount: 500,
      rule: { kind: 'perStep', stepAmount: 500, stepReward: 25, maxTotal: 150 },
      differentDayRequired: false,
      bankPosRequired: false,
      requiresJoin: true,
      joinInfo: "AKARYAKIT yazıp 4757'ye SMS",
      startDate: start,
      endDate: addDays(today, 30),
      pointValidityDays: 30,
    },

    // ---------------- MARKET ----------------
    {
      id: 'bonus-migros-75',
      programId: 'bonus',
      title: "Migros'ta 750 TL'ye 75 TL Bonus (3 kez)",
      description:
        "Migros, Macrocenter ve Migros Sanal Market'te 750 TL ve üzeri her alışverişe 75 TL, toplam 225 TL Bonus.",
      categories: ['market'],
      merchants: ['Migros', 'Macrocenter'],
      minAmount: 750,
      rule: { kind: 'fixed', reward: 75, maxUses: 3 },
      differentDayRequired: true,
      bankPosRequired: false,
      requiresJoin: true,
      joinInfo: "MIGROS yazıp 3340'a SMS",
      startDate: start,
      endDate: addDays(today, 20),
      pointValidityDays: 60,
    },
    {
      id: 'maximum-market-3x500',
      programId: 'maximum',
      title: "Markette 3 farklı günde 500 TL'ye 150 TL MaxiPuan",
      description:
        "İş Bankası POS'u kullanan marketlerde 3 farklı günde yapılacak 500 TL ve üzeri harcamaların ardından toplam 150 TL MaxiPuan.",
      categories: ['market'],
      minAmount: 500,
      rule: { kind: 'tieredCount', requiredCount: 3, reward: 150 },
      differentDayRequired: true,
      bankPosRequired: true,
      requiresJoin: true,
      joinInfo: 'İşCep / Maximum Mobil > Katıl',
      startDate: start,
      endDate: addDays(today, 18),
      pointValidityDays: 30,
    },
    {
      id: 'bankkart-market-2x1000',
      programId: 'bankkart',
      title: "Markette 2 farklı günde 1.000 TL'ye 200 TL Bankkart Lira",
      description:
        "Market ve gıda sektöründe 2 farklı günde yapılan 1.000 TL ve üzeri alışverişlere toplam 200 TL Bankkart Lira.",
      categories: ['market'],
      minAmount: 1000,
      rule: { kind: 'tieredCount', requiredCount: 2, reward: 200 },
      differentDayRequired: true,
      bankPosRequired: false,
      requiresJoin: true,
      joinInfo: "MARKET yazıp 4757'ye SMS",
      startDate: addDays(today, -40),
      endDate: addDays(today, 5),
      pointValidityDays: 30,
    },
    {
      id: 'world-market-yuzde10',
      programId: 'world',
      title: "Zincir marketlerde %10 Worldpuan (toplam 250 TL)",
      description:
        "A101, BİM, ŞOK ve CarrefourSA'da 400 TL ve üzeri alışverişlere %10, işlem başı 50 TL, toplam 250 TL Worldpuan.",
      categories: ['market'],
      merchants: ['A101', 'BİM', 'ŞOK', 'CarrefourSA'],
      minAmount: 400,
      rule: { kind: 'percent', rate: 0.1, maxPerTransaction: 50, maxTotal: 250 },
      differentDayRequired: false,
      bankPosRequired: false,
      requiresJoin: true,
      joinInfo: 'World Mobil > Kampanyalar > Katıl',
      startDate: start,
      endDate: addDays(today, 12),
      pointValidityDays: 60,
    },

    // ---------------- E-TİCARET ----------------
    {
      id: 'world-eticaret-5000',
      programId: 'world',
      title: "İnternetten toplam 5.000 TL harcamaya 250 TL Worldpuan",
      description:
        "Tüm e-ticaret sitelerinde yapılan 250 TL ve üzeri harcamalar toplanır; toplam 5.000 TL'ye ulaşıldığında 250 TL Worldpuan.",
      categories: ['eticaret'],
      minAmount: 250,
      rule: { kind: 'tieredAmount', targetAmount: 5000, reward: 250 },
      differentDayRequired: false,
      bankPosRequired: false,
      requiresJoin: true,
      joinInfo: "WEB yazıp 4454'e SMS",
      startDate: start,
      endDate: addDays(today, 40),
      pointValidityDays: 90,
    },
    {
      id: 'axess-eticaret-150',
      programId: 'axess',
      title: "Trendyol & Hepsiburada'da 1.500 TL'ye 150 TL chip-para",
      description:
        "Trendyol veya Hepsiburada'da tek seferde 1.500 TL ve üzeri alışverişe bir defaya mahsus 150 TL chip-para.",
      categories: ['eticaret'],
      merchants: ['Trendyol', 'Hepsiburada'],
      minAmount: 1500,
      rule: { kind: 'fixed', reward: 150, maxUses: 1 },
      differentDayRequired: false,
      bankPosRequired: false,
      requiresJoin: true,
      joinInfo: "ETICARET yazıp 4566'ya SMS",
      startDate: start,
      endDate: addDays(today, 9),
      pointValidityDays: 30,
    },
    {
      id: 'bonus-eticaret-yuzde3',
      programId: 'bonus',
      title: 'Online alışverişlerde %3 Bonus',
      description:
        "Tüm internet alışverişlerinde 300 TL ve üzeri harcamalara %3, toplamda 300 TL'ye kadar Bonus.",
      categories: ['eticaret', 'elektronik', 'giyim'],
      minAmount: 300,
      rule: { kind: 'percent', rate: 0.03, maxTotal: 300 },
      differentDayRequired: false,
      bankPosRequired: false,
      requiresJoin: false,
      startDate: start,
      endDate: addDays(today, 45),
      pointValidityDays: 60,
    },
    {
      id: 'maximum-eticaret-4x750',
      programId: 'maximum',
      title: "İnternette 4 alışverişe 4. işlemde 200 TL MaxiPuan",
      description:
        "E-ticaret sitelerinde yapılacak 750 TL ve üzeri 4 alışverişin sonunda toplam 200 TL MaxiPuan. Aynı gün yapılan işlemler de sayılır.",
      categories: ['eticaret'],
      minAmount: 750,
      rule: { kind: 'tieredCount', requiredCount: 4, reward: 200 },
      differentDayRequired: false,
      bankPosRequired: false,
      requiresJoin: true,
      joinInfo: 'Maximum Mobil > Katıl',
      startDate: start,
      endDate: addDays(today, 28),
      pointValidityDays: 45,
    },

    // ---------------- RESTORAN / DİĞER ----------------
    {
      id: 'maximum-restoran-yuzde10',
      programId: 'maximum',
      title: "Restoranlarda %10 MaxiPuan (200 TL'ye kadar)",
      description:
        "Restoran ve kafelerde 300 TL ve üzeri harcamalara %10, toplam 200 TL'ye kadar MaxiPuan.",
      categories: ['restoran'],
      minAmount: 300,
      rule: { kind: 'percent', rate: 0.1, maxTotal: 200 },
      differentDayRequired: false,
      bankPosRequired: false,
      requiresJoin: true,
      joinInfo: 'Maximum Mobil > Katıl',
      startDate: start,
      endDate: addDays(today, 21),
      pointValidityDays: 30,
    },
    {
      id: 'paraf-restoran-yuzde15',
      programId: 'paraf',
      title: "Restoranlarda %15 ParafPara",
      description:
        "Halkbank POS'u olan restoranlarda 400 TL ve üzeri harcamalara %15, işlem başı 75 TL, toplam 150 TL ParafPara.",
      categories: ['restoran'],
      minAmount: 400,
      rule: { kind: 'percent', rate: 0.15, maxPerTransaction: 75, maxTotal: 150 },
      differentDayRequired: true,
      bankPosRequired: true,
      requiresJoin: false,
      startDate: start,
      endDate: addDays(today, 25),
      pointValidityDays: 30,
    },
    {
      id: 'axess-giyim-3x1000',
      programId: 'axess',
      title: "Giyimde 3 farklı günde 1.000 TL'ye 250 TL chip-para",
      description:
        "Giyim ve ayakkabı mağazalarında 3 farklı günde yapılan 1.000 TL ve üzeri harcamalara toplam 250 TL chip-para.",
      categories: ['giyim'],
      minAmount: 1000,
      rule: { kind: 'tieredCount', requiredCount: 3, reward: 250 },
      differentDayRequired: true,
      bankPosRequired: false,
      requiresJoin: true,
      joinInfo: "GIYIM yazıp 4566'ya SMS",
      startDate: start,
      endDate: addDays(today, 33),
      pointValidityDays: 45,
    },
    {
      id: 'qnb-elektronik-yuzde5',
      programId: 'qnb',
      title: "Elektronikte %5 ParaPuan (500 TL'ye kadar)",
      description:
        "Teknosa, MediaMarkt ve Vatan Bilgisayar'da 2.000 TL ve üzeri alışverişlere %5, toplam 500 TL ParaPuan.",
      categories: ['elektronik'],
      merchants: ['Teknosa', 'MediaMarkt', 'Vatan'],
      minAmount: 2000,
      rule: { kind: 'percent', rate: 0.05, maxTotal: 500 },
      differentDayRequired: false,
      bankPosRequired: false,
      requiresJoin: true,
      joinInfo: 'QNB Mobil > Kampanyalar',
      startDate: start,
      endDate: addDays(today, 35),
      pointValidityDays: 60,
    },
    {
      id: 'world-seyahat-yuzde8',
      programId: 'world',
      title: "Uçak ve otel harcamalarına %8 Worldpuan",
      description:
        "Havayolu ve otel harcamalarında 2.500 TL ve üzeri işlemlere %8, toplam 600 TL Worldpuan.",
      categories: ['seyahat'],
      minAmount: 2500,
      rule: { kind: 'percent', rate: 0.08, maxTotal: 600 },
      differentDayRequired: false,
      bankPosRequired: false,
      requiresJoin: true,
      joinInfo: 'World Mobil > Kampanyalar > Katıl',
      startDate: start,
      endDate: addDays(today, 50),
      pointValidityDays: 120,
    },
  ];
}

function progress(
  campaignId: string,
  partial: Partial<CampaignProgress> = {},
): CampaignProgress {
  return {
    campaignId,
    joined: true,
    count: 0,
    totalSpent: 0,
    earned: 0,
    transactions: [],
    ...partial,
  };
}

/** Demo için hazır gelen kampanya ilerlemeleri. */
export function createSeedProgress(today: ISODate): ProgressMap {
  const list: CampaignProgress[] = [
    // CLAUDE.md'deki örnek: 4 aşamalı kampanyada 2/4.
    progress('bonus-opet-4x1000', {
      count: 2,
      totalSpent: 2450,
      lastTransactionDate: addDays(today, -3),
      transactions: [
        { date: addDays(today, -8), amount: 1200, reward: 0 },
        { date: addDays(today, -3), amount: 1250, reward: 0 },
      ],
    }),
    // Bugün işlem yapılmış -> farklı gün uyarısını göstermek için.
    progress('maximum-market-3x500', {
      count: 1,
      totalSpent: 640,
      lastTransactionDate: today,
      transactions: [{ date: today, amount: 640, reward: 0 }],
    }),
    progress('world-eticaret-5000', {
      count: 3,
      totalSpent: 1800,
      lastTransactionDate: addDays(today, -2),
      transactions: [
        { date: addDays(today, -9), amount: 450, reward: 0 },
        { date: addDays(today, -6), amount: 600, reward: 0 },
        { date: addDays(today, -2), amount: 750, reward: 0 },
      ],
    }),
    // Tamamlanmış kampanya, puanının silinmesine az kalmış.
    progress('bankkart-market-2x1000', {
      count: 2,
      totalSpent: 2300,
      earned: 200,
      lastTransactionDate: addDays(today, -25),
      pointExpiryDate: addDays(today, 5),
      transactions: [
        { date: addDays(today, -32), amount: 1100, reward: 0 },
        { date: addDays(today, -25), amount: 1200, reward: 200 },
      ],
    }),
    progress('bonus-migros-75', {
      count: 1,
      totalSpent: 910,
      earned: 75,
      lastTransactionDate: addDays(today, -4),
      pointExpiryDate: addDays(today, 56),
      transactions: [{ date: addDays(today, -4), amount: 910, reward: 75 }],
    }),
    progress('world-shell-yuzde5'),
    progress('maximum-restoran-yuzde10', {
      count: 1,
      totalSpent: 850,
      earned: 85,
      lastTransactionDate: addDays(today, -6),
      pointExpiryDate: addDays(today, 24),
      transactions: [{ date: addDays(today, -6), amount: 850, reward: 85 }],
    }),
  ];
  return Object.fromEntries(list.map((p) => [p.campaignId, p]));
}
