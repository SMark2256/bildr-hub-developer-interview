import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import * as Toast from "@radix-ui/react-toast";
import { X } from "lucide-react";

const NotifyContext = createContext<((message: string) => void) | null>(null);

export function useNotify() {
  const notify = useContext(NotifyContext);
  if (!notify) throw new Error("A figyelmeztetés nincs bekötve.");
  return notify;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null,
  );
  const notify = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);
  return (
    <NotifyContext.Provider value={notify}>
      <Toast.Provider duration={6000} label="Értesítések">
        {children}
        {toast ? (
          <Toast.Root
            key={toast.id}
            className="toast"
            role="status"
            defaultOpen
            onOpenChange={(open) => {
              if (!open) setToast(null);
            }}
          >
            <Toast.Description>{toast.message}</Toast.Description>
            <Toast.Close className="toast-close" aria-label="Bezárás">
              <X size={16} aria-hidden="true" />
            </Toast.Close>
          </Toast.Root>
        ) : null}
        <Toast.Viewport className="toast-viewport" />
      </Toast.Provider>
    </NotifyContext.Provider>
  );
}
