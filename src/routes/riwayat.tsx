import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  useOrders,
  useSales,
  useClosings,
} from "@/hooks/use-tables";
import { Badge } from "@/components/ui/badge";
import { rp } from "@/lib/utils";

export const Route = createFileRoute("/riwayat")({
  component: RiwayatPage,
  head: () => ({ meta: [{ title: "Riwayat — Toko Dapur Kampung" }] }),
});

const TABS = ["Semua", "Pesanan", "Penjualan", "Closing"] as const;

function RiwayatPage() {
  const { data: orders } = useOrders();
  const { data: sales } = useSales();
  const { data: closings } = useClosings();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Semua");

  const rows = useMemo(() => {
    type Row = {
      ts: string;
      type: "Pesanan" | "Penjualan" | "Closing";
      label: string;
      amount: string;
      meta: string;
    };
    const r: Row[] = [];
    orders.forEach((o) =>
      r.push({
        ts: o.tanggal,
        type: "Pesanan",
        label: `${o.platform} — ${o.items.length} item`,
        amount: rp(o.total_biaya),
        meta: o.status,
      }),
    );
    sales.forEach((s) =>
      r.push({
        ts: s.tanggal,
        type: "Penjualan",
        label: `${s.channel} — ${s.pembeli || "—"}`,
        amount: rp(s.total_jual),
        meta: s.cara_bayar,
      }),
    );
    closings.forEach((c) =>
      r.push({
        ts: c.tanggal,
        type: "Closing",
        label: `Periode ${c.periode_mulai} → ${c.periode_selesai}`,
        amount: rp(c.laba),
        meta: `${c.jumlah_trx} trx`,
      }),
    );
    r.sort((a, b) => b.ts.localeCompare(a.ts));
    return tab === "Semua" ? r : r.filter((x) => x.type === tab);
  }, [orders, sales, closings, tab]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              tab === t
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Belum ada riwayat.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase">
              <tr>
                <th className="px-3 py-2.5">Tanggal</th>
                <th className="px-3 py-2.5">Jenis</th>
                <th className="px-3 py-2.5">Keterangan</th>
                <th className="px-3 py-2.5">Nominal</th>
                <th className="px-3 py-2.5">Meta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2.5">{r.ts}</td>
                  <td className="px-3 py-2.5">
                    <Badge
                      className={
                        r.type === "Pesanan"
                          ? "bg-blue-500/15 text-blue-700"
                          : r.type === "Penjualan"
                            ? "bg-success/15 text-success"
                            : "bg-primary/15 text-primary"
                      }
                    >
                      {r.type}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">{r.label}</td>
                  <td className="px-3 py-2.5 font-semibold">{r.amount}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {r.meta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
