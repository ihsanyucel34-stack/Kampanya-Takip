# Kampanya Takip — Akıllı Banka Kampanya ve Kart Asistanı

Bonus, World, Maximum, Axess, Bankkart, Paraf ve QNB kampanyalarını tek uygulamada toplayan;
harcama tutarı ve kategorisine göre **en kârlı kartı** seçen ve katıldığınız kampanyaların
ilerlemesini takip eden Expo (React Native + TypeScript + Expo Router) uygulaması.
iOS, Android (Expo Go) ve web tarayıcısında çalışır.

## Çalıştırma

```bash
npm install
npm start          # QR kodu Expo Go ile okutun (iOS / Android) — port 8090
npm run web        # tarayıcıda açar (http://localhost:8090)
npm run typecheck  # TypeScript kontrolü
npm test           # Karar Motoru ve metin ayrıştırıcı testleri
```

> Expo SDK 57 kullanılır (App Store'daki Expo Go ile uyumlu).
> Sunucu 8081 yerine **8090** portunda çalışır; bazı kurumsal bilgisayarlarda McAfee Agent 8081'i kullanır.
> Telefon bağlanamıyorsa telefon ve bilgisayarın aynı ağda olduğundan ve güvenlik duvarının 8090 portuna izin verdiğinden emin olun.

## Ekranlar (alt menü)

| Sekme | İçerik |
|---|---|
| **Kasadayım** | Tutar + kategori (+ isteğe bağlı kasadaki POS bankası) girilir; cüzdandaki kartlar en kârlıdan en aza sıralanır. Her kampanya için durum, sayaç önizlemesi (2/4 → 3/4), şart rozetleri ve ipuçları gösterilir. "Bu kartla ödedim" harcamayı ilgili sayaçlara işler. |
| **Sayaçlarım** | Takip edilen kampanyaların ilerleme çubukları (`2 / 4 Harcama`, `1.800 TL / 5.000 TL`), **+1 Harcama İşle** butonu, son işlem tarihi, geri alma, kazanılan toplam puan ve **puan silinme tarihi** geri sayımı. |
| **Cüzdan & Kampanyalar** | Sahip olunan kartların seçimi, kampanyalara katılım/takip, yeni kampanya ekleme (manuel form veya kopyalanan banka metninden kural çıkarma), demo verisini sıfırlama. |

## Karar Motoru (`src/utils/decisionEngine.ts`)

- Tarih aralığı, kategori ve minimum işlem tutarı kontrolü (altındaysa "X TL daha harcayın" ipucu)
- Doğrudan kampanyalar: yüzde (işlem başı/toplam limitli), sabit puan (kullanım adedi), "her 500 TL'ye 25 TL"
- **Kademeli sayaçlı** kampanyalar: sayacı n/N → n+1/N taşır, işlem başı efektif değer = ödül / N;
  son adımda ödülün tamamı hemen kazanılır. Kalan gün, kalan farklı-gün işlem sayısına yetmiyorsa değer 0.
- **Tutar hedefli** kampanyalar: hedefe katkı oranında efektif değer (hedefi aşan kısım sayılmaz)
- **Farklı gün şartı**: bugün işlem yapıldıysa harcama sayılmaz, uyarı verilir
- **Banka POS şartı**: POS bankası seçildiyse eşleşme kontrolü, seçilmediyse uyarı rozeti
- Katılım gerektiren ama katılınmamış kampanyalar için uyarı

## Proje yapısı

```
src/
  app/                 Expo Router ekranları
    (tabs)/index.tsx   Kasadayım
    (tabs)/sayaclarim.tsx
    (tabs)/cuzdan.tsx
    kampanya-ekle.tsx  Yeni kampanya (modal)
  components/          Ortak UI bileşenleri
  data/                Kart kataloğu ve örnek kampanya/ilerleme verisi
  store/useAppStore.ts Zustand + AsyncStorage (kalıcı yerel veri)
  utils/               decisionEngine, campaignParser, tarih/biçim yardımcıları
scripts/engine-check.mjs  Bağımlılıksız testler
```

Örnek kampanyalar bankaların tipik kampanya yapılarından esinlenmiştir, gerçek kampanya
koşullarını yansıtmaz. Tarihler uygulamanın ilk açıldığı güne göre üretilir.
