import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useProfitOrDefault,
  useProfitTotals,
  useClosings,
  DEFAULT_PROFIT,
} from "@/hooks/use-tables";
import { upsertRow } from "@/lib/sync-store";
import type { ProfitTotals } from "@/lib/types";
import { rp } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/bagi")({
  component: BagiPage,
  head: () => ({ meta: [{ title: "Pembagian Laba — Toko Dapur Kampung" }] }),
});

function BagiPage() {
  const pt = useProfitOrDefault();
  const { data: ptRows } = useProfitTotals();
  const { data: closings } = useClosings();
  const confirm = useConfirm();
  const [talangan, setTalangan] = useState(pt.modal_talangan);

  useEffect(() => {
    setTalangan(pt.modal_talangan);
  }, [pt.modal_talangan]);

  async function bayar(kind: "zakat" | "gaji") {
    const amount = kind === "zakat" ? pt.total_zakat : pt.total_gaji;
    if (amount <= 0) {
      toast.warning(`${kind} sudah Rp 0`);
      return;
    }
    const ok = await confirm({
      title: `Bayar ${kind}?`,
      message: `Saldo ${rp(amount)} akan direset ke Rp 0.`,
    });
    if (!ok) return;
    const base = ptRows.find((r) => r.id === "main") ?? DEFAULT_PROFIT;
    const updated: ProfitTotals = {
      ...base,
      ...(kind === "zakat"
        ? { total_zakat: 0 }
        : { total_gaji: 0 }),
    };
    await upsertRow("profit_totals", updated);
    toast.success(`${kind} berhasil dibayar.`);
  }

  async function simpanTalangan() {
    const base = ptRows.find((r) => r.id === "main") ?? DEFAULT_PROFIT;
    await upsertRow<ProfitTotals>("profit_totals", {
      ...base,
      modal_talangan: talangan,
    });
    toast.success(`Modal Talangan: ${rp(talangan)}`);
  }

  const totalModal = pt.total_modal + pt.modal_talangan;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <SplitCard
          pct="5%"
          label="Zakat"
          amount={pt.total_zakat}
          accent="bg-purple-500/10 border-purple-500/30"
          onPay={() => bayar("zakat")}
        />
        <SplitCard
          pct="10%"
          label="Gajimu"
          amount={pt.total_gaji}
          accent="bg-info/10 border-info/30"
          onPay={() => bayar("gaji")}
        />
        <SplitCard
          pct="85%"
          label="Modal Putar"
          amount={pt.total_modal}
          accent="bg-primary/10 border-primary/30"
        />
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-1 font-semibold">Modal Talangan (Modal Pribadi)</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Modal pribadi yang dipakai saat Modal Putar belum cukup. Bisa minus
          jika pesan barang melebihi total modal — dianggap utang ke diri
          sendiri.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="Modal Putar (85%)"
            value={rp(pt.total_modal)}
            tone="primary"
          />
          <Stat
            label={
              pt.modal_talangan < 0
                ? "Modal Talangan (UTANG)"
                : "Modal Talangan"
            }
            value={rp(pt.modal_talangan)}
            tone={pt.modal_talangan < 0 ? "danger" : "success"}
          />
          <Stat label="Total Modal" value={rp(totalModal)} tone="info" />
        </div>
        <div className="mt-4 flex items-end gap-2">
          <div className="flex-1">
            <Label>Set Modal Talangan (Rp)</Label>
            <Input
              type="number"
              value={talangan}
              onChange={(e) => setTalangan(parseInt(e.target.value) || 0)}
            />
          </div>
          <Button onClick={simpanTalangan}>Simpan</Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 font-semibold">Riwayat Closing</h2>
        {closings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada closing.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Periode</th>
                  <th className="py-2">Pemasukan</th>
                  <th className="py-2">Modal</th>
                  <th className="py-2">Opsi</th>
                  <th className="py-2">Laba</th>
                  <th className="py-2">Zakat</th>
                  <th className="py-2">Gaji</th>
                  <th className="py-2">Modal</th>
                </tr>
              </thead>
              <tbody>
                {[...closings]
                  .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
                  .map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="py-2 pr-2 text-xs">
                        {c.periode_mulai}
                        <br />
                        s/d {c.periode_selesai}
                      </td>
                      <td className="py-2 pr-2">{rp(c.total_pemasukan)}</td>
                      <td className="py-2 pr-2">{rp(c.total_modal)}</td>
                      <td className="py-2 pr-2 text-destructive">
                        {rp(c.total_opsi)}
                      </td>
                      <td className="py-2 pr-2 font-bold">{rp(c.laba)}</td>
                      <td className="py-2 pr-2">{rp(c.zakat)}</td>
                      <td className="py-2 pr-2">{rp(c.gaji)}</td>
                      <td className="py-2 pr-2 text-primary font-semibold">
                        {rp(c.modal)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SplitCard({
  pct,
  label,
  amount,
  accent,
  onPay,
}: {
  pct: string;
  label: string;
  amount: number;
  accent: string;
  onPay?: () => void;
}) {
  return (
    <div className={`rounded-xl border-2 p-5 text-center ${accent}`}>
      <div className="text-2xl font-extrabold">{pct}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
      <div className="my-3 text-2xl font-bold">{rp(amount)}</div>
      <p className="text-xs text-muted-foreground">
        Akumulasi semua closing
      </p>
      {onPay && (
        <Button className="mt-3 w-full" onClick={onPay}>
          Bayar {label}
        </Button>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "danger" | "success" | "info";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    danger: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  };
  return (
    <div className={`rounded-lg p-3 text-center ${tones[tone]}`}>
      <div className="text-xs font-semibold opacity-80">{label}</div>
      <div className="mt-1 text-lg font-extrabold">{value}</div>
    </div>
  );
}
