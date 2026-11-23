# Aplikasi Catatan

Aplikasi Next.js dengan API dan database SQLite yang diakses melalui Prisma.

## Menjalankan secara lokal

```bash
npm install
npm run db:migrate
npm run dev
```

Secara default, Prisma menggunakan `file:./dev.db`. Jika perlu, atur `DATABASE_URL`
di `.env`, misalnya `DATABASE_URL="file:./dev.db"`.

## Deploy ke Vercel

Vercel akan menjalankan `npm run build`, yang membuat Prisma Client lalu membangun
aplikasi Next.js. Build tidak memerlukan `DATABASE_URL`; URL lokal digunakan
sebagai fallback untuk konfigurasi Prisma.

SQLite lokal tidak cocok sebagai database persisten untuk function serverless.
Endpoint catatan yang memakai Prisma dapat gagal atau kehilangan perubahan saat
berjalan di Vercel. Untuk menyimpan data produksi, gunakan database yang dapat
diakses dari Vercel dan konfigurasi Prisma yang sesuai. Prisma dan SQLite lokal
tetap digunakan saat development.
