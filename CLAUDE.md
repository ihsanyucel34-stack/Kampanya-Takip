# Kampanya-Takip: Akıllı Banka Kampanya ve Kart Asistanı

## Proje Özeti
Türkiye'deki bankaların (Bonus, World, Maximum, Axess, Bankkart, Paraf, QNB) alışveriş kampanyalarını tek uygulamada birleştiren, kullanıcının harcama tutarı ve kategorisine göre en avantajlı kartı seçen (Karar Motoru) ve katılınan kampanyaların ilerlemesini takip eden (Puan Sayacı) mobil uygulama (iOS, Android ve Web uyumlu).

## Teknoloji Yığını
- **Framework:** React Native (Expo SDK 52+), Expo Router, TypeScript
- **Stil & UI:** NativeWind (Tailwind CSS) veya temiz StyleSheet, Lucide-React-Native ikonları
- **State & Veri Kaydı:** Zustand + AsyncStorage (İlk fazda sunucu kurulumuna gerek kalmadan hemen test edilebilmesi için yerel depolama ve gerçekçi başlangıç verileri kullanılacak, ileride Supabase eklenecek)

## Temel Modüller (MVP)
1. **Karar Motoru ("Şu An Kasadayım" Ekranı):**
   - Kullanıcı Kategori (Akaryakıt, Market, E-Ticaret, Restoran vb.) ve Harcama Tutarı (TL) girer.
   - Algoritma (`src/utils/decisionEngine.ts`), kullanıcının cüzdanındaki kartların aktif kampanyalarını tarar:
     - Doğrudan puan/indirim veren kampanyalar.
     - Kademeli/Sayaçlı kampanyalar (Örn: "4. 1000 TL harcamaya 300 TL puan" kampanyasında kullanıcı 2/4 aşamasındaysa, bu harcamanın sayacı 3/4'e taşıyacağını ve işlem başı efektif değerini hesaplar).
     - "Farklı gün şartı" (aynı gün işlem yapıldıysa uyarır) ve "Banka POS şartı" rozetlerini gösterir.
   - En kârlıdan en az kârlıya doğru kartları sıralar.

2. **Puan ve Kampanya Sayacı ("Takip" Ekranı):**
   - Katılınan kampanyalar için ilerleme çubukları (Örn: `2 / 4 Harcama` veya `1.500 TL / 5.000 TL`).
   - Tek dokunuşla **"+ Harcama Ekle"** butonu (sayacı ilerletir ve son işlem tarihini kaydeder).
   - Kazanılan toplam puan özeti ve **Puan Silinme Tarihi (Son Kullanım Tarihi)** geri sayım uyarısı.

3. **Cüzdanım ve Kampanya Ekleme:**
   - Kullanıcının sahip olduğu banka kartlarını seçtiği ekran.
   - Manuel kampanya ekleme formu ve kopyalanan banka kampanya metninden kuralları çıkaran şablon yapısı.
