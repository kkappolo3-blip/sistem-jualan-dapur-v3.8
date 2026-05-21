import { Menu, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useOnlineStatus, getAnyLastSync } from "@/lib/sync-store";
import { useRouterState } from "@tanstack/react-router";

const TITLE_MAP: Record<string, string> = {
  "/": "Dashboard",
  "/pesan": "Pesan Barang",
  "/terima": "Terima Barang",
  "/jual": "Catat Penjualan",
  "/closing": "Closing Periode",
  "/bagi": "Pembagian Laba",
  "/insight": "Insight Penjualan",
  "/evaluasi": "Evaluasi Bulanan",
  "/backorder": "Pesanan Tanpa Stok",
  "/cicilan": "Pelanggan Cicilan",
  "/stok": "Stok Barang",
  "/riwayat": "Riwayat",
  "/pengaturan": "Pengaturan",
};

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const online = useOnlineStatus();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const title = TITLE_MAP[path] ?? "Toko Dapur Kampung";

  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const last = getAnyLastSync();
  const lastLabel = last
    ? `Sync ${Math.max(0, Math.round((Date.now() - last) / 1000))}d lalu`
    : "Belum sync";

  const todayLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 md:px-8">
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant="ghost"
          onClick={onMenu}
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-base font-bold md:text-lg">{title}</h1>
          <p className="hidden text-xs text-muted-foreground md:block">
            {todayLabel}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${
            online
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {online ? (
            <Wifi className="h-3.5 w-3.5" />
          ) : (
            <WifiOff className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">
            {online ? "Online" : "Offline"}
          </span>
        </div>
        <div className="hidden items-center gap-1.5 text-muted-foreground sm:flex">
          <RefreshCw className="h-3 w-3" />
          {lastLabel}
        </div>
      </div>
    </header>
  );
}
