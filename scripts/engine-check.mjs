// Karar Motoru ve metin ayrıştırıcı için bağımlılıksız hızlı testler.
// Kullanım: npm test
// src/ altındaki .ts dosyalarını TypeScript ile CommonJS'e çevirip geçici klasörde çalıştırır.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kampanya-check-'));

function transpileDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'app' && entry.name !== 'components') transpileDir(full);
    } else if (entry.name.endsWith('.ts')) {
      const rel = path.relative(path.join(root, 'src'), full).replace(/\.ts$/, '.js');
      const { outputText } = ts.transpileModule(fs.readFileSync(full, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
      });
      fs.mkdirSync(path.dirname(path.join(outDir, rel)), { recursive: true });
      fs.writeFileSync(path.join(outDir, rel), outputText);
    }
  }
}
transpileDir(path.join(root, 'src'));

const require = createRequire(path.join(outDir, 'index.js'));
const engine = require('./utils/decisionEngine.js');
const { parseCampaignText } = require('./utils/campaignParser.js');
const { createSeedCampaigns, createSeedProgress } = require('./data/seed.js');
const { CARDS, DEFAULT_OWNED_CARD_IDS } = require('./data/catalog.js');
const { addDays } = require('./utils/date.js');
const { formatTL, parseAmount } = require('./utils/format.js');

const today = '2026-10-22';
const campaigns = createSeedCampaigns(today);
const progress = createSeedProgress(today);
const cards = CARDS.filter((c) => DEFAULT_OWNED_CARD_IDS.includes(c.id));
const byId = (id) => campaigns.find((c) => c.id === id);
let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log(`✓ ${name}`);
};

test('format & parse', () => {
  assert.equal(formatTL(12345), '12.345 TL');
  assert.equal(parseAmount('1.250,50'), 1250.5);
  assert.equal(parseAmount('1.000'), 1000);
  assert.equal(parseAmount('750'), 750);
});

test('kademeli sayaç: 2/4 → 3/4, işlem başı efektif 75 TL', () => {
  const e = engine.evaluateCampaign(byId('bonus-opet-4x1000'), progress['bonus-opet-4x1000'], {
    amount: 1200,
    date: today,
  });
  assert.equal(e.status, 'eligible');
  assert.equal(e.effectiveValue, 75);
  assert.equal(e.immediateReward, 0);
  assert.equal(e.progressBefore, '2 / 4 Harcama');
  assert.equal(e.progressAfter, '3 / 4 Harcama');
});

test('kademeli sayaç: son adım ödülü hemen kazandırır', () => {
  const p = { ...progress['bonus-opet-4x1000'], count: 3 };
  const e = engine.evaluateCampaign(byId('bonus-opet-4x1000'), p, { amount: 1000, date: today });
  assert.equal(e.completesCampaign, true);
  assert.equal(e.immediateReward, 300);
});

test('min tutar altı: belowMin + ipucu', () => {
  const e = engine.evaluateCampaign(byId('bonus-opet-4x1000'), progress['bonus-opet-4x1000'], {
    amount: 800,
    date: today,
  });
  assert.equal(e.status, 'belowMin');
  assert.match(e.hint, /200 TL daha/);
});

test('farklı gün şartı: bugün işlem yapılmışsa sayılmaz', () => {
  const e = engine.evaluateCampaign(byId('maximum-market-3x500'), progress['maximum-market-3x500'], {
    amount: 600,
    date: today,
  });
  assert.equal(e.status, 'blocked');
  assert.ok(e.badges.find((b) => b.kind === 'differentDay').violated);
  const tomorrow = engine.evaluateCampaign(byId('maximum-market-3x500'), progress['maximum-market-3x500'], {
    amount: 600,
    date: addDays(today, 1),
  });
  assert.equal(tomorrow.status, 'eligible');
});

test('banka POS şartı: farklı banka POS → blocked, bilinmiyor → uyarı', () => {
  const c = byId('world-shell-yuzde5');
  const wrong = engine.evaluateCampaign(c, progress[c.id], { amount: 1000, date: today, posProgramId: 'bonus' });
  assert.equal(wrong.status, 'blocked');
  const unknown = engine.evaluateCampaign(c, progress[c.id], { amount: 1000, date: today });
  assert.equal(unknown.status, 'eligible');
  assert.equal(unknown.immediateReward, 50);
  assert.ok(unknown.warnings.some((w) => w.includes('POS')));
});

test('yüzde kampanyası işlem başı limit', () => {
  const c = byId('world-shell-yuzde5');
  const e = engine.evaluateCampaign(c, progress[c.id], { amount: 4000, date: today });
  assert.equal(e.immediateReward, 100);
});

test('her 500 TL’ye 25 TL kademeli puan', () => {
  const c = byId('bankkart-akaryakit-her500');
  const e = engine.evaluateCampaign(c, undefined, { amount: 1450, date: today });
  assert.equal(e.immediateReward, 50);
  assert.ok(e.needsJoin);
});

test('tutar hedefli kampanya: hedefe katkı oranında değer', () => {
  const c = byId('world-eticaret-5000');
  const e = engine.evaluateCampaign(c, progress[c.id], { amount: 1000, date: today });
  assert.equal(e.effectiveValue, 50);
  const done = engine.evaluateCampaign(c, progress[c.id], { amount: 5000, date: today });
  assert.equal(done.countedAmount, 3200);
  assert.equal(done.immediateReward, 250);
});

