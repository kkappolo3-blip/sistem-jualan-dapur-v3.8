import { createFileRoute } from "@tanstack/react-router";
import { useBackorders } from "@/hooks/use-tables";
import { deleteRow, updateRow } from "@/lib/sync-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, ClipboardList, CheckCircle2 } from "lucide-react";
import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { today } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/backorder")({
  component: BackorderPage,
  head: () => ({ meta: [{ title: "Pesanan Tanpa Stok — Toko Dapur Kampung" }] }),
});

function BackorderPage() {
  const { data: bos } = useBackorders();
  const confirm = useConfirm();
  const list = [...bos].sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));

  const menunggu = list.filter((b) => b.status === "Menunggu");
  const dipenuhi = list.filter((b) => b.status === "Dipenuhi");

  async function hapus(id: string) {
    const ok = await confirm({
      title: "Hapus backorder?",
      message: "Permintaan akan dihapus dari daftar.",
      destructive: true,
    });
    if (!ok) return;
    await deleteRow("backorders", id);
    toast.success("Backorder dihapus");
  }

  async function tandaiDipenuhi(id: string) {
    await updateRow("backorders", id, {
      status: "Dipenuhi",
      tanggal_dipenuhi: today(),
    });
    toast.success("Ditandai sudah dipenuhi");
  }

  return (
    <div className="space-y-5">
      <Section title={`Menunggu (${menunggu.length})`}>
        {menunggu.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Tidak ada permintaan menunggu"
          />
        ) : (
          <Table rows={menunggu} onDel={hapus} onDone={tandaiDipenuhi} />
        )}
      </Section>
      <Section title={`Sudah Dipenuhi (${dipenuhi.length})`}>
        {dipenuhi.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada.</p>
        ) : (
          <Table rows={dipenuhi} onDel={hapus} />
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Table({
  rows,
  onDel,
  onDone,
}: {
  rows: any[];
  onDel: (id: string) => void;
  onDone?: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="py-2">Tgl</th>
            <th className="py-2">Barang</th>
            <th className="py-2">Qty</th>
            <th className="py-2">Pembeli</th>
            <th className="py-2">Status</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-t">
              <td className="py-2 pr-2">{b.tanggal}</td>
              <td className="py-2 pr-2 font-medium">{b.nama}</td>
              <td className="py-2 pr-2">×{b.qty}</td>
              <td className="py-2 pr-2">{b.pembeli || "—"}</td>
              <td className="py-2 pr-2">
                <Badge
                  className={
                    b.status === "Menunggu"
                      ? "bg-warning/15 text-warning"
                      : "bg-success/15 text-success"
                  }
                >
                  {b.status}
                </Badge>
              </td>
              <td className="py-2 pr-2">
                <div className="flex gap-1">
                  {onDone && b.status === "Menunggu" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDone(b.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDel(b.id)}
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
  );
}
