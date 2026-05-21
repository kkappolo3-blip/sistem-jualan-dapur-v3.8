import { useTable } from "@/lib/sync-store";
import type {
  Backorder,
  Closing,
  Inventory,
  Order,
  ProfitTotals,
  Sale,
  Settings,
} from "@/lib/types";

export const useOrders = () => useTable<Order>("orders");
export const useInventory = () => useTable<Inventory>("inventory");
export const useSales = () => useTable<Sale>("sales");
export const useClosings = () => useTable<Closing>("closings");
export const useBackorders = () => useTable<Backorder>("backorders");
export const useSettings = () => useTable<Settings>("settings");
export const useProfitTotals = () => useTable<ProfitTotals>("profit_totals");

export const DEFAULT_PROFIT: ProfitTotals = {
  id: "main",
  total_profit: 0,
  total_zakat: 0,
  total_gaji: 0,
  total_modal: 0,
  modal_talangan: 0,
  last_closing_date: null,
};

export const DEFAULT_SETTINGS: Settings = {
  id: "main",
  nama: "Toko Dapur Kampung",
  pemilik: "",
  alamat: "",
  hp: "",
  lokasi: "Teras Rumah",
};

export function useProfitOrDefault(): ProfitTotals {
  const { data } = useProfitTotals();
  return data.find((d) => d.id === "main") ?? DEFAULT_PROFIT;
}

export function useSettingsOrDefault(): Settings {
  const { data } = useSettings();
  return data.find((d) => d.id === "main") ?? DEFAULT_SETTINGS;
}
