import type { ProfitTotals, Sale } from "./types";

export const getRevenue = (s: Sale) =>
  s.cara_bayar === "cicilan" ? s.cicil_bayar || 0 : s.total_jual;

export type ModalInfo = {
  sumber: "Modal Putar" | "Gabungan" | "Modal Talangan";
  mpUsed: number;
  mtUsed: number;
  modalPutar: number;
  modalTalangan: number;
  totalAvailable: number;
  isUtang: boolean;
  kekurangan: number;
};

export function getModalInfo(
  totalBiaya: number,
  pt: ProfitTotals,
): ModalInfo {
  const mp = pt.total_modal;
  const mt = pt.modal_talangan;
  let sumber: ModalInfo["sumber"];
  let mpUsed = 0;
  let mtUsed = 0;
  if (mp >= totalBiaya) {
    sumber = "Modal Putar";
    mpUsed = totalBiaya;
  } else {
    mpUsed = Math.max(0, mp);
    mtUsed = totalBiaya - mpUsed;
    sumber = mp > 0 ? "Gabungan" : "Modal Talangan";
  }
  const totalAvailable = mp + mt;
  const isUtang = mtUsed > mt;
  return {
    sumber,
    mpUsed,
    mtUsed,
    modalPutar: mp,
    modalTalangan: mt,
    totalAvailable,
    isUtang,
    kekurangan: isUtang ? mtUsed - mt : 0,
  };
}
