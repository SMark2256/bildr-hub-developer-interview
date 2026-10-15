import { useSyncExternalStore, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@client/components/ui/button";
import { Badge } from "@client/components/ui/badge";
import { batchStatusLabels, type BatchStatus } from "@shared/schemas/batch";
import { taskStatusLabels, type TaskStatus } from "@shared/schemas/task";
import {
  orderStatusLabels,
  type OrderStatus,
  todayInBudapest,
} from "@shared/schemas/operations";
export const number = new Intl.NumberFormat("hu-HU");
export function go(path: string) {
  window.location.hash = path;
}
function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
export function useRoute() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash.slice(1) || "overview",
  );
}
export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return (
    <Badge variant="outline" className={`status status-${status}`}>
      {batchStatusLabels[status]}
    </Badge>
  );
}
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={`status status-${status}`}>
      {taskStatusLabels[status]}
    </Badge>
  );
}
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={`status order-${status}`}>
      {orderStatusLabels[status]}
    </Badge>
  );
}
export function isLate(date: string, status: string) {
  return (
    date < todayInBudapest() &&
    !["fulfilled", "cancelled", "closed"].includes(status)
  );
}
export function DateLabel({
  date,
  late = false,
}: {
  date: string;
  late?: boolean;
}) {
  return (
    <span className={late ? "late" : ""}>
      {date.replaceAll("-", ". ")}
      {late ? <small className="block">Lejárt</small> : null}
    </span>
  );
}
export function Panel({
  title,
  count,
  children,
  action,
}: {
  title?: string;
  count?: number;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel">
      {title ? (
        <div className="panel-title">
          <h2>
            {title}
            {count !== undefined ? <span>{count}</span> : null}
          </h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
// List pages: the page heading names the module, so the panel starts with
// its controls. The result count follows filtering and is announced politely.
export function ListToolbar({
  count,
  unit,
  children,
  action,
}: {
  count: number;
  unit: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="toolbar list-toolbar">
      {children}
      <span className="result-count" aria-live="polite">
        {count} {unit}
      </span>
      {action}
    </div>
  );
}
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="outline" onClick={() => go(href)}>
      <ArrowLeft data-icon="inline-start" aria-hidden="true" />
      {label}
    </Button>
  );
}
export type Heading = string | { label: string; numeric: true };
export function DataTable({
  headings,
  children,
  empty = false,
  emptyMessage = "Nincs a szűrésnek megfelelő találat.",
}: {
  headings: Heading[];
  children: ReactNode;
  empty?: boolean;
  emptyMessage?: string;
}) {
  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {headings.map((h) =>
                typeof h === "string" ? (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ) : (
                  <th key={h.label} scope="col" className="number">
                    {h.label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {empty ? <p className="empty">{emptyMessage}</p> : null}
    </>
  );
}
export function FormFooter({
  error,
  pending,
  close,
  label = "Mentés",
}: {
  error: Error | null;
  pending: boolean;
  close: () => void;
  label?: string;
}) {
  return (
    <>
      {error ? (
        <p role="alert" className="form-error">
          {error.message}
        </p>
      ) : null}
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={close}>
          Mégse
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Mentés…" : label}
        </Button>
      </div>
    </>
  );
}

// Keep table semantics and one keyboard stop: the inline link/button is the
// primary control; pointer clicks elsewhere in the row delegate to it.
export function InteractiveRow({ children }: { children: ReactNode }) {
  return (
    <tr
      className="interactive-row"
      onClick={(event) => {
        if (
          !(event.target instanceof Element) ||
          event.target.closest("a,button,input,select,textarea,label") ||
          window.getSelection()?.toString()
        )
          return;
        const control =
          event.currentTarget.querySelector<HTMLElement>("[data-row-primary]");
        control?.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
          }),
        );
      }}
    >
      {children}
    </tr>
  );
}
