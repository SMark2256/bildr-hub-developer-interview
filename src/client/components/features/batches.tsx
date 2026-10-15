import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Textarea } from "@client/components/ui/textarea";
import { Modal } from "@client/components/ui/modal";
import { Field, FieldGroup, FieldLabel } from "@client/components/ui/field";
import {
  useCreateBatch,
  useUpdateBatch,
  type Batch,
  type User,
  type Order,
  type Variant,
} from "@client/hooks/use-data";
import {
  batchStatusLabels,
  batchStatusSchema,
  type BatchStatus,
} from "@shared/schemas/batch";
import { todayInBudapest } from "@shared/schemas/operations";
import {
  Panel,
  DataTable,
  ListToolbar,
  BackLink,
  InteractiveRow,
  FormFooter,
  BatchStatusBadge,
  DateLabel,
  go,
  number,
} from "./common";
import { BatchTasks } from "./tasks";
import type { Task } from "@client/hooks/use-data";
function BatchForm({
  batch,
  variants,
  orders,
  users,
  initialOrderId,
  close,
}: {
  batch?: Batch;
  variants: Variant[];
  orders: Order[];
  users: User[];
  initialOrderId?: number;
  close: () => void;
}) {
  const create = useCreateBatch(),
    update = useUpdateBatch();
  const existingOrder = orders.find((o) => o.id === initialOrderId);
  const [variantId, setVariantId] = useState(
      batch?.variantId ?? existingOrder?.variantId ?? 0,
    ),
    [orderId, setOrderId] = useState(batch?.orderId ?? initialOrderId ?? 0);
  const locked = !!batch && batch.status !== "planned";
  const current = batch ? batchStatusSchema.options.indexOf(batch.status) : 0;
  const save = batch ? update : create;
  return (
    <Modal
      open
      title={batch ? `${batch.batchCode} szerkesztése` : "Új gyártási tétel"}
      description={
        locked
          ? "Elindított gyártásnál a kiszerelés, a rendelés és a mennyiség rögzített."
          : "Válassz kiszerelést és felelőst. Rendelés nélkül saját készletre gyárthatsz."
      }
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          const input = {
            variantId,
            orderId: orderId || null,
            ownerId: Number(d.get("owner")),
            quantity: locked ? batch!.quantity : Number(d.get("quantity")),
            plannedDate: String(d.get("date")),
            notes: String(d.get("notes")),
          };
          if (batch)
            update.mutate(
              {
                ...input,
                id: batch.id,
                status: String(d.get("status")) as BatchStatus,
              },
              { onSuccess: close },
            );
          else create.mutate(input, { onSuccess: close });
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="batch-variant">
              Termék és kiszerelés
            </FieldLabel>
            <select
              id="batch-variant"
              required
              disabled={locked}
              value={variantId || ""}
              onChange={(e) => {
                setVariantId(Number(e.target.value));
                setOrderId(0);
              }}
            >
              <option value="" disabled>
                Válassz kiszerelést
              </option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.productName} · {v.size} · {v.sku}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="batch-order">Kapcsolódó rendelés</FieldLabel>
            <select
              id="batch-order"
              disabled={locked}
              value={orderId}
              onChange={(e) => setOrderId(Number(e.target.value))}
            >
              <option value={0}>Saját készletre, rendelés nélkül</option>
              {orders
                .filter(
                  (o) =>
                    o.variantId === variantId &&
                    (o.status === "confirmed" || o.id === batch?.orderId),
                )
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderCode} · {o.customerName}
                  </option>
                ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="owner">Felelős</FieldLabel>
            <select
              id="owner"
              name="owner"
              required
              defaultValue={batch?.ownerId ?? 2}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="batch-quantity">Mennyiség (db)</FieldLabel>
            <Input
              id="batch-quantity"
              name="quantity"
              type="number"
              required
              min={1}
              max={1000000}
              disabled={locked}
              defaultValue={batch?.quantity ?? existingOrder?.quantity ?? 500}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="batch-date">
              Tervezett gyártási dátum
            </FieldLabel>
            <Input
              id="batch-date"
              name="date"
              type="date"
              required
              defaultValue={batch?.plannedDate ?? todayInBudapest()}
            />
          </Field>
          {batch ? (
            <Field>
              <FieldLabel htmlFor="batch-status">Gyártási állapot</FieldLabel>
              <select
                id="batch-status"
                name="status"
                defaultValue={batch.status}
              >
                {batchStatusSchema.options
                  .filter((_, i) => Math.abs(i - current) <= 1)
                  .map((s) => (
                    <option key={s} value={s}>
                      {batchStatusLabels[s]}
                    </option>
                  ))}
              </select>
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor="batch-notes">Gyártási megjegyzés</FieldLabel>
            <Textarea
              id="batch-notes"
              name="notes"
              maxLength={2000}
              defaultValue={batch?.notes}
            />
          </Field>
        </FieldGroup>
        <FormFooter
          error={save.error}
          pending={save.isPending}
          close={close}
          label={batch ? "Változások mentése" : "Gyártás létrehozása"}
        />
      </form>
    </Modal>
  );
}
export function BatchesPage({
  batches,
  variants,
  orders,
  users,
  tasks,
  detailId,
  newOrderId,
  createRoute = false,
  statusFilter = "",
}: {
  batches: Batch[];
  variants: Variant[];
  orders: Order[];
  users: User[];
  tasks: Task[];
  detailId?: number;
  newOrderId?: number;
  createRoute?: boolean;
  statusFilter?: string;
}) {
  const status = batchStatusSchema.safeParse(statusFilter).success
    ? statusFilter
    : "";
  const [search, setSearch] = useState(""),
    [owner, setOwner] = useState(""),
    [edit, setEdit] = useState<Batch | "new" | null>(null);
  const batch = batches.find((b) => b.id === detailId);
  const filtered = batches.filter(
    (b) =>
      (!status || b.status === status) &&
      (!owner || b.ownerId === Number(owner)) &&
      `${b.batchCode} ${b.productName} ${b.ownerName} ${b.orderCode ?? ""}`
        .toLocaleLowerCase("hu")
        .includes(search.toLocaleLowerCase("hu")),
  );
  const close = () => {
    setEdit(null);
    if (createRoute) go("batches");
  };
  return (
    <>
      {detailId && !batch ? (
        <p className="empty">
          A gyártási tétel nem található.{" "}
          <a href="#batches">Vissza a listához</a>
        </p>
      ) : batch ? (
        <>
          <div className="detail-heading">
            <BackLink href="batches" label="Gyártási tételek" />
            {batch.status !== "closed" ? (
              <Button onClick={() => setEdit(batch)}>Tétel szerkesztése</Button>
            ) : null}
          </div>
          <Panel title="Gyártás adatai">
            <div className="detail-copy">
              <div className="production-steps">
                {batchStatusSchema.options.map((s, i) => (
                  <div
                    key={s}
                    className={
                      i <= batchStatusSchema.options.indexOf(batch.status)
                        ? "step reached"
                        : "step"
                    }
                  >
                    <span>{i + 1}</span>
                    {batchStatusLabels[s]}
                  </div>
                ))}
              </div>
              <dl className="detail-grid">
                <div>
                  <dt>Állapot</dt>
                  <dd>
                    <BatchStatusBadge status={batch.status} />
                  </dd>
                </div>
                <div>
                  <dt>Felelős</dt>
                  <dd>{batch.ownerName}</dd>
                </div>
                <div>
                  <dt>Kiszerelés</dt>
                  <dd>
                    <a
                      className="batch-link"
                      href={`#products/${batch.productId}`}
                    >
                      {batch.size} · {batch.sku}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Mennyiség</dt>
                  <dd>{number.format(batch.quantity)} db</dd>
                </div>
                <div>
                  <dt>Tervezett gyártás</dt>
                  <dd>
                    <DateLabel date={batch.plannedDate} />
                  </dd>
                </div>
                <div>
                  <dt>Kapcsolódó rendelés</dt>
                  <dd>
                    {batch.orderId ? (
                      <a
                        className="batch-link"
                        href={`#orders/${batch.orderId}`}
                      >
                        {batch.orderCode}
                      </a>
                    ) : (
                      "Saját készletre"
                    )}
                  </dd>
                </div>
              </dl>
              <h3 className="mb-2 text-sm font-medium">Gyártási megjegyzés</h3>
              <p className="whitespace-pre-wrap">
                {batch.notes || "Nincs megjegyzés."}
              </p>
              {batch.status === "closed" ? (
                <p className="mt-5 text-sm text-muted-foreground">
                  Ez a gyártási tétel lezárult, az adatai már nem
                  szerkeszthetők.
                </p>
              ) : null}
            </div>
          </Panel>
          <BatchTasks
            batchId={batch.id}
            tasks={tasks}
            users={users}
            batches={batches}
          />
        </>
      ) : (
        <Panel>
          <ListToolbar
            count={filtered.length}
            unit="tétel"
            action={
              <Button onClick={() => setEdit("new")}>
                <Plus data-icon="inline-start" />
                Új gyártás
              </Button>
            }
          >
            <Input
              aria-label="Tételek keresése"
              placeholder="Tétel, termék, rendelés vagy felelős…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Gyártási állapot"
              value={status}
              onChange={(e) =>
                go(
                  e.target.value
                    ? `batches?status=${e.target.value}`
                    : "batches",
                )
              }
            >
              <option value="">Minden állapot</option>
              {Object.entries(batchStatusLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              aria-label="Felelős szűrése"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            >
              <option value="">Minden felelős</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
          </ListToolbar>
          <DataTable
            headings={[
              "Tétel",
              "Termék",
              "Állapot",
              "Rendelés",
              "Felelős",
              { label: "Mennyiség", numeric: true },
              "Gyártás dátuma",
            ]}
            empty={!filtered.length}
          >
            {filtered.map((b) => (
              <InteractiveRow key={b.id}>
                <td>
                  <a
                    data-row-primary
                    className="batch-link"
                    href={`#batches/${b.id}`}
                  >
                    {b.batchCode}
                  </a>
                </td>
                <td>
                  {b.productName}
                  <span className="cell-secondary">
                    {b.size} · {b.sku}
                  </span>
                </td>
                <td>
                  <BatchStatusBadge status={b.status} />
                </td>
                <td>
                  {b.orderId ? (
                    <a className="batch-link" href={`#orders/${b.orderId}`}>
                      {b.orderCode}
                    </a>
                  ) : (
                    "Saját készletre"
                  )}
                </td>
                <td>{b.ownerName}</td>
                <td className="number">{number.format(b.quantity)} db</td>
                <td>
                  <DateLabel date={b.plannedDate} />
                </td>
              </InteractiveRow>
            ))}
          </DataTable>
        </Panel>
      )}
      {edit || createRoute ? (
        <BatchForm
          batch={edit && edit !== "new" ? edit : undefined}
          variants={variants}
          orders={orders}
          users={users}
          initialOrderId={newOrderId}
          close={close}
        />
      ) : null}
    </>
  );
}
