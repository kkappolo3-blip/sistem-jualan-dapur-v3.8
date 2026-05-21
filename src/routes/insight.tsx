import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useSales } from "@/hooks/use-tables";
import { rp } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import { Wallet, TrendingUp, Boxes, BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getRevenue } from "@/lib/business";

export const Route = createFileRoute("/insight")({
  component: InsightPage,
  head: () => ({ meta: [{ title: "Insight Penjualan — Toko Dapur Kampung" }] }),
});

function InsightPage() {
  const { data: sales } = useSales();

  const stats = useMemo(() => {
    const pend = sales.reduce((s, t) => s + getRevenue(t), 0);
    const profit = sales.reduce(
      (s, t) => s + (getRevenue(t) - t.total_modal),
      0,
    );
    const terjual = sales.reduce(
      (s, t) => s + t.items.reduce((q, i) => q + i.qty, 0),
      0,
    );

    const channelMap: Record<string, number> = {};
    sales.forEach((s) => {
      channelMap[s.channel] = (channelMap[s.channel] || 0) + getRevenue(s);
    });
    const best = Object.entries(channelMap).sort((a, b) => b[1] - a[1])[0];

    const prodMap: Record<string, { qty: number; revenue: number }> = {};
    sales.forEach((s) =>
      s.items.forEach((i) => {
        if (!prodMap[i.nama]) prodMap[i.nama] = { qty: 0, revenue: 0 };
        prodMap[i.nama].qty += i.qty;
        prodMap[i.nama].revenue += i.qty * i.hargaJual;
      }),
    );
    const topProd = Object.entries(prodMap)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 10)
      .map(([nama, d]) => ({ nama, qty: d.qty, revenue: d.revenue }));

    const channelData = Object.entries(channelMap).map(([nama, rev]) => ({
      nama,
      revenue: rev,
    }));

    return { pend, profit, terjual, best, topProd, channelData };
  }, [sales]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Pendapatan"
          value={rp(stats.pend)}
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="Keuntungan"
          value={rp(stats.profit)}
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="Barang Terjual"
          value={String(stats.terjual)}
          sub="unit"
          icon={Boxes}
          tone="info"
        />
        <StatCard
          label="Channel Terbaik"
          value={stats.best?.[0] || "—"}
          sub={stats.best ? rp(stats.best[1]) : ""}
          icon={BarChart3}
          tone="accent"
        />
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 font-semibold">Top 10 Produk Terlaris (qty)</h2>
        {stats.topProd.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={stats.topProd}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="nama"
                fontSize={11}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={70}
              />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="qty" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 font-semibold">Performa per Channel</h2>
        {stats.channelData.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.channelData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="nama" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v: number) => rp(v)} />
              <Bar dataKey="revenue" fill="#d4a373" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
