<div align="center">
  <h1>🎯 10'u Tuttur (10.00s Catch Game)</h1>
  <p><strong>Mükemmel Refleks, Kusursuz Zamanlama!</strong></p>
  
  [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FFall-Of-Cybertron%2F10s-catch-game)
</div>

<br/>

Üniversite etkinlikleri ve stantlar için özel olarak tasarlanmış, **yüksek rekabetli ve hile korumalı** bir refleks oyunudur. Hedef çok basit: Sayacı tam olarak **10.00** saniyede durdurmak! 

## 🚀 Canlı Oyna

👉 **[Hemen Oynamak İçin Tıklayın](https://10s-catch-game.vercel.app)** 👈

<div align="center">
  <p><strong>Veya Telefonunuzun Kamerasına Okutun:</strong></p>
  <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://10s-catch-game.vercel.app" alt="QR Code" width="200" height="200"/>
</div>

---

## 🎮 Oyunun Kuralları
1. **Hedef 10.00:** Başla butonuna bas ve sayacı tam `10.00s` (+/- 0.015s tolerans) anında durdur.
2. **Liderlik Tablosu:** Sadece en iyiler ve hedefe en çok yaklaşanlar anlık olarak TOP 10 tablosuna girer.
3. **Sınırsız Deneme:** Daha iyi bir skor yapmak için cihazınızdan sınırsız sayıda deneme yapabilirsiniz.
4. **Tek Ödül:** Etkinlik sonunda İlk 3 (Top 3) oyuncuya ödül verilir, bir kişi sadece bir ödül kazanabilir.

## 🛡️ Güvenlik ve Hile Koruması (Anti-Cheat)
Bir üniversite etkinliğinde öğrencilerin hile yapmasını engellemek için sistem "Askeri Düzey" önlemlerle donatılmıştır:

- **Server-Side Zamanlama (HMAC):** Süre tarayıcıda değil, Vercel Edge Server üzerinde kriptografik imzalarla hesaplanır. İstemci (Client) üzerinden gönderilen sahte zamanlar (`time_diff` manipülasyonu) otomatik olarak reddedilir.
- **Donanım Parmak İzi (FingerprintJS):** `localStorage` silinse veya Gizli Sekme açılsa dahi cihazın donanım kimliği tespit edilir. Bir cihazın Liderlik Tablosunda sadece tek bir yeri olabilir.
- **Gelişmiş Küfür & Argo Filtresi:** Sadece bilinen argo kelimeleri değil, "L33t-speak" (şifreli yazım), kelime arasına boşluk bırakma, art arda harf uzatma gibi hileleri de tespit eden çok katmanlı, akıllı bir küfür filtresi mevcuttur.
- **Yönetici Paneli & IP Banning:** Sadece şifre ile girilebilen `/admin` paneli üzerinden anlık olarak skorlar silinebilir, cihazlara (Fingerprint) donanım engeli atılabilir veya kampüs dışı saldırılarda IP Ban uygulanabilir.
- **Mobil Koruması:** `touch-action`, `user-select` gibi CSS önlemleriyle oyunu oynarken ekranı yanlışlıkla kaydırma veya metin seçme sorunları tamamen engellenmiştir.

## 💻 Teknoloji Yığını (Tech Stack)
* **Framework:** [Next.js 16 (App Router)](https://nextjs.org)
* **Backend / Veritabanı:** [Supabase (PostgreSQL)](https://supabase.com)
* **Styling:** [Tailwind CSS](https://tailwindcss.com) + Lucide Icons
* **Deployment:** [Vercel (Edge Runtime)](https://vercel.com)

## 🛠️ Yerel Kurulum

Eğer projeyi kendi bilgisayarınızda çalıştırmak isterseniz:

1. Repoyu klonlayın:
```bash
git clone https://github.com/Fall-Of-Cybertron/10s-catch-game.git
```
2. Gerekli paketleri yükleyin:
```bash
npm install
```
3. `.env.local` dosyası oluşturup Supabase anahtarlarınızı girin:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STAFF_PIN=1234
```
4. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

---
<p align="center"><em>Bu proje açık kaynaklı bir topluluk/etkinlik projesi olarak geliştirilmiştir.</em></p>
