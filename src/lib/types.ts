export type OrderItem = { nama: string; qty: number; harga: number };
export type SaleItem = { nama: string; qty: number; hargaJual: number; hargaModal: number };
export type CicilEntry = { tgl: string; nominal: number; ket: string };
export type OpsiItem = { nama: string; nominal: number };

export type Order = {
  id: string;
  platform: string;
  tanggal: string;
  resi: string | null;
  ongkir: number;
  total_biaya: number;
  harga_avg: number;
  catatan: string | null;
  status: "Dipesan" | "Dikirim" | "Diterima";
  tanggal_terima: string | null;
  items: OrderItem[];
  sumber_modal: string | null;
  modal_putar_used: number;
  modal_talangan_used: number;
  created_at?: string;
  updated_at?: string;
};

export type Inventory = {
  id: string;
  nama: string;
  stok: number;
  harga_beli: number;
  harga_jual: number;
  terakhir_masuk: string;
};

export type Sale = {
  id: string;
  tanggal: string;
  channel: string;
  pembeli: string | null;
  items: SaleItem[];
  total_jual: number;
  total_modal: number;
  cara_bayar: "lunas" | "cicilan";
  dp: number;
  tenor: number;
  cicil_bayar: number;
  cicil_riwayat: CicilEntry[];
};

export type Closing = {
  id: string;
  tanggal: string;
  periode_mulai: string;
  periode_selesai: string;
  jumlah_trx: number;
  total_jual: number;
  total_pemasukan: number;
  total_modal: number;
  laba_kotor: number;
  piutang_cicilan: number;
  total_opsi: number;
  opsi_items: OpsiItem[];
  laba: number;
  zakat: number;
  gaji: number;
  modal: number;
};

export type Backorder = {
  id: string;
  tanggal: string;
  nama: string;
  qty: number;
  pembeli: string | null;
  channel: string | null;
  catatan: string | null;
  status: "Menunggu" | "Dipenuhi";
  tanggal_dipenuhi: string | null;
};

export type Settings = {
  id: "main";
  nama: string;
  pemilik: string;
  alamat: string;
  hp: string;
  lokasi: string;
};

export type ProfitTotals = {
  id: "main";
  total_profit: number;
  total_zakat: number;
  total_gaji: number;
  total_modal: number;
  modal_talangan: number;
  last_closing_date: string | null;
};
