import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/stat-card";
import { Wallet, TrendingUp, AlertCircle, ListChecks } from "lucide-react";
import {
  useSales,
  useClosings,
  useProfitOrDefault,
  useProfitTotals,
  DEFAULT_PROFIT,
} from "@/hooks/use-tables";
import { rp, today, uid } from "@/lib/utils";
import { getRevenue } from "@/lib/business";
import type { Closing, OpsiItem, ProfitTotals } from "@/lib/types";
import { insertRow, upsertRow } from "@/lib/sync-store";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";

export const Route = createFileRoute("/closing")({
  component: ClosingPage,
  head: () => ({ meta: [{ title: "Closing — Toko Dapur Kampung" }] }),
});

function ClosingPage() {
  const { data: sales } = useSales();
  const pt = useProfitOrDefault();
  const { data: ptRows } = useProfitTotals();
  const confirm = useConfirm();
  const [opsi, setOpsi] = useState<OpsiItem[]>([]);

  const totalJual = sales.reduce((s, t) => s + t.total_jual, 0);
  const totalPemasukan = sales.reduce((s, t) => s + getRevenue(t), 0);
  const totalModal = sales.reduce((s, t) => s + t.total_modal, 0);
  const labaKotor = totalPemasukan - totalModal;
  const totalOpsi = opsi.reduce((s, i) => s + i.nominal, 0);
  const labaBersih = labaKotor - totalOpsi;
  const piutang = sales
    .filter((s) => s.cara_bayar === "cicilan")
    .reduce((s, t) => s + (t.total_jual - (t.cicil_bayar || 0)), 0);
  const zakat = Math.round(labaBersih * 0.05);
  const gaji = Math.round(labaBersih * 0.1);
  const modal = labaBersih - zakat - gaji;

  async function doClosing() {
    if (sales.length === 0) {
      toast.error("Tidak ada penjualan untuk di-closing");
      return;
    }
    const ok = await confirm({
      title: "Lakukan closing?",
      message: `${sales.length} transaksi akan dimasukkan ke riwayat closing dan akumulasi laba diperbarui.`,
    });
    if (!ok) return;

    const c: Closing = {
      id: uid(),
      tanggal: today(),
      periode_mulai:
        pt.last_closing_date ||
        sales[sales.length - 1]?.tanggal ||
        today(),
      periode_selesai: today(),
      jumlah_trx: sales.length,
      total_jual: totalJual,
      total_pemasukan: totalPemasukan,
      total_modal: totalModal,
      laba_kotor: labaKotor,
      piutang_cicilan: piutang,
      total_opsi: totalOpsi,
      opsi_items: opsi,
      laba: labaBersih,
      zakat,
      gaji,
      modal,
    };
    await insertRow("closings", c);

    const base = ptRows.find((r) => r.id === "main") ?? DEFAULT_PROFIT;
    const updated: ProfitTotals = {
      ...base,
      total_profit: base.total_profit + labaBersih,
      total_zakat: base.total_zakat + zakat,
      total_gaji: base.total_gaji + gaji,
      total_modal: base.total_modal + modal,
      last_closing_date: today(),
    };
    await upsertRow("profit_totals", updated);
    toast.success(
      `Closing berhasil! Laba ${rp(labaBersih)} (Zakat ${rp(zakat)}, Gaji ${rp(gaji)}, Modal ${rp(modal)})`,
    );
    setOpsi([]);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Pemasukan Aktual"
          value={rp(totalPemasukan)}
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="Total Modal"
          value={rp(totalModal)}
          icon={ListChecks}
          tone="info"
        />
        <StatCard
          label="Laba Kotor"
          value={rp(labaKotor)}
          icon={TrendingUp}
          tone={labaKotor >= 0 ? "primary" : "danger"}
        />
        <StatCard
          label="Biaya Operasional"
          value={rp(totalOpsi)}
          icon={AlertCircle}
          tone="danger"
        />
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Biaya Operasional</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setOpsi([...opsi, { nama: "", nominal: 0 }])
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Tambah Biaya
          </Button>
        </div>
        {opsi.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada biaya. Misal: listrik, pulsa, transport, dll.
          </p>
        ) : (
          <div className="space-y-2">
            {opsi.map((o, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[1fr_140px_40px] items-center gap-2"
              >
                <Input
                  placeholder="Nama biaya"
                  value={o.nama}
                  onChange={(e) => {
                    const c = [...opsi];
                    c[idx] = { ...c[idx], nama: e.target.value };
                    setOpsi(c);
                  }}
                />
                <Input
                  type="number"
                  placeholder="0"
                  value={o.nominal}
                  onChange={(e) => {
                    const c = [...opsi];
                    c[idx] = {
                      ...c[idx],
                      nominal: parseInt(e.target.value) || 0,
                    };
                    setOpsi(c);
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setOpsi(opsi.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5">
        <div className="mb-3 text-sm font-semibold">Rangkuman Closing</div>
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <Line label="Laba Bersih" value={rp(labaBersih)} bold />
          <Line label="Piutang Cicilan" value={rp(piutang)} />
          <Line label="Zakat (5%)" value={rp(zakat)} />
          <Line label="Gaji (10%)" value={rp(gaji)} />
          <Line label="Modal Putar (85%)" value={rp(modal)} />
        </div>
        <Button className="mt-4 w-full" onClick={doClosing} size="lg">
          Lakukan Closing Sekarang
        </Button>
      </div>
    </div>
  );
}

function Line({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between border-b border-dashed py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}
