import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const rp = (n: number | null | undefined): string => {
  const v = Number(n || 0);
  return "Rp " + v.toLocaleString("id-ID");
};

export const today = () => new Date().toISOString().slice(0, 10);

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const roundPrice = (n: number) => Math.ceil(n / 5000) * 5000;

export const hitungHargaJual = (hargaBeli: number) =>
  roundPrice(Math.ceil(hargaBeli * 1.3));

export const formatTanggal = (s: string) => {
  try {
    return new Date(s).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return s;
  }
};

export const formatTanggalPendek = (s: string) => {
  try {
    return new Date(s).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return s;
  }
};
