
# Rencana: Toko Dapur Kampung v2 — Multi-Device Sync

Rebuild tool HTML 2100 baris jadi web app modern React + TypeScript + Tailwind dengan sync real-time antar 2-3 device (HP, tablet, laptop) lewat Supabase eksternal yang sudah kamu siapkan.

## Yang akan dibangun

### Backend
- Pakai **Supabase eksternal** sesuai MD (URL + anon key di-hardcode di `src/lib/supabase.ts`).
- **Tidak** mengaktifkan Lovable Cloud — semua data lewat project Supabase milikmu.
- Tabel dianggap sudah ada: `orders`, `inventory`, `sales`, `closings`, `backorders`, `settings`, `profit_totals`.
- Tidak ada login (single-user, sesuai MD).

### Sync & offline
- Custom hooks per tabel (`useOrders`, `useInventory`, `useSales`, `useClosings`, `useBackorders`, `useSettings`, `useProfitTotals`) — initial fetch + Supabase Realtime subscription untuk INSERT/UPDATE/DELETE.
- **Cache localStorage** per tabel, dipakai saat offline.
- **Indikator koneksi** (🟢 Online / 🔴 Offline) + animasi sync + toast "Data tersinkronisasi" di topbar.
- ID dibuat di client: `Date.now().toString(36) + Math.random().toString(36).slice(2,7)`.

### 13 Halaman (semua sekaligus)
**Alur Jualan:** Dashboard · Pesan Barang · Terima Barang · Catat Penjualan · Closing · Pembagian Laba
**Analisis:** Insight Penjualan (Recharts) · Evaluasi Bulanan · Pesanan Tanpa Stok · Pelanggan Cicilan
**Manajemen:** Stok Barang · Riwayat · Pengaturan

Setiap halaman pakai routing TanStack (file per route di `src/routes/`), badge dinamis di sidebar, sidebar drawer di mobile.

### Logika bisnis kritis
- Harga jual: `Math.ceil(hargaBeli * 1.3 / 5000) * 5000`
- Sumber modal otomatis (Modal Putar → Gabungan → Talangan → minus jadi utang)
- Pemasukan aktual: lunas = total, cicilan = yang sudah dibayar
- Closing: 5% Zakat / 10% Gaji / 85% Modal Putar
- Terima barang → tambah stok + resolve backorder
- Hapus data → kode konfirmasi `88040773` via custom modal (bukan `confirm/prompt` browser)

### UI/UX
- Sidebar dark green `#1b4332` 270px, accent gold `#d4a373`, bg `#f5f0eb`, font Inter, radius 12px.
- Design tokens di `src/styles.css` (oklch), bukan warna hardcode di komponen.
- Toast notifications, skeleton loading, empty states, badge pulse, count-up angka profit.
- Mobile responsive (mayoritas akses dari HP).
- Format Rupiah `id-ID`, tanggal display `"21 Mei 2026"`.

### Halaman Pengaturan
- Info toko (nama, pemilik, alamat, HP, lokasi).
- **Ekspor JSON** (tetap disediakan untuk backup, walau kamu pilih mulai kosong).
- Tombol "Hapus Semua" dengan kode konfirmasi.

## Catatan teknis (untuk yang technical)
- Stack: React 19 + TanStack Start (sudah ada) + Tailwind v4 + `@supabase/supabase-js` + Recharts + Lucide.
- Semua akses Supabase dari **client-side** (browser client biasa), tanpa server functions — karena pakai Supabase eksternal milikmu, anon key, dan tidak ada RLS yang butuh auth.
- Routing: file routes di `src/routes/` (index, pesan-barang, terima-barang, catat-penjualan, closing, pembagian-laba, insight, evaluasi, backorders, cicilan, stok, riwayat, pengaturan) + `__root.tsx` jadi layout dengan sidebar + topbar + `<Outlet />`.
- State global ringan via React Context untuk sync status + toast.

## Catatan
- Karena anon key Supabase kamu di-hardcode di kode frontend, **siapa pun yang dapat link app bisa membaca/menulis data**. Untuk usaha 1 orang ini biasanya OK, tapi sebaiknya nanti kamu set Row Level Security di Supabase atau tambahkan password sederhana. Saya bisa bantu kalau diminta.
- Build full 13 halaman sekaligus akan menghasilkan banyak file dalam satu run; setelah jadi, kita iterasi per halaman untuk polish.
