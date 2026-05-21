import { createFileRoute } from "@tanstack/react-router";
import { PackageCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useOrders,
  useInventory,
  useBackorders,
} from "@/hooks/use-tables";
import { updateRow, upsertRow } from "@/lib/sync-store";
import type { Inventory, Order } from "@/lib/types";
import { rp, today, uid, hitungHargaJual } from "@/lib/utils";
import { useConfirm } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/terima")({
  component: TerimaPage,
  head: () => ({ meta: [{ title: "Terima Barang — Toko Dapur Kampung" }] }),
});

function TerimaPage() {
  const { data: orders } = useOrders();
  const { data: inventory } = useInventory();
  const { data: backorders } = useBackorders();
  const confirm = useConfirm();

  const list = orders
    .filter((o) => o.status === "Dikirim")
    .sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));

  async function terima(o: Order) {
    const ok = await confirm({
      title: "Konfirmasi penerimaan",
      message:
        "Barang sudah diterima dan diperiksa? Stok akan otomatis ditambahkan dengan harga jual margin 30% (bulatkan ke Rp 5.000 terdekat).",
    });
    if (!ok) return;

    const hargaAvg = o.harga_avg || 0;
    const invMap = new Map(
      inventory.map((i) => [i.nama.toLowerCase(), { ...i }]),
    );
    o.items.forEach((it) => {
      const effBeli = hargaAvg > 0 ? hargaAvg : it.harga;
      const hj = hitungHargaJual(effBeli);
      const key = it.nama.toLowerCase();
      const existing = invMap.get(key);
      if (existing) {
        existing.stok += it.qty;
        existing.harga_beli = effBeli;
        existing.harga_jual = hj;
        existing.terakhir_masuk = today();
      } else {
        invMap.set(key, {
          id: uid(),
          nama: it.nama,
          stok: it.qty,
          harga_beli: effBeli,
          harga_jual: hj,
          terakhir_masuk: today(),
        });
      }
    });

    // Resolve backorders
    let resolved = 0;
    const boUpdates: Array<{ id: string; patch: any }> = [];
    backorders
      .filter((b) => b.status === "Menunggu")
      .forEach((bo) => {
        const match = invMap.get(bo.nama.toLowerCase());
        if (match && match.stok >= bo.qty) {
          match.stok -= bo.qty;
          boUpdates.push({
            id: bo.id,
            patch: { status: "Dipenuhi", tanggal_dipenuhi: today() },
          });
          resolved++;
        }
      });

    // Persist
    for (const inv of invMap.values()) {
      await upsertRow<Inventory>("inventory", inv);
    }
    await updateRow<Order>("orders", o.id, {
      status: "Diterima",
      tanggal_terima: today(),
    });
    for (const u of boUpdates) {
      await updateRow("backorders", u.id, u.patch);
    }

    toast.success(
      `Barang diterima! Stok ditambahkan.${
        resolved ? ` ${resolved} backorder otomatis dipenuhi.` : ""
      }`,
    );
  }

  return (
    <div className="space-y-5">
      {list.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Tidak ada paket menunggu diterima"
          description="Tandai pesanan 'Dipesan' menjadi 'Dikirim' di halaman Pesan Barang dulu."
        />
      ) : (
        <div className="grid gap-3">
          {list.map((o) => (
            <div
              key={o.id}
              className="rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        o.platform === "Shopee"
                          ? "bg-orange-500/15 text-orange-700"
                          : "bg-purple-500/15 text-purple-700"
                      }
                    >
                      {o.platform}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {o.tanggal}
                    </span>
                    {o.resi && (
                      <span className="text-xs text-muted-foreground">
                        Resi: {o.resi}
                      </span>
                    )}
                  </div>
                  <ul className="mt-2 text-sm">
                    {o.items.map((i, idx) => (
                      <li key={idx}>
                        • {i.nama} ({i.qty}× {rp(i.harga)})
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 text-sm font-bold">
                    Total {rp(o.total_biaya)}
                  </div>
                </div>
                <Button onClick={() => terima(o)}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Terima
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
