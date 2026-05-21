import { createFileRoute } from "@tanstack/react-router";
import { useInventory } from "@/hooks/use-tables";
import { rp } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import { Boxes, Package, AlertTriangle, XCircle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/stok")({
  component: StokPage,
  head: () => ({ meta: [{ title: "Stok Barang — Toko Dapur Kampung" }] }),
});

function StokPage() {
  const { data: inv } = useInventory();
  const sorted = [...inv].sort((a, b) => a.nama.localeCompare(b.nama));
  const totalItem = inv.reduce((s, i) => s + i.stok, 0);
  const rendah = inv.filter((i) => i.stok > 0 && i.stok <= 3).length;
  const habis = inv.filter((i) => i.stok === 0).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Jenis Barang"
          value={String(inv.length)}
          icon={Boxes}
          tone="primary"
        />
        <StatCard
          label="Total Item"
          value={String(totalItem)}
          icon={Package}
          tone="info"
        />
        <StatCard
          label="Stok Rendah"
          value={String(rendah)}
          sub="≤ 3 unit"
          icon={AlertTriangle}
          tone="warning"
        />
        <StatCard
          label="Habis"
          value={String(habis)}
          icon={XCircle}
          tone="danger"
        />
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Belum ada stok"
          description="Stok bertambah otomatis saat pesanan ditandai 'Diterima'."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase">
              <tr>
                <th className="px-3 py-2.5">Nama</th>
                <th className="px-3 py-2.5">Stok</th>
                <th className="px-3 py-2.5">Harga Beli</th>
                <th className="px-3 py-2.5">Harga Jual</th>
                <th className="px-3 py-2.5">Nilai Stok</th>
                <th className="px-3 py-2.5">Terakhir Masuk</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((i) => (
                <tr
                  key={i.id}
                  className={`border-t ${i.stok === 0 ? "bg-destructive/5" : ""}`}
                >
                  <td className="px-3 py-2.5 font-medium">{i.nama}</td>
                  <td
                    className={`px-3 py-2.5 font-bold ${
                      i.stok === 0
                        ? "text-destructive"
                        : i.stok <= 3
                          ? "text-warning"
                          : ""
                    }`}
                  >
                    {i.stok}
                  </td>
                  <td className="px-3 py-2.5">{rp(i.harga_beli)}</td>
                  <td className="px-3 py-2.5 text-success">
                    {rp(i.harga_jual)}
                  </td>
                  <td className="px-3 py-2.5">{rp(i.stok * i.harga_beli)}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {i.terakhir_masuk}
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
