import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wallet,
  TrendingUp,
  Boxes,
  ShoppingCart,
  AlertCircle,
  PieChart as PieIcon,
  CalendarClock,
} from "lucide-react";
import {
  useOrders,
  useInventory,
  useSales,
  useProfitOrDefault,
  useBackorders,
  useClosings,
} from "@/hooks/use-tables";
import { StatCard } from "@/components/stat-card";
import { rp, formatTanggal } from "@/lib/utils";
import { getRevenue } from "@/lib/business";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — Toko Dapur Kampung" },
      {
        name: "description",
        content:
          "Ringkasan pesanan aktif, pemasukan, laba, dan stok periode berjalan.",
      },
    ],
  }),
});

function Dashboard() {
  const { data: orders } = useOrders();
  const { data: inventory } = useInventory();
  const { data: sales } = useSales();
  const { data: backorders } = useBackorders();
  const { data: closings } = useClosings();
  const pt = useProfitOrDefault();

  const pesananAktif = orders.filter((o) => o.status !== "Diterima").length;
  const pemasukan = sales.reduce((s, t) => s + getRevenue(t), 0);
  const totalModal = sales.reduce((s, t) => s + t.total_modal, 0);
  const laba = pemasukan - totalModal;
  const nilaiStok = inventory.reduce(
    (s, i) => s + i.stok * i.harga_beli,
    0,
  );
  const piutang = sales
    .filter((s) => s.cara_bayar === "cicilan")
    .reduce((s, t) => s + (t.total_jual - (t.cicil_bayar || 0)), 0);
  const backorderCount = backorders.filter(
    (b) => b.status === "Menunggu",
  ).length;

  // Recent activity
  type Act = { ts: string; label: string; type: string };
  const acts: Act[] = [];
  orders.slice(0, 5).forEach((o) =>
    acts.push({
      ts: o.created_at || o.tanggal,
      label: `Pesan ${o.platform} — ${rp(o.total_biaya)} (${o.status})`,
      type: "Pesan",
    }),
  );
  sales.slice(0, 5).forEach((s) =>
    acts.push({
      ts: (s as any).created_at || s.tanggal,
      label: `Penjualan ${s.channel} — ${rp(s.total_jual)}`,
      type: "Jual",
    }),
  );
  closings.slice(0, 3).forEach((c) =>
    acts.push({
      ts: (c as any).created_at || c.tanggal,
      label: `Closing — Laba ${rp(c.laba)}`,
      type: "Closing",
    }),
  );
  acts.sort((a, b) => (b.ts || "").localeCompare(a.ts || ""));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Pesanan Aktif"
          value={String(pesananAktif)}
          sub="Dipesan + Dikirim"
          icon={ShoppingCart}
          tone="info"
        />
        <StatCard
          label="Pemasukan Periode"
          value={rp(pemasukan)}
          sub="Aktual (cicilan: dibayar saja)"
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="Laba Periode"
          value={rp(laba)}
          sub="Sebelum biaya operasional"
          icon={TrendingUp}
          tone={laba >= 0 ? "primary" : "danger"}
          valueClassName={laba < 0 ? "text-destructive" : ""}
        />
        <StatCard
          label="Nilai Stok"
          value={rp(nilaiStok)}
          sub={`${inventory.length} jenis barang`}
          icon={Boxes}
          tone="accent"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {piutang > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-warning" />
            <div>
              <div className="font-semibold">Piutang Cicilan</div>
              <div className="text-sm text-muted-foreground">
                Belum diterima: <b className="text-warning">{rp(piutang)}</b> —{" "}
                <Link to="/cicilan" className="underline">
                  kelola
                </Link>
              </div>
            </div>
          </div>
        )}
        {backorderCount > 0 && (
          <Link
            to="/backorder"
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 transition hover:bg-destructive/15"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <div className="font-semibold">Pesanan Tanpa Stok</div>
              <div className="text-sm text-muted-foreground">
                {backorderCount} permintaan menunggu — klik untuk lihat
              </div>
            </div>
          </Link>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <PieIcon className="h-4 w-4" /> Akumulasi Periode Aktif
          </div>
          <dl className="space-y-2 text-sm">
            <Row label="Zakat (5%)" value={rp(pt.total_zakat)} />
            <Row label="Gaji (10%)" value={rp(pt.total_gaji)} />
            <Row label="Modal Putar (85%)" value={rp(pt.total_modal)} />
            <Row
              label="Modal Talangan"
              value={rp(pt.modal_talangan)}
              danger={pt.modal_talangan < 0}
            />
            <Row
              label="Total Modal"
              value={rp(pt.total_modal + pt.modal_talangan)}
              bold
            />
            <Row label="Total Laba" value={rp(pt.total_profit)} bold />
            <Row
              label="Closing Terakhir"
              value={
                pt.last_closing_date
                  ? formatTanggal(pt.last_closing_date)
                  : "—"
              }
            />
          </dl>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <CalendarClock className="h-4 w-4" /> Aktivitas Terbaru
          </div>
          {acts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada aktivitas</p>
          ) : (
            <ul className="space-y-2.5">
              {acts.slice(0, 10).map((a, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 border-b border-dashed pb-2 text-sm last:border-0"
                >
                  <span className="mt-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                    {a.type}
                  </span>
                  <span className="flex-1">{a.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  danger,
}: {
  label: string;
  value: string;
  bold?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-dashed py-1 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`${bold ? "font-bold" : "font-medium"} ${danger ? "text-destructive" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
