"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  requireText?: string;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [typedValue, setTypedValue] = useState("");
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(
    null
  );

  const confirm = useCallback((nextOptions: ConfirmOptions) => {
    setOptions(nextOptions);
    setTypedValue("");
    setOpen(true);

    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  function close(result: boolean) {
    setOpen(false);
    resolver?.(result);
    setResolver(null);
    setOptions(null);
    setTypedValue("");
  }

  const canConfirm = options?.requireText
    ? typedValue === options.requireText
    : true;

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      <Modal
        open={open}
        onClose={() => close(false)}
        title={options?.title ?? "Onay"}
        description={options?.description}
        size="sm"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => close(false)}>
              {options?.cancelLabel ?? "Vazgeç"}
            </Button>
            <Button
              variant={options?.variant === "danger" ? "danger" : "primary"}
              type="button"
              disabled={!canConfirm}
              onClick={() => close(true)}
            >
              {options?.confirmLabel ?? "Onayla"}
            </Button>
          </>
        }
      >
        {options?.requireText && (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              Devam etmek için <strong>{options.requireText}</strong> yazın.
            </p>
            <input
              value={typedValue}
              onChange={(event) => setTypedValue(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-900"
              placeholder={options.requireText}
            />
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }

  return context;
}
