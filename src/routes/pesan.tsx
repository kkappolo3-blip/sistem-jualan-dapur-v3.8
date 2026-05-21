/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Send, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  useOrders,
  useBackorders,
  useProfitTotals,
  useProfitOrDefault,
  DEFAULT_PROFIT,
} from "@/hooks/use-tables";
import {
  insertRow,
  updateRow,
  deleteRow,
  upsertRow,
} from "@/lib/sync-store";
import type { Order, OrderItem, ProfitTotals } from "@/lib/types";
import { rp, today, uid } from "@/lib/utils";
import { getModalInfo } from "@/lib/business";
import { useConfirm } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/pesan")({
  component: PesanPage,
  head: () => ({
    meta: [{ title: "Pesan Barang — Toko Dapur Kampung" }],
  }),
});

const STATUSES = ["Semua", "Dipesan", "Dikirim", "Diterima"] as const;

function PesanPage() {
  const { data: orders } = useOrders();
  const { data: backorders } = useBackorders();
  const pt = useProfitOrDefault();
  const { data: ptRows } = useProfitTotals();
  const confirm = useConfirm();

  const [filter, setFilter] = useState<(typeof STATUSES)[number]>("Semua");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    const sorted = [...orders].sort((a, b) =>
      (b.tanggal || "").localeCompare(a.tanggal || ""),
    );
    return filter === "Semua"
      ? sorted
      : sorted.filter((o) => o.status === filter);
  }, [orders, filter]);

  const restockRekom = useMemo(() => {
    const map = new Map<string, number>();
    backorders
      .filter((b) => b.status === "Menunggu")
      .forEach((b) => map.set(b.nama, (map.get(b.nama) || 0) + b.qty));
    return [...map.entries()];
  }, [backorders]);

  async function handleDelete(o: Order) {
    const ok = await confirm({
      title: "Hapus pesanan?",
      message: `Hapus pesanan ${o.platform} ${rp(o.total_biaya)}?${o.status === "Diterima" ? "\nStok barang akan dikurangi kembali." : "\nModal akan dikembalikan."}`,
      destructive: true,
      requireCode: true,
    });
    if (!ok) return;
    // Restore modal
    const base = ptRows.find((r) => r.id === "main") ?? DEFAULT_PROFIT;
    const updated: ProfitTotals = {
      ...base,
      total_modal: base.total_modal + (o.modal_putar_used || 0),
      modal_talangan: base.modal_talangan + (o.modal_talangan_used || 0),
    };
    await upsertRow("profit_totals", updated);
    await deleteRow("orders", o.id);
    toast.success("Pesanan dihapus, modal dikembalikan.");
  }

  async function handleKirim(o: Order) {
    await updateRow<Order>("orders", o.id, { status: "Dikirim" });
    toast.success("Status diubah: Dikirim");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                filter === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Pesan Baru
        </Button>
      </div>

      {restockRekom.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
          <div className="mb-2 text-sm font-semibold">
            Rekomendasi Restock (dari backorder)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {restockRekom.map(([nama, qty]) => (
              <span
                key={nama}
                className="rounded-full bg-card px-2.5 py-1 text-xs"
              >
                {nama} <b>×{qty}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Belum ada pesanan"
          description="Klik 'Pesan Baru' untuk mencatat pesanan dari Shopee/TikTok."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Tanggal</th>
                <th className="px-3 py-2.5">Platform</th>
                <th className="px-3 py-2.5">Items</th>
                <th className="px-3 py-2.5">Total</th>
                <th className="px-3 py-2.5">Sumber Modal</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-3 py-2.5">{o.tanggal}</td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant="secondary"
                      className={
                        o.platform === "Shopee"
                          ? "bg-orange-500/15 text-orange-700"
                          : "bg-purple-500/15 text-purple-700"
                      }
                    >
                      {o.platform}
                    </Badge>
                  </td>
                  <td className="max-w-[260px] px-3 py-2.5">
                    {o.items.map((i) => `${i.nama} (${i.qty}x)`).join(", ")}
                  </td>
                  <td className="px-3 py-2.5 font-semibold">
                    {rp(o.total_biaya)}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {o.sumber_modal || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      className={
                        o.status === "Dipesan"
                          ? "bg-blue-500/15 text-blue-700"
                          : o.status === "Dikirim"
                            ? "bg-orange-500/15 text-orange-700"
                            : "bg-success/15 text-success"
                      }
                    >
                      {o.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      {o.status === "Dipesan" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleKirim(o)}
                          title="Tandai dikirim"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(o);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(o)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PesanModal
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        pt={pt}
      />
    </div>
  );
}

function PesanModal({
  open,
  onOpenChange,
  editing,
  pt,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Order | null;
  pt: ProfitTotals;
}) {
  const confirm = useConfirm();
  const [platform, setPlatform] = useState(editing?.platform ?? "Shopee");
  const [tanggal, setTanggal] = useState(editing?.tanggal ?? today());
  const [resi, setResi] = useState(editing?.resi ?? "");
  const [ongkir, setOngkir] = useState(editing?.ongkir ?? 0);
  const [catatan, setCatatan] = useState(editing?.catatan ?? "");
  const [items, setItems] = useState<OrderItem[]>(
    editing?.items ?? [{ nama: "", qty: 1, harga: 0 }],
  );

  // Sync when editing changes
  useMemoSyncEditing(editing, {
    setPlatform,
    setTanggal,
    setResi,
    setOngkir,
    setCatatan,
    setItems,
  });

  const subtotal = items.reduce((s, i) => s + i.qty * i.harga, 0);
  const total = subtotal + (ongkir || 0);
  const mi = getModalInfo(total, pt);

  async function save() {
    const validItems = items.filter((i) => i.nama && i.qty > 0 && i.harga > 0);
    if (validItems.length === 0) {
      toast.error("Tambahkan minimal 1 item valid");
      return;
    }
    if (mi.isUtang) {
      const ok = await confirm({
        title: "Modal tidak cukup",
        message: `Tersedia: ${rp(mi.totalAvailable)}\nDibutuhkan: ${rp(total)}\nKekurangan: ${rp(mi.kekurangan)}\n\nKekurangan akan masuk ke Modal Talangan sebagai UTANG. Lanjutkan?`,
      });
      if (!ok) return;
    }

    const totalQty = validItems.reduce((s, i) => s + i.qty, 0);
    const hargaAvg = totalQty > 0 ? Math.round(total / totalQty) : 0;

    // Restore old modal if editing
    let base: ProfitTotals = { ...pt };
    if (editing) {
      base = {
        ...base,
        total_modal: base.total_modal + (editing.modal_putar_used || 0),
        modal_talangan:
          base.modal_talangan + (editing.modal_talangan_used || 0),
      };
    }
    const newMi = getModalInfo(total, base);
    const updatedPt: ProfitTotals = {
      ...base,
      total_modal: base.total_modal - newMi.mpUsed,
      modal_talangan: base.modal_talangan - newMi.mtUsed,
    };
    await upsertRow("profit_totals", updatedPt);

    const data: Order = {
      id: editing?.id ?? uid(),
      platform,
      tanggal,
      resi: resi || null,
      ongkir,
      total_biaya: total,
      harga_avg: hargaAvg,
      catatan: catatan || null,
      status: editing?.status ?? "Dipesan",
      tanggal_terima: editing?.tanggal_terima ?? null,
      items: validItems,
      sumber_modal: newMi.sumber,
      modal_putar_used: newMi.mpUsed,
      modal_talangan_used: newMi.mtUsed,
    };
    if (editing) {
      await updateRow("orders", editing.id, data);
    } else {
      await insertRow("orders", data);
    }
    toast.success(
      `Pesanan disimpan! Sumber: ${newMi.sumber}${
        newMi.isUtang ? ` (utang ${rp(newMi.kekurangan)})` : ""
      }`,
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Pesanan" : "Pesanan Baru"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Shopee">Shopee</SelectItem>
                  <SelectItem value="TikTok">TikTok</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tanggal</Label>
              <Input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>No. Resi</Label>
              <Input
                value={resi || ""}
                onChange={(e) => setResi(e.target.value)}
                placeholder="opsional"
              />
            </div>
            <div>
              <Label>Ongkir</Label>
              <Input
                type="number"
                value={ongkir}
                onChange={(e) => setOngkir(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <Label>Item</Label>
            <div className="mt-1.5 space-y-2">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_70px_110px_40px] items-center gap-2"
                >
                  <Input
                    placeholder="Nama barang"
                    value={it.nama}
                    onChange={(e) => {
                      const c = [...items];
                      c[idx] = { ...c[idx], nama: e.target.value };
                      setItems(c);
                    }}
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={it.qty}
                    onChange={(e) => {
                      const c = [...items];
                      c[idx] = { ...c[idx], qty: parseInt(e.target.value) || 0 };
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
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setItems([...items, { nama: "", qty: 1, harga: 0 }])
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Tambah Item
              </Button>
            </div>
          </div>

          <div>
            <Label>Catatan</Label>
            <Textarea
              rows={2}
              value={catatan || ""}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{rp(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Ongkir</span>
              <span>{rp(ongkir)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t pt-1 font-bold">
              <span>Total Biaya</span>
              <span>{rp(total)}</span>
            </div>
            <div
              className={`mt-2 rounded px-2 py-1.5 text-xs ${
                mi.isUtang
                  ? "bg-destructive/15 text-destructive"
                  : "bg-success/15 text-success"
              }`}
            >
              Sumber Modal: <b>{mi.sumber}</b>
              {mi.sumber === "Gabungan" &&
                ` (Putar ${rp(mi.mpUsed)} + Talangan ${rp(mi.mtUsed)})`}
              {mi.isUtang && ` — UTANG ${rp(mi.kekurangan)}`}
            </div>
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

import { useEffect } from "react";
function useMemoSyncEditing(editing: Order | null, setters: any) {
  useEffect(() => {
    if (!editing) {
      setters.setPlatform("Shopee");
      setters.setTanggal(today());
      setters.setResi("");
      setters.setOngkir(0);
      setters.setCatatan("");
      setters.setItems([{ nama: "", qty: 1, harga: 0 }]);
      return;
    }
    setters.setPlatform(editing.platform);
    setters.setTanggal(editing.tanggal);
    setters.setResi(editing.resi ?? "");
    setters.setOngkir(editing.ongkir);
    setters.setCatatan(editing.catatan ?? "");
    setters.setItems(editing.items);
  }, [editing?.id]); // eslint-disable-line
}
