import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingCart,
  PackageCheck,
  Receipt,
  CalendarClock,
  PieChart,
  BarChart3,
  TrendingUp,
  ClipboardList,
  Wallet,
  Boxes,
  History,
  Settings as SettingsIcon,
  Store,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrders, useBackorders, useSales, useInventory } from "@/hooks/use-tables";
import { useState } from "react";
import { rp } from "@/lib/utils";

type Item = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  step?: number;
  badge?: () => { value: number; red?: boolean } | null;
};

function useBadges() {
  const { data: orders } = useOrders();
  const { data: backorders } = useBackorders();
  const { data: sales } = useSales();
  return {
    dipesan: orders.filter((o) => o.status === "Dipesan").length,
    dikirim: orders.filter((o) => o.status === "Dikirim").length,
    backorders: backorders.filter((b) => b.status === "Menunggu").length,
    cicilan: sales.filter(
      (s) => s.cara_bayar === "cicilan" && (s.cicil_bayar ?? 0) < s.total_jual,
    ).length,
  };
}

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const b = useBadges();
  const { data: inv } = useInventory();
  const [expandStok, setExpandStok] = useState(false);

  const sections: { title: string; items: Item[] }[] = [
    {
      title: "Alur Jualan",
      items: [
        { to: "/", label: "Dashboard", icon: LayoutDashboard },
        {
          to: "/pesan",
          label: "Pesan Barang",
          icon: ShoppingCart,
          step: 1,
          badge: () => (b.dipesan ? { value: b.dipesan } : null),
        },
        {
          to: "/terima",
          label: "Terima Barang",
          icon: PackageCheck,
          step: 2,
          badge: () => (b.dikirim ? { value: b.dikirim } : null),
        },
        { to: "/jual", label: "Catat Penjualan", icon: Receipt, step: 3 },
        { to: "/closing", label: "Closing", icon: CalendarClock, step: 4 },
        { to: "/bagi", label: "Pembagian Laba", icon: PieChart, step: 5 },
      ],
    },
    {
      title: "Analisis",
      items: [
        { to: "/insight", label: "Insight Penjualan", icon: BarChart3 },
        { to: "/evaluasi", label: "Evaluasi Bulanan", icon: TrendingUp },
        {
          to: "/backorder",
          label: "Pesanan Tanpa Stok",
          icon: ClipboardList,
          badge: () => (b.backorders ? { value: b.backorders, red: true } : null),
        },
        {
          to: "/cicilan",
          label: "Pelanggan Cicilan",
          icon: Wallet,
          badge: () => (b.cicilan ? { value: b.cicilan, red: true } : null),
        },
      ],
    },
    {
      title: "Manajemen",
      items: [
        { to: "/stok", label: "Stok Barang", icon: Boxes },
        { to: "/riwayat", label: "Riwayat", icon: History },
        { to: "/pengaturan", label: "Pengaturan", icon: SettingsIcon },
      ],
    },
  ];

  return (
    <aside className="flex h-full w-[270px] flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-sidebar">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">
              Toko Dapur Kampung
            </h1>
            <p className="text-[10px] uppercase tracking-widest opacity-50">
              Manajemen v2
            </p>
          </div>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto py-3">
        {sections.map((sec) => (
          <div key={sec.title} className="mb-1">
            <div className="px-5 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-widest opacity-40">
              {sec.title}
            </div>
            {sec.items.map((it) => {
              const active =
                it.to === "/" ? path === "/" : path.startsWith(it.to);
              const badge = it.badge?.();
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  onClick={onNavigate}
                  className={cn(
                    "relative flex items-center gap-3 border-l-[3px] border-transparent px-5 py-2.5 text-[13px] font-medium transition-colors",
                    "hover:bg-white/5",
                    active &&
                      "border-l-accent bg-white/10 text-accent-light",
                  )}
                >
                  {it.step ? (
                    <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-accent text-[11px] font-extrabold text-sidebar">
                      {it.step}
                    </span>
                  ) : (
                    <Icon className="h-[18px] w-[18px] flex-none opacity-70" />
                  )}
                  <span className="flex-1 truncate">{it.label}</span>
                  {badge && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                        badge.red
                          ? "bg-destructive text-white pulse-dot"
                          : "bg-accent text-sidebar",
                      )}
                    >
                      {badge.value}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Daftar Stok & Harga Section */}
        <div className="mb-1">
          <button
            onClick={() => setExpandStok(!expandStok)}
            className={cn(
              "relative flex w-full items-center gap-3 border-l-[3px] border-transparent px-5 py-2.5 text-[13px] font-medium transition-colors",
              "hover:bg-white/5",
              expandStok && "border-l-accent bg-white/10 text-accent-light",
            )}
          >
            <Boxes className="h-[18px] w-[18px] flex-none opacity-70" />
            <span className="flex-1 truncate text-left">Daftar Stok & Harga</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expandStok && "rotate-180",
              )}
            />
          </button>

          {expandStok && (
            <div className="max-h-[400px] overflow-y-auto bg-white/5 py-2">
              {inv.length === 0 ? (
                <div className="px-5 py-3 text-[12px] opacity-50">
                  Tidak ada produk
                </div>
              ) : (
                <div className="space-y-1">
                  {inv.map((item) => (
                    <div
                      key={item.id}
                      className="border-l border-white/10 px-5 py-2 text-[12px]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-accent-light truncate">
                            {item.nama}
                          </p>
                          <div className="mt-0.5 space-y-0.5 text-[11px] opacity-70">
                            <p>Stok: {item.stok} unit</p>
                            <p className="text-accent">
                              Jual: {rp(item.harga_jual)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="border-t border-white/10 px-5 py-3 text-[10px] opacity-40">
        Multi-device sync aktif
      </div>
    </aside>
  );
}
