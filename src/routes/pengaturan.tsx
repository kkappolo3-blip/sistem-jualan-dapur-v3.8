/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  useSettingsOrDefault,
  useOrders,
  useInventory,
  useSales,
  useClosings,
  useBackorders,
  useProfitOrDefault,
} from "@/hooks/use-tables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertRow, deleteRow } from "@/lib/sync-store";
import { supabase } from "@/lib/supabase";
import type { Settings } from "@/lib/types";
import { useConfirm } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { Download, Upload, Trash2 } from "lucide-react";

export const Route = createFileRoute("/pengaturan")({
  component: PengaturanPage,
  head: () => ({ meta: [{ title: "Pengaturan — Toko Dapur Kampung" }] }),
});

function PengaturanPage() {
  const settings = useSettingsOrDefault();
  const confirm = useConfirm();
  const [s, setS] = useState<Settings>(settings);

  useEffect(() => setS(settings), [settings.id, settings.nama]);

  const { data: orders } = useOrders();
  const { data: inv } = useInventory();
  const { data: sales } = useSales();
  const { data: closings } = useClosings();
  const { data: backorders } = useBackorders();
  const pt = useProfitOrDefault();

  async function save() {
    await upsertRow<Settings>("settings", { ...s, id: "main" });
    toast.success("Pengaturan disimpan");
  }

  function ekspor() {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      settings: s,
      orders,
      inventory: inv,
      sales,
      closings,
      backorders,
      profit_totals: pt,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `toko-dapur-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup di-download");
  }

  async function impor(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await confirm({
      title: "Impor data?",
      message:
        "Data dari file akan di-upsert ke Supabase. Data yang ID-nya sama akan ditimpa.",
    });
    if (!ok) {
      e.target.value = "";
      return;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const tables = [
        ["orders", data.orders],
        ["inventory", data.inventory],
        ["sales", data.sales],
        ["closings", data.closings],
        ["backorders", data.backorders],
      ] as const;
      for (const [t, rows] of tables) {
        if (Array.isArray(rows) && rows.length) {
          for (const row of rows) {
            await upsertRow(t, row);
          }
        }
      }
      if (data.settings) await upsertRow("settings", { ...data.settings, id: "main" });
      if (data.profit_totals) await upsertRow("profit_totals", { ...data.profit_totals, id: "main" });
      toast.success("Impor selesai");
    } catch (err: any) {
      toast.error("Impor gagal: " + err.message);
    } finally {
      e.target.value = "";
    }
  }

  async function hapusSemua() {
    const ok = await confirm({
      title: "HAPUS SEMUA DATA?",
      message:
        "Semua data orders, inventory, sales, closings, backorders, akan dihapus dari Supabase. Pengaturan dan profit_totals akan direset.",
      destructive: true,
      requireCode: true,
    });
    if (!ok) return;
    try {
      const tables = [
        "orders",
        "inventory",
        "sales",
        "closings",
        "backorders",
      ];
      for (const t of tables) {
        await supabase.from(t).delete().neq("id", "____never____");
      }
      await upsertRow("profit_totals", {
        id: "main",
        total_profit: 0,
        total_zakat: 0,
        total_gaji: 0,
        total_modal: 0,
        modal_talangan: 0,
        last_closing_date: null,
      });
      toast.success("Semua data dihapus");
    } catch (e: any) {
      toast.error("Gagal hapus: " + e.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 font-semibold">Info Toko</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Nama Toko</Label>
            <Input
              value={s.nama}
              onChange={(e) => setS({ ...s, nama: e.target.value })}
            />
          </div>
          <div>
            <Label>Pemilik</Label>
            <Input
              value={s.pemilik}
              onChange={(e) => setS({ ...s, pemilik: e.target.value })}
            />
          </div>
          <div>
            <Label>No. HP / WA</Label>
            <Input
              value={s.hp}
              onChange={(e) => setS({ ...s, hp: e.target.value })}
            />
          </div>
          <div>
            <Label>Lokasi Jualan</Label>
            <Input
              value={s.lokasi}
              onChange={(e) => setS({ ...s, lokasi: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Alamat</Label>
            <Textarea
              rows={2}
              value={s.alamat}
              onChange={(e) => setS({ ...s, alamat: e.target.value })}
            />
          </div>
        </div>
        <Button className="mt-4" onClick={save}>
          Simpan
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 font-semibold">Manajemen Data</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={ekspor}>
            <Download className="mr-1 h-4 w-4" /> Ekspor JSON
          </Button>
          <label>
            <input
              type="file"
              accept="application/json"
              onChange={impor}
              className="hidden"
            />
            <span className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">
              <Upload className="mr-1 h-4 w-4" /> Impor JSON
            </span>
          </label>
          <Button variant="destructive" onClick={hapusSemua}>
            <Trash2 className="mr-1 h-4 w-4" /> Hapus Semua Data
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Backup format: kompatibel dengan versi HTML lama (akan di-upsert per
          tabel).
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5 text-sm">
        <h2 className="mb-2 font-semibold">Tentang Sinkronisasi</h2>
        <p className="text-muted-foreground">
          Aplikasi ini terhubung ke project Supabase eksternal melalui anon key.
          Semua perubahan di device manapun otomatis tersinkron ke device lain
          melalui Supabase Realtime, dan data tersimpan di cache localStorage
          agar tetap bisa dilihat saat offline.
        </p>
      </div>
    </div>
  );
}