test('süre yetersizse sayaçlı kampanya değersiz', () => {
  const c = { ...byId('bonus-opet-4x1000'), endDate: addDays(today, 0) };
  const e = engine.evaluateCampaign(c, progress[c.id], { amount: 1000, date: today });
  assert.equal(e.status, 'blocked');
});

test('tamamlanan kampanya exhausted', () => {
  const c = byId('bankkart-market-2x1000');
  const e = engine.evaluateCampaign(c, progress[c.id], { amount: 1500, date: today });
  assert.equal(e.status, 'exhausted');
});

test('recommendCards: akaryakıt 1.000 TL sıralaması kârlıdan aza', () => {
  const recs = engine.recommendCards({ amount: 1000, category: 'akaryakit', date: today, cards, campaigns, progress });
  for (let i = 1; i < recs.length; i++) {
    assert.ok(recs[i - 1].totalEffectiveValue >= recs[i].totalEffectiveValue);
  }
  assert.equal(recs[0].card.programId, 'bonus'); // 75 TL efektif (Opet 3/4)
  console.log(
    '   ' + recs.map((r) => `${r.card.name}: ${r.totalEffectiveValue.toFixed(2)}`).join(' | '),
  );
});

test('applyTransaction sayacı ilerletir, aynı gün tekrar sayılmaz', () => {
  const c = byId('bonus-opet-4x1000');
  const r1 = engine.applyTransaction(c, progress[c.id], { amount: 1100, date: today });
  assert.equal(r1.applied, true);
  assert.equal(r1.progress.count, 3);
  const r2 = engine.applyTransaction(c, r1.progress, { amount: 1100, date: today });
  assert.equal(r2.applied, false);
  const r3 = engine.applyTransaction(c, r1.progress, { amount: 1100, date: addDays(today, 1) });
  assert.equal(r3.progress.earned, 300);
  assert.equal(r3.progress.pointExpiryDate, addDays(today, 61));
});

test('metin ayrıştırıcı: sayaçlı Opet kampanyası', () => {
  const { draft } = parseCampaignText(
    "Bonus Card'ınızla 01.11.2026 - 30.11.2026 tarihleri arasında Opet istasyonlarında 4 farklı günde yapacağınız 1.000 TL ve üzeri akaryakıt alışverişlerinize toplam 300 TL Bonus! Katılım için BONUSOPET yazıp 3340'a SMS gönderin. Kazanılan Bonuslar 60 gün içinde kullanılmalıdır.",
  );
  assert.equal(draft.programId, 'bonus');
  assert.equal(draft.ruleKind, 'tieredCount');
  assert.equal(draft.requiredCount, 4);
  assert.equal(draft.reward, 300);
  assert.equal(draft.minAmount, 1000);
  assert.equal(draft.differentDayRequired, true);
  assert.equal(draft.requiresJoin, true);
  assert.equal(draft.endDate, '2026-11-30');
  assert.equal(draft.pointValidityDays, 60);
  assert.deepEqual(draft.categories, ['akaryakit']);
  assert.deepEqual(draft.merchants, ['Opet']);
  assert.equal(draft.startDate, '2026-11-01');
  assert.equal(draft.title, "Opet · 4 farklı günde 1.000 TL'ye 300 TL Bonus");
});

test('başlamamış kampanyaya harcama işlenmez', () => {
  const c = { ...byId('bonus-opet-4x1000'), startDate: addDays(today, 3) };
  const r = engine.applyTransaction(c, progress[c.id], { amount: 1500, date: today });
  assert.equal(r.applied, false);
  assert.match(r.evaluation.warnings.join(' '), /henüz başlamadı/);
});

test('metin ayrıştırıcı: yüzde + POS + limit', () => {
  const { draft } = parseCampaignText(
    "Yapı Kredi POS'larında market harcamalarınıza %10, işlem başı en fazla 50 TL, toplamda 250 TL Worldpuan. 500 TL ve üzeri harcamalar geçerlidir. Son gün 15.12.2026.",
  );
  assert.equal(draft.programId, 'world');
  assert.equal(draft.ruleKind, 'percent');
  assert.equal(draft.rate, 0.1);
  assert.equal(draft.maxPerTransaction, 50);
  assert.equal(draft.maxTotal, 250);
  assert.equal(draft.bankPosRequired, true);
  assert.equal(draft.minAmount, 500);
});

test('metin ayrıştırıcı: her X TL’ye Y TL', () => {
  const { draft } = parseCampaignText("Bankkart ile akaryakıtta her 500 TL'ye 25 TL Bankkart Lira, toplam 150 TL Bankkart Lira.");
  assert.equal(draft.ruleKind, 'perStep');
  assert.equal(draft.stepAmount, 500);
  assert.equal(draft.reward, 25);
  assert.equal(draft.maxTotal, 150);
});

test('metin ayrıştırıcı: tutar hedefli', () => {
  const { draft } = parseCampaignText('World ile internetten toplam 5.000 TL harcamaya 250 TL Worldpuan.');
  assert.equal(draft.ruleKind, 'tieredAmount');
  assert.equal(draft.targetAmount, 5000);
  assert.equal(draft.reward, 250);
});

fs.rmSync(outDir, { recursive: true, force: true });
console.log(`\n${passed} test geçti.`);
