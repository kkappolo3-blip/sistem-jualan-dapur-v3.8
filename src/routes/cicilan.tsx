import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSales } from "@/hooks/use-tables";
import { updateRow } from "@/lib/sync-store";
import { rp, today } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { Sale, CicilEntry } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/cicilan")({
  component: CicilanPage,
  head: () => ({ meta: [{ title: "Pelanggan Cicilan — Toko Dapur Kampung" }] }),
});

function CicilanPage() {
  const { data: sales } = useSales();
  const [active, setActive] = useState<Sale | null>(null);
  const [nominal, setNominal] = useState(0);
  const [ket, setKet] = useState("");

  const cicilan = sales
    .filter((s) => s.cara_bayar === "cicilan")
    .sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));

  async function bayar() {
    if (!active || nominal <= 0) {
      toast.error("Nominal harus lebih dari 0");
      return;
    }
    const newBayar = (active.cicil_bayar || 0) + nominal;
    const riwayat: CicilEntry[] = [
      ...(active.cicil_riwayat || []),
      { tgl: today(), nominal, ket: ket || "Cicilan" },
    ];
    await updateRow<Sale>("sales", active.id, {
      cicil_bayar: newBayar,
      cicil_riwayat: riwayat,
    });
    toast.success(`Cicilan ${rp(nominal)} dicatat`);
    setActive(null);
    setNominal(0);
    setKet("");
  }

  return (
    <div className="space-y-5">
      {cicilan.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Tidak ada penjualan cicilan"
          description="Penjualan dengan cara bayar 'Cicilan' akan muncul di sini."
        />
      ) : (
        <div className="grid gap-3">
          {cicilan.map((s) => {
            const dibayar = s.cicil_bayar || 0;
            const sisa = s.total_jual - dibayar;
            const pct = Math.min(
              100,
              Math.round((dibayar / s.total_jual) * 100),
            );
            const lunas = sisa <= 0;
            return (
              <div key={s.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <div className="font-semibold">{s.pembeli || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.tanggal} • {s.channel}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      Dibayar <b>{rp(dibayar)}</b> / {rp(s.total_jual)}
                    </div>
                    <div
                      className={`text-xs ${lunas ? "text-success" : "text-warning"}`}
                    >
                      {lunas ? "LUNAS" : `Sisa ${rp(sisa)}`}
                    </div>
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded bg-muted">
                  <div
                    className={`h-full ${lunas ? "bg-success" : "bg-warning"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="flex-1 text-xs text-muted-foreground">
                    Tenor {s.tenor}× • DP {rp(s.dp)} • {s.items.length} item
                  </div>
                  {!lunas && (
                    <Button size="sm" onClick={() => setActive(s)}>
                      Catat Pembayaran
                    </Button>
                  )}
                </div>
                {s.cicil_riwayat?.length > 0 && (
                  <details className="mt-3 text-xs">
                    <summary className="cursor-pointer text-muted-foreground">
                      Riwayat ({s.cicil_riwayat.length})
                    </summary>
                    <ul className="mt-1.5 space-y-1">
                      {s.cicil_riwayat.map((r, i) => (
                        <li
                          key={i}
                          className="flex justify-between border-b border-dashed py-1"
                        >
                          <span>
                            {r.tgl} — {r.ket}
                          </span>
                          <b>{rp(r.nominal)}</b>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!active}
        onOpenChange={(v) => !v && setActive(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat Pembayaran Cicilan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              {active?.pembeli} — Sisa{" "}
              <b>{rp((active?.total_jual ?? 0) - (active?.cicil_bayar ?? 0))}</b>
            </div>
            <div>
              <Label>Nominal</Label>
              <Input
                type="number"
                value={nominal}
                onChange={(e) => setNominal(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Keterangan</Label>
              <Input
                value={ket}
                onChange={(e) => setKet(e.target.value)}
                placeholder="Cicilan ke-2 / dst"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>
              Batal
            </Button>
            <Button onClick={bayar}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
