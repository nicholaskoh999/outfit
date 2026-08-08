import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ToastAction {
  label: string;
  onAction: () => void;
}

interface ToastData {
  id: number;
  message: string;
  actions: ToastAction[];
}

interface ToastApi {
  toast: (message: string, ...actions: ToastAction[]) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const counter = useRef(0);

  const toast = useCallback<ToastApi["toast"]>((message, ...actions) => {
    if (timer.current) clearTimeout(timer.current);
    setCurrent({ id: ++counter.current, message, actions });
    timer.current = setTimeout(() => setCurrent(null), 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {current && (
        <div
          key={current.id}
          role="status"
          className="fixed z-[60] bottom-[calc(4.5rem+env(safe-area-inset-bottom))] sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-5 bg-ink text-paper pl-5 pr-4 py-3 rounded-[3px] shadow-lg animate-fade-up text-sm"
        >
          <span className="whitespace-nowrap font-light">{current.message}</span>
          {current.actions.map((action) => (
            <button
              key={action.label}
              className="whitespace-nowrap uppercase text-[11px] tracking-[0.14em] underline underline-offset-4 cursor-pointer"
              onClick={() => {
                action.onAction();
                if (timer.current) clearTimeout(timer.current);
                setCurrent(null);
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
