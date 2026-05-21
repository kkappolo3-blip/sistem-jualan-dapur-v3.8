import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSales, useClosings } from "@/hooks/use-tables";
import { rp } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import { Wallet, TrendingUp, AlertCircle, Star } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRevenue } from "@/lib/business";

export const Route = createFileRoute("/evaluasi")({
  component: EvaluasiPage,
  head: () => ({ meta: [{ title: "Evaluasi Bulanan — Toko Dapur Kampung" }] }),
});

function EvaluasiPage() {
  const { data: sales } = useSales();
  const { data: closings } = useClosings();

  const months = useMemo(() => {
    const set = new Set<string>();
    sales.forEach((s) => set.add(s.tanggal.slice(0, 7)));
    closings.forEach((c) => set.add(c.tanggal.slice(0, 7)));
    return [...set].sort().reverse();
  }, [sales, closings]);

  const [month, setMonth] = useState<string>(months[0] || "");
  const cur = month || months[0] || "";

  const monthSales = sales.filter((s) => s.tanggal.startsWith(cur));
  const monthClosings = closings.filter((c) => c.tanggal.startsWith(cur));
  const pemasukan = monthSales.reduce((s, t) => s + getRevenue(t), 0);
  const modal = monthSales.reduce((s, t) => s + t.total_modal, 0);
  const opsi = monthClosings.reduce((s, c) => s + (c.total_opsi || 0), 0);
  const laba = monthClosings.reduce((s, c) => s + c.laba, 0);
  const margin = pemasukan ? Math.round(((pemasukan - modal) / pemasukan) * 100) : 0;

  const prodMap: Record<string, { qty: number; revenue: number }> = {};
  monthSales.forEach((s) =>
    s.items.forEach((i) => {
      if (!prodMap[i.nama]) prodMap[i.nama] = { qty: 0, revenue: 0 };
      prodMap[i.nama].qty += i.qty;
      prodMap[i.nama].revenue += i.qty * i.hargaJual;
    }),
  );
  const top10 = Object.entries(prodMap)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 10);

  const label = cur
    ? new Date(cur + "-01").toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
      })
    : "—";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Periode:</span>
        <Select value={cur} onValueChange={setMonth}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Pilih bulan" />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {new Date(m + "-01").toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "long",
                })}
              </SelectItem>
            ))}
            {months.length === 0 && (
              <SelectItem value="empty" disabled>
                Tidak ada data
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={`Pemasukan ${label}`}
          value={rp(pemasukan)}
          sub={`${monthSales.length} trx`}
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="Laba Kotor"
          value={rp(pemasukan - modal)}
          sub={`Margin ${margin}%`}
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="Biaya Operasional"
          value={rp(opsi)}
          icon={AlertCircle}
          tone="danger"
        />
        <StatCard
          label="Laba Bersih"
          value={rp(laba)}
          icon={Star}
          tone={laba >= 0 ? "accent" : "danger"}
        />
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 font-semibold">Top 10 Produk Bulan Ini</h2>
        {top10.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada penjualan.</p>
        ) : (
          <div className="space-y-2">
            {top10.map(([nama, d], i) => {
              const maxQty = top10[0][1].qty;
              const pct = maxQty ? Math.round((d.qty / maxQty) * 100) : 0;
              return (
                <div key={nama}>
                  <div className="mb-0.5 flex justify-between text-sm">
                    <span>
                      #{i + 1} {nama}
                    </span>
                    <span className="text-muted-foreground">
                      {d.qty} unit • {rp(d.revenue)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.max(pct, 6)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
