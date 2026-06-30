# v-HIT Admin Panel

v-HIT mobil uygulaması için Firebase tabanlı Next.js admin paneli.

## Özellikler

- Dashboard metrikleri ve son aktivite özeti
- Doktor, klinik, hasta, test, randevu ve geri bildirim yönetimi
- httpOnly session cookie ile güvenli admin oturumu
- Sunucu tarafı API + Admin SDK ile korumalı mutasyonlar
- Cursor tabanlı pagination ve sunucu tarafı filtreleme
- Audit log (admin işlem geçmişi)
- CSV export (hasta / test)

## Gereksinimler

- Node.js 20+
- Firebase projesi (Auth + Firestore)
- `super_admin` rolüne sahip admin kullanıcı

## Kurulum

```bash
npm install
cp .env.example .env.local
```

`.env.local` dosyasını Firebase projenize göre doldurun.

Firestore kuralları ve index'ler:

```bash
npx firebase deploy --only firestore:rules,firestore:indexes
```

Geliştirme sunucusu:

```bash
npm run dev
```

Uygulama: [http://localhost:3000](http://localhost:3000)

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Production build |
| `npm run start` | Production sunucu |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript kontrolü |
| `npm run test` | Unit testler (Vitest) |

## Mimari

```
src/
├── app/                 # Next.js App Router (ince page wrapper'lar)
├── features/            # Modül bazlı UI + servisler
├── components/ui/       # Ortak UI kit
├── lib/                 # Auth, API, audit, pagination, rate limit
└── hooks/               # useAdminListQuery, usePagedQuery
```

### Güvenlik

- `/dashboard/*` ve `/api/admin/*` middleware ile korunur
- Tüm admin mutasyonları `withAdminAuth` + Firebase Admin SDK
- Rate limit: admin API 120/dk, oturum oluşturma 10/dk (IP bazlı)
- Firestore security rules: client yazımı kapalı, admin okuma kısıtlı

### Health check

Production izleme için:

```
GET /api/health
```

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run build`

## Production Deploy

### Vercel (önerilen)

1. Repoyu Vercel'e bağlayın
2. Environment variable'ları `.env.example` ile aynı isimlerle ekleyin
3. Build command: `npm run build`
4. `FIREBASE_ADMIN_PRIVATE_KEY` değerinde `\n` kaçışlarını koruyun

### Firebase App Hosting

Firebase CLI ile App Hosting kullanıyorsanız proje Firebase skill dokümantasyonuna göre yapılandırın. Deploy öncesi mutlaka:

```bash
npm run build
npx firebase deploy --only firestore:rules,firestore:indexes
```

## Operasyon Notları

- Audit log koleksiyonu: `admin_audit_logs` (sadece super_admin okur)
- Büyük listeler sunucu API'leri üzerinden sayfalanır
- Rate limit tek instance için bellek içi çalışır; çoklu instance için Redis tabanlı limiter önerilir
- Hata durumlarında `error.tsx` / `global-error.tsx` devreye girer

## Lisans

Private — v-HIT internal use.
