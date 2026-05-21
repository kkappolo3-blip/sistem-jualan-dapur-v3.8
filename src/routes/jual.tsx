/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Receipt } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSales, useInventory } from "@/hooks/use-tables";
import { insertRow, updateRow, deleteRow } from "@/lib/sync-store";
import type { Sale, SaleItem, Inventory } from "@/lib/types";
import { rp, today, uid } from "@/lib/utils";
import { getRevenue } from "@/lib/business";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/jual")({
  component: JualPage,
  head: () => ({ meta: [{ title: "Catat Penjualan — Toko Dapur Kampung" }] }),
});

function JualPage() {
  const { data: sales } = useSales();
  const { data: inv } = useInventory();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);

  const sorted = [...sales].sort((a, b) =>
    (b.tanggal || "").localeCompare(a.tanggal || ""),
  );

  async function hapus(s: Sale) {
    const ok = await confirm({
      title: "Hapus penjualan?",
      message: "Stok akan dikembalikan.",
      destructive: true,
      requireCode: true,
    });
    if (!ok) return;
    for (const it of s.items) {
      const ii = inv.find(
        (i) => i.nama.toLowerCase() === it.nama.toLowerCase(),
      );
      if (ii) {
        await updateRow<Inventory>("inventory", ii.id, {
          stok: ii.stok + it.qty,
        });
      }
    }
    await deleteRow("sales", s.id);
    toast.success("Penjualan dihapus, stok dikembalikan.");
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Catat Penjualan
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Belum ada penjualan"
          description="Klik 'Catat Penjualan' untuk transaksi pertama."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase">
              <tr>
                <th className="px-3 py-2.5">Tgl</th>
                <th className="px-3 py-2.5">Pembeli</th>
                <th className="px-3 py-2.5">Channel</th>
                <th className="px-3 py-2.5">Items</th>
                <th className="px-3 py-2.5">Total</th>
                <th className="px-3 py-2.5">Bayar</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2.5">{s.tanggal}</td>
                  <td className="px-3 py-2.5">{s.pembeli || "—"}</td>
                  <td className="px-3 py-2.5">{s.channel}</td>
                  <td className="max-w-[220px] px-3 py-2.5 text-xs">
                    {s.items.map((i) => `${i.nama}(${i.qty})`).join(", ")}
                  </td>
                  <td className="px-3 py-2.5 font-semibold">
                    {rp(s.total_jual)}
                    {s.cara_bayar === "cicilan" && (
                      <div className="text-xs text-success">
                        Masuk {rp(getRevenue(s))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      className={
                        s.cara_bayar === "lunas"
                          ? "bg-success/15 text-success"
                          : "bg-warning/15 text-warning"
                      }
                    >
                      {s.cara_bayar === "lunas" ? "Lunas" : "Cicilan"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => hapus(s)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <JualModal open={open} onOpenChange={setOpen} />
    </div>
  );
}

function JualModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: inv } = useInventory();
  const [tanggal, setTanggal] = useState(today());
  const [channel, setChannel] = useState("Offline (Teras Rumah)");
  const [pembeli, setPembeli] = useState("");
  const [bayar, setBayar] = useState<"lunas" | "cicilan">("lunas");
  const [dp, setDp] = useState(0);
  const [tenor, setTenor] = useState(2);
  type Row = { invId: string; qty: number; harga: number };
  const [items, setItems] = useState<Row[]>([{ invId: "", qty: 1, harga: 0 }]);

  const stocked = inv.filter((i) => i.stok > 0);

  async function save() {
    const built: SaleItem[] = [];
    let totalJual = 0;
    let totalModal = 0;
    const invPatches: Array<{ id: string; stok: number }> = [];

    for (const r of items) {
      const ii = inv.find((i) => i.id === r.invId);
      if (!ii) continue;
      if (r.qty <= 0 || r.harga <= 0) {
        toast.error(`Lengkapi qty/harga untuk ${ii.nama}`);
        return;
      }
      if (r.qty > ii.stok) {
        toast.error(`Stok ${ii.nama} kurang (sisa ${ii.stok})`);
        return;
      }
      built.push({
        nama: ii.nama,
        qty: r.qty,
        hargaJual: r.harga,
        hargaModal: ii.harga_beli,
      });
      totalJual += r.qty * r.harga;
      totalModal += r.qty * ii.harga_beli;
      invPatches.push({ id: ii.id, stok: ii.stok - r.qty });
    }
    if (built.length === 0) {
      toast.error("Tambahkan minimal 1 item dari stok");
      return;
    }
    for (const p of invPatches) {
      await updateRow<Inventory>("inventory", p.id, { stok: p.stok });
    }
    const sale: Sale = {
      id: uid(),
      tanggal,
      channel,
      pembeli: pembeli || null,
      items: built,
      total_jual: totalJual,
      total_modal: totalModal,
      cara_bayar: bayar,
      dp: bayar === "cicilan" ? dp : 0,
      tenor: bayar === "cicilan" ? tenor : 0,
      cicil_bayar: bayar === "cicilan" ? dp : totalJual,
      cicil_riwayat:
        bayar === "cicilan"
          ? [{ tgl: today(), nominal: dp, ket: "DP / Uang Muka" }]
          : [],
    };
    await insertRow("sales", sale);
    toast.success(`Penjualan dicatat ${rp(totalJual)}`);
    onOpenChange(false);
    setItems([{ invId: "", qty: 1, harga: 0 }]);
    setPembeli("");
    setBayar("lunas");
    setDp(0);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Catat Penjualan</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Tanggal</Label>
              <Input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Offline (Teras Rumah)">
                    Offline (Teras Rumah)
                  </SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Pembeli</Label>
            <Input
              value={pembeli}
              onChange={(e) => setPembeli(e.target.value)}
              placeholder="Nama pembeli (opsional)"
            />
          </div>

          <div>
            <Label>Items dari Stok</Label>
            <div className="mt-1.5 space-y-2">
              {items.map((it, idx) => {
                const ii = inv.find((x) => x.id === it.invId);
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_70px_110px_40px] items-center gap-2"
                  >
                    <Select
                      value={it.invId}
                      onValueChange={(v) => {
                        const found = inv.find((x) => x.id === v);
                        const c = [...items];
                        c[idx] = {
                          ...c[idx],
                          invId: v,
                          harga: found?.harga_jual ?? 0,
                        };
                        setItems(c);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih produk" />
                      </SelectTrigger>
                      <SelectContent>
                        {stocked.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.nama} (stok {i.stok})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={it.qty}
                      max={ii?.stok}
                      onChange={(e) => {
                        const c = [...items];
                        c[idx] = {
                          ...c[idx],
                          qty: parseInt(e.target.value) || 0,
                        };
                        setItems(c);
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Harga"
                      value={it.harga}
                      onChange={(e) => {
                        const c = [...items];
                        c[idx] = {
                          ...c[idx],
                          harga: parseInt(e.target.value) || 0,
                        };
                        setItems(c);
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setItems(items.filter((_, i) => i !== idx))
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setItems([...items, { invId: "", qty: 1, harga: 0 }])
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Tambah Item
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Cara Bayar</Label>
              <Select
                value={bayar}
                onValueChange={(v) => setBayar(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lunas">Lunas</SelectItem>
                  <SelectItem value="cicilan">Cicilan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {bayar === "cicilan" && (
              <>
                <div>
                  <Label>DP (uang muka)</Label>
                  <Input
                    type="number"
                    value={dp}
                    onChange={(e) => setDp(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Tenor (jumlah cicilan)</Label>
                  <Input
                    type="number"
                    value={tenor}
                    onChange={(e) => setTenor(parseInt(e.target.value) || 2)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={save}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
