import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Options = {
  title?: string;
  message: string;
  confirmText?: string;
  requireCode?: boolean;
  destructive?: boolean;
};

type Ctx = (opts: Options) => Promise<boolean>;
const ConfirmCtx = createContext<Ctx | null>(null);

const DELETE_CODE = "88040773";

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<Options>({ message: "" });
  const [code, setCode] = useState("");
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const confirm = useCallback<Ctx>((o) => {
    setOpts(o);
    setCode("");
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleClose = (result: boolean) => {
    if (result && opts.requireCode && code !== DELETE_CODE) {
      toast.error(`Kode konfirmasi salah! Masukkan ${DELETE_CODE}`);
      return;
    }
    setOpen(false);
    resolver?.(result);
    setResolver(null);
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <AlertDialog open={open} onOpenChange={(v) => !v && handleClose(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{opts.title ?? "Konfirmasi"}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap">
              {opts.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {opts.requireCode && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Masukkan kode konfirmasi
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={DELETE_CODE}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Kode: <span className="font-mono font-bold">{DELETE_CODE}</span>
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleClose(false)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleClose(true)}
              className={
                opts.destructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {opts.confirmText ?? "Konfirmasi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be inside ConfirmProvider");
  return ctx;
}
