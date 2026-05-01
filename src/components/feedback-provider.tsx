"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: number;
  variant: ToastVariant;
  title?: string;
  message: string;
  duration: number;
};

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger" | "success" | "error" | "info";
};

type AlertOptions = {
  title?: string;
  message: string;
  variant?: "success" | "error" | "info";
  okLabel?: string;
};

type FeedbackCtx = {
  toast: (opts: {
    variant?: ToastVariant;
    title?: string;
    message: string;
    duration?: number;
  }) => void;
  toastSuccess: (message: string, title?: string) => void;
  toastError: (message: string, title?: string) => void;
  toastInfo: (message: string, title?: string) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  alert: (opts: AlertOptions) => Promise<void>;
  /** Atalho: notifica resultado de uma action (insert/update/delete). */
  alertSuccess: (message: string, title?: string) => Promise<void>;
  alertError: (message: string, title?: string) => Promise<void>;
};

const Ctx = createContext<FeedbackCtx | null>(null);

export function useFeedback() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useFeedback deve ser usado dentro de <FeedbackProvider>");
  }
  return ctx;
}

let _id = 0;

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<
    | (ConfirmOptions & {
        resolve: (v: boolean) => void;
      })
    | null
  >(null);

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<FeedbackCtx["toast"]>(
    ({ variant = "info", title, message, duration = 4500 }) => {
      const id = ++_id;
      setToasts((cur) => [...cur, { id, variant, title, message, duration }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const toastSuccess = useCallback(
    (message: string, title?: string) =>
      toast({ variant: "success", title, message }),
    [toast],
  );
  const toastError = useCallback(
    (message: string, title?: string) =>
      toast({ variant: "error", title, message, duration: 6000 }),
    [toast],
  );
  const toastInfo = useCallback(
    (message: string, title?: string) =>
      toast({ variant: "info", title, message }),
    [toast],
  );

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setConfirmState({ ...opts, resolve });
      }),
    [],
  );

  const alertModal = useCallback(
    ({ title, message, variant = "info", okLabel = "Ok" }: AlertOptions) =>
      new Promise<void>((resolve) => {
        setConfirmState({
          title,
          message,
          confirmLabel: okLabel,
          cancelLabel: "",
          variant,
          resolve: () => resolve(),
        });
      }),
    [],
  );

  const alertSuccess = useCallback(
    (message: string, title = "Tudo certo") =>
      alertModal({ title, message, variant: "success" }),
    [alertModal],
  );
  const alertError = useCallback(
    (message: string, title = "Algo deu errado") =>
      alertModal({ title, message, variant: "error" }),
    [alertModal],
  );

  return (
    <Ctx.Provider
      value={{
        toast,
        toastSuccess,
        toastError,
        toastInfo,
        confirm,
        alert: alertModal,
        alertSuccess,
        alertError,
      }}
    >
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
      <ConfirmModal
        state={confirmState}
        onClose={() => setConfirmState(null)}
      />
    </Ctx.Provider>
  );
}

/* =========== Toast viewport =========== */

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm sm:w-auto pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
  }, []);

  const icon =
    toast.variant === "success" ? "✓" : toast.variant === "error" ? "✕" : "ⓘ";
  const styles =
    toast.variant === "success"
      ? "border-success/40 bg-green-50 text-success"
      : toast.variant === "error"
        ? "border-danger/40 bg-red-50 text-danger"
        : "border-accent/40 bg-accent-soft text-accent";

  return (
    <div
      role="status"
      className={`pointer-events-auto rounded-2xl border bg-bg-elev shadow-lg overflow-hidden transition-all duration-300 ease-out transform ${
        show
          ? "translate-x-0 opacity-100"
          : "translate-x-[120%] opacity-0"
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3 pr-10 relative">
        <span
          className={`shrink-0 mt-0.5 inline-flex items-center justify-center size-6 rounded-full border ${styles} font-bold text-xs`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          {toast.title && (
            <div className="font-semibold text-fg text-sm">{toast.title}</div>
          )}
          <div className="text-sm text-fg-muted whitespace-pre-line">
            {toast.message}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-2.5 right-2.5 text-fg-dim hover:text-fg text-xs leading-none p-1"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>
      {/* progress bar */}
      <div className="h-0.5 bg-border overflow-hidden">
        <div
          className={`h-full ${
            toast.variant === "success"
              ? "bg-success"
              : toast.variant === "error"
                ? "bg-danger"
                : "bg-accent"
          } origin-left animate-toast-progress`}
          style={{
            animationDuration: `${toast.duration}ms`,
          }}
        />
      </div>
    </div>
  );
}

/* =========== Confirm modal =========== */

function ConfirmModal({
  state,
  onClose,
}: {
  state:
    | (ConfirmOptions & { resolve: (v: boolean) => void })
    | null;
  onClose: () => void;
}) {
  const [show, setShow] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!state) {
      setShow(false);
      return;
    }
    requestAnimationFrame(() => setShow(true));
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        state?.resolve(false);
        onClose();
      }
      if (e.key === "Enter") {
        state?.resolve(true);
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    cancelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [state, onClose]);

  if (!state) return null;

  const {
    title,
    message,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    variant = "default",
  } = state;

  const tone = (() => {
    if (variant === "danger" || variant === "error")
      return {
        accentBg: "bg-red-50",
        accentBorder: "border-danger/40",
        accentText: "text-danger",
        confirmBg: "bg-danger hover:bg-red-700",
        icon: variant === "danger" ? "!" : "✕",
      };
    if (variant === "success")
      return {
        accentBg: "bg-green-50",
        accentBorder: "border-success/40",
        accentText: "text-success",
        confirmBg: "bg-success hover:bg-green-700",
        icon: "✓",
      };
    if (variant === "info")
      return {
        accentBg: "bg-accent-soft",
        accentBorder: "border-accent/40",
        accentText: "text-accent",
        confirmBg: "bg-accent hover:opacity-90",
        icon: "ⓘ",
      };
    return {
      accentBg: "bg-accent-soft",
      accentBorder: "border-accent/40",
      accentText: "text-accent",
      confirmBg: "bg-accent hover:opacity-90",
      icon: "?",
    };
  })();

  return (
    <div
      className={`fixed inset-0 z-[150] flex items-center justify-center p-4 transition-opacity duration-200 ${
        show ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => {
          state.resolve(false);
          onClose();
        }}
      />
      {/* content */}
      <div
        className={`relative w-full max-w-md rounded-3xl border border-border bg-bg-elev shadow-2xl transition-all duration-200 ${
          show
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-3 scale-95 opacity-0"
        }`}
      >
        <div className="p-6">
          {title && (
            <div className={`flex items-center gap-3 mb-3 text-fg`}>
              <span
                className={`inline-flex items-center justify-center size-9 rounded-full border ${tone.accentBg} ${tone.accentBorder} ${tone.accentText} text-base font-bold`}
              >
                {tone.icon}
              </span>
              <h3 className="text-lg font-bold tracking-tight">{title}</h3>
            </div>
          )}
          <p className="text-sm text-fg-muted whitespace-pre-line">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 pb-6">
          {cancelLabel && (
            <button
              ref={cancelRef}
              type="button"
              onClick={() => {
                state.resolve(false);
                onClose();
              }}
              className="h-10 px-4 rounded-xl border border-border text-fg hover:bg-bg-card transition-colors text-sm font-semibold"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              state.resolve(true);
              onClose();
            }}
            className={`h-10 px-5 rounded-xl text-sm font-bold transition-colors text-white ${tone.confirmBg}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
