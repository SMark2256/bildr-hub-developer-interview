import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Textarea } from "@client/components/ui/textarea";
import { Modal } from "@client/components/ui/modal";
import { Field, FieldGroup, FieldLabel } from "@client/components/ui/field";
import { SelectField } from "@client/components/ui/select";
import { ViewTabs } from "@client/components/ui/tabs";
import { useNotify } from "@client/components/ui/toast";
import {
  useCreateTask,
  useUpdateTask,
  type Batch,
  type Task,
  type User,
} from "@client/hooks/use-data";
import {
  isTaskLate,
  taskConflictMessage,
  taskPriorityLabels,
  taskPrioritySchema,
  taskStatusLabels,
  taskStatusSchema,
  taskTypeLabels,
  taskTypeSchema,
  type TaskInput,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
  type TaskUpdate,
} from "@shared/schemas/task";
import { todayInBudapest } from "@shared/schemas/operations";
import {
  Panel,
  DataTable,
  ListToolbar,
  BackLink,
  InteractiveRow,
  FormFooter,
  TaskStatusBadge,
  DateLabel,
  go,
} from "./common";

function taskUpdateBody(task: Task, status: TaskStatus = task.status): TaskUpdate {
  return {
    title: task.title,
    description: task.description,
    type: task.type,
    priority: task.priority,
    assigneeId: task.assigneeId,
    batchId: task.batchId,
    dueDate: task.dueDate,
    status,
    version: task.version,
  };
}

function useTaskSave() {
  const update = useUpdateTask();
  const notify = useNotify();
  const mutate: typeof update.mutate = (variables, options) =>
    update.mutate(variables, {
      ...options,
      onError: (error, vars, onMutateResult, context) => {
        if (error.message === taskConflictMessage) notify(taskConflictMessage);
        options?.onError?.(error, vars, onMutateResult, context);
      },
    });
  return { ...update, mutate };
}

type Draft = {
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  assigneeId: string;
  batchId: string;
  dueDate: string;
  status: TaskStatus;
};

function draftFrom(task: Task | undefined, lockedBatchId?: number): Draft {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    type: lockedBatchId ? "production" : (task?.type ?? "general"),
    priority: task?.priority ?? "normal",
    assigneeId: task ? String(task.assigneeId) : "",
    batchId: lockedBatchId
      ? String(lockedBatchId)
      : task?.batchId
        ? String(task.batchId)
        : "",
    dueDate: task?.dueDate ?? todayInBudapest(),
    status: task?.status ?? "open",
  };
}

export function TaskForm({
  task,
  users,
  batches,
  lockedBatchId,
  close,
}: {
  task?: Task;
  users: User[];
  batches: Batch[];
  lockedBatchId?: number;
  close: () => void;
}) {
  const create = useCreateTask();
  const save = useTaskSave();
  const [draft, setDraft] = useState(() => draftFrom(task, lockedBatchId));
  const [clientError, setClientError] = useState<string | null>(null);
  const locked = lockedBatchId !== undefined;
  const pending = (task ? save : create).isPending;
  const serverError = (task ? save.error : create.error) ?? null;
  const error = clientError ? new Error(clientError) : serverError;
  const conflict = serverError?.message === taskConflictMessage;
  useEffect(() => {
    if (task && conflict) setDraft(draftFrom(task, lockedBatchId));
  }, [task, lockedBatchId, conflict]);
  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setClientError(null);
    setDraft((current) => ({ ...current, [key]: value }));
  }
  return (
    <Modal
      open
      title={task ? "Feladat szerkesztése" : "Új feladat"}
      description={
        locked
          ? "A feladat ehhez a gyártási tételhez kapcsolódik."
          : task
            ? "A felelős, a határidő és az állapot is módosítható."
            : "Rögzítsd a teendőt, a felelőst és a határidőt."
      }
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <form
        className="mt-6"
        onSubmit={(event) => {
          event.preventDefault();
          const assigneeId = Number(draft.assigneeId);
          const batchId =
            draft.type === "production" ? Number(draft.batchId) : null;
          if (!draft.title.trim()) {
            setClientError("A cím megadása kötelező.");
            return;
          }
          if (!assigneeId) {
            setClientError("Válassz felelőst.");
            return;
          }
          if (draft.type === "production" && !batchId) {
            setClientError("Válassz gyártási tételt.");
            return;
          }
          const input: TaskInput = {
            title: draft.title.trim(),
            description: draft.description.trim(),
            type: draft.type,
            priority: draft.priority,
            assigneeId,
            batchId,
            dueDate: draft.dueDate,
          };
          if (task)
            save.mutate(
              { ...input, id: task.id, status: draft.status, version: task.version },
              { onSuccess: close },
            );
          else create.mutate(input, { onSuccess: close });
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="task-title">Cím</FieldLabel>
            <Input
              id="task-title"
              required
              maxLength={120}
              value={draft.title}
              onChange={(event) => change("title", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="task-description">Leírás</FieldLabel>
            <Textarea
              id="task-description"
              maxLength={2000}
              value={draft.description}
              onChange={(event) => change("description", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="task-type">Típus</FieldLabel>
            <SelectField
              id="task-type"
              ariaLabel="Típus"
              disabled={locked}
              value={draft.type}
              onValueChange={(value) => {
                const type = taskTypeSchema.parse(value);
                setClientError(null);
                setDraft((current) => ({
                  ...current,
                  type,
                  batchId: type === "general" ? "" : current.batchId,
                }));
              }}
              options={taskTypeSchema.options.map((type) => ({
                value: type,
                label: taskTypeLabels[type],
              }))}
            />
          </Field>
          {draft.type === "production" ? (
            <Field>
              <FieldLabel htmlFor="task-batch">Gyártási tétel</FieldLabel>
              <SelectField
                id="task-batch"
                ariaLabel="Gyártási tétel"
                disabled={locked}
                placeholder="Válassz gyártási tételt"
                value={draft.batchId}
                onValueChange={(value) => change("batchId", value)}
                options={batches.map((batch) => ({
                  value: String(batch.id),
                  label: `${batch.batchCode} · ${batch.productName}`,
                }))}
              />
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor="task-assignee">Felelős</FieldLabel>
            <SelectField
              id="task-assignee"
              ariaLabel="Felelős"
              placeholder="Válassz felelőst"
              value={draft.assigneeId}
              onValueChange={(value) => change("assigneeId", value)}
              options={users.map((user) => ({
                value: String(user.id),
                label: user.displayName,
              }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="task-priority">Sürgősség</FieldLabel>
            <SelectField
              id="task-priority"
              ariaLabel="Sürgősség"
              value={draft.priority}
              onValueChange={(value) =>
                change("priority", taskPrioritySchema.parse(value))
              }
              options={taskPrioritySchema.options.map((priority) => ({
                value: priority,
                label: taskPriorityLabels[priority],
              }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="task-date">Határidő</FieldLabel>
            <Input
              id="task-date"
              type="date"
              required
              value={draft.dueDate}
              onChange={(event) => change("dueDate", event.target.value)}
            />
          </Field>
          {task ? (
            <Field>
              <FieldLabel htmlFor="task-status">Állapot</FieldLabel>
              <SelectField
                id="task-status"
                ariaLabel="Állapot"
                value={draft.status}
                onValueChange={(value) =>
                  change("status", taskStatusSchema.parse(value))
                }
                options={taskStatusSchema.options.map((status) => ({
                  value: status,
                  label: taskStatusLabels[status],
                }))}
              />
            </Field>
          ) : null}
        </FieldGroup>
        <FormFooter
          error={error}
          pending={pending}
          close={close}
          label={task ? "Változások mentése" : "Feladat létrehozása"}
        />
      </form>
    </Modal>
  );
}

function TaskCard({
  task,
  pending,
  onStatus,
}: {
  task: Task;
  pending: boolean;
  onStatus: (status: TaskStatus) => void;
}) {
  const [choice, setChoice] = useState(task.status);
  useEffect(() => {
    if (!pending) setChoice(task.status);
  }, [pending, task.status, task.version]);
  const late = isTaskLate(task.dueDate, task.status, todayInBudapest());
  return (
    <article className="task-card">
      <a className="batch-link" href={`#tasks/${task.id}`}>
        {task.title}
      </a>
      <p className="task-card-meta">{task.assigneeName}</p>
      <DateLabel date={task.dueDate} late={late} />
      {task.priority === "urgent" ? (
        <span className="task-urgent">Sürgős</span>
      ) : null}
      {task.batchId ? (
        <a className="batch-link" href={`#batches/${task.batchId}`}>
          {task.batchCode}
        </a>
      ) : (
        <span className="task-card-meta">Szervezés</span>
      )}
      <SelectField
        ariaLabel={`${task.title} állapota`}
        value={choice}
        disabled={pending}
        onValueChange={(value) => {
          const status = taskStatusSchema.parse(value);
          setChoice(status);
          onStatus(status);
        }}
        options={taskStatusSchema.options.map((status) => ({
          value: status,
          label: taskStatusLabels[status],
        }))}
      />
    </article>
  );
}

function TaskBoard({
  tasks,
  movingId,
  onStatus,
}: {
  tasks: Task[];
  movingId: number | null;
  onStatus: (task: Task, status: TaskStatus) => void;
}) {
  return (
    <div className="task-board">
      {taskStatusSchema.options.map((status) => {
        const column = tasks.filter((task) => task.status === status);
        return (
          <section
            key={status}
            className="task-column"
            aria-labelledby={`task-column-${status}`}
          >
            <h3 id={`task-column-${status}`}>
              {taskStatusLabels[status]}
              <span>{column.length}</span>
            </h3>
            {column.length === 0 ? (
              <p className="task-column-empty">Nincs ide sorolt feladat.</p>
            ) : (
              column.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  pending={movingId === task.id}
                  onStatus={(next) => onStatus(task, next)}
                />
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}

export function BatchTasks({
  batchId,
  tasks,
  users,
  batches,
}: {
  batchId: number;
  tasks: Task[];
  users: User[];
  batches: Batch[];
}) {
  const [open, setOpen] = useState(false);
  const related = tasks.filter((task) => task.batchId === batchId);
  return (
    <Panel
      title="Kapcsolódó feladatok"
      count={related.length}
      action={
        <Button onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" />
          Új feladat
        </Button>
      }
    >
      <DataTable
        headings={["Feladat", "Állapot", "Felelős", "Határidő"]}
        empty={!related.length}
        emptyMessage="Ehhez a gyártási tételhez még nincs feladat."
      >
        {related.map((task) => (
          <InteractiveRow key={task.id}>
            <td>
              <a
                data-row-primary
                className="batch-link"
                href={`#tasks/${task.id}`}
              >
                {task.title}
              </a>
            </td>
            <td>
              <TaskStatusBadge status={task.status} />
            </td>
            <td>{task.assigneeName}</td>
            <td>
              <DateLabel
                date={task.dueDate}
                late={isTaskLate(task.dueDate, task.status, todayInBudapest())}
              />
            </td>
          </InteractiveRow>
        ))}
      </DataTable>
      {open ? (
        <TaskForm
          users={users}
          batches={batches}
          lockedBatchId={batchId}
          close={() => setOpen(false)}
        />
      ) : null}
    </Panel>
  );
}

export function TasksPage({
  tasks,
  users,
  batches,
  detailId,
  view,
}: {
  tasks: Task[];
  users: User[];
  batches: Batch[];
  detailId?: number;
  view: "list" | "board";
}) {
  const save = useTaskSave();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState("");
  const [editId, setEditId] = useState<number | "new" | null>(null);
  const [movingId, setMovingId] = useState<number | null>(null);
  const task = tasks.find((item) => item.id === detailId);
  const editing = editId === "new" ? undefined : tasks.find((item) => item.id === editId);
  const filtered = tasks.filter((item) => {
    const haystack = `${item.title} ${item.assigneeName} ${item.batchCode ?? ""}`
      .toLocaleLowerCase("hu")
      .includes(search.toLocaleLowerCase("hu"));
    return (
      haystack &&
      (!status || item.status === status) &&
      (!type || item.type === type) &&
      (!assignee || item.assigneeId === Number(assignee)) &&
      (!priority || item.priority === priority)
    );
  });
  const filtersActive = Boolean(search || status || type || assignee || priority);
  function move(item: Task, next: TaskStatus) {
    if (next === item.status || movingId === item.id) return;
    setMovingId(item.id);
    save.mutate(
      { id: item.id, ...taskUpdateBody(item, next) },
      { onSettled: () => setMovingId(null) },
    );
  }
  return (
    <>
      {detailId && !task ? (
        <p className="empty">
          Ez a feladat nem található. <a href="#tasks">Vissza a listához</a>
        </p>
      ) : task ? (
        <>
          <div className="detail-heading">
            <BackLink href="tasks" label="Feladatok" />
            <Button onClick={() => setEditId(task.id)}>Feladat szerkesztése</Button>
          </div>
          <Panel title="Feladat adatai">
            <div className="detail-copy">
              <dl className="detail-grid">
                <div>
                  <dt>Állapot</dt>
                  <dd>
                    <TaskStatusBadge status={task.status} />
                  </dd>
                </div>
                <div>
                  <dt>Típus</dt>
                  <dd>{taskTypeLabels[task.type]}</dd>
                </div>
                <div>
                  <dt>Sürgősség</dt>
                  <dd>
                    {task.priority === "urgent" ? (
                      <span className="task-urgent">Sürgős</span>
                    ) : (
                      taskPriorityLabels[task.priority]
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Felelős</dt>
                  <dd>{task.assigneeName}</dd>
                </div>
                <div>
                  <dt>Határidő</dt>
                  <dd>
                    <DateLabel
                      date={task.dueDate}
                      late={isTaskLate(
                        task.dueDate,
                        task.status,
                        todayInBudapest(),
                      )}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Gyártási tétel</dt>
                  <dd>
                    {task.batchId ? (
                      <a className="batch-link" href={`#batches/${task.batchId}`}>
                        {task.batchCode}
                      </a>
                    ) : (
                      "Szervezési feladat"
                    )}
                  </dd>
                </div>
              </dl>
              <h3 className="mb-2 text-sm font-medium">Leírás</h3>
              <p className="whitespace-pre-wrap">
                {task.description || "Nincs leírás."}
              </p>
            </div>
          </Panel>
        </>
      ) : (
        <Panel>
          <div className="task-view-bar">
            <ViewTabs
              value={view}
              onValueChange={(next) =>
                go(next === "board" ? "tasks?view=board" : "tasks")
              }
            />
          </div>
          <ListToolbar
            count={filtered.length}
            unit="feladat"
            action={
              <Button onClick={() => setEditId("new")}>
                <Plus data-icon="inline-start" />
                Új feladat
              </Button>
            }
          >
            <Input
              aria-label="Feladatok keresése"
              placeholder="Cím, felelős vagy tétel…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              aria-label="Állapot szűrése"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">Minden állapot</option>
              {taskStatusSchema.options.map((item) => (
                <option key={item} value={item}>
                  {taskStatusLabels[item]}
                </option>
              ))}
            </select>
            <select
              aria-label="Típus szűrése"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="">Minden típus</option>
              {taskTypeSchema.options.map((item) => (
                <option key={item} value={item}>
                  {taskTypeLabels[item]}
                </option>
              ))}
            </select>
            <select
              aria-label="Felelős szűrése"
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
            >
              <option value="">Minden felelős</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                </option>
              ))}
            </select>
            <select
              aria-label="Sürgősség szűrése"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              <option value="">Minden sürgősség</option>
              {taskPrioritySchema.options.map((item) => (
                <option key={item} value={item}>
                  {taskPriorityLabels[item]}
                </option>
              ))}
            </select>
          </ListToolbar>
          {view === "board" ? (
            <TaskBoard tasks={filtered} movingId={movingId} onStatus={move} />
          ) : (
            <DataTable
              headings={[
                "Feladat",
                "Állapot",
                "Típus",
                "Felelős",
                "Tétel",
                "Határidő",
              ]}
              empty={!filtered.length}
              emptyMessage={
                tasks.length === 0 && !filtersActive
                  ? "Még nincs felvett feladat. Az első teendőt az Új feladat gombbal rögzítheted."
                  : "Nincs a szűrésnek megfelelő feladat."
              }
            >
              {filtered.map((item) => (
                <InteractiveRow key={item.id}>
                  <td>
                    <a
                      data-row-primary
                      className="batch-link"
                      href={`#tasks/${item.id}`}
                    >
                      {item.title}
                    </a>
                    {item.priority === "urgent" ? (
                      <span className="task-urgent">Sürgős</span>
                    ) : null}
                  </td>
                  <td>
                    <TaskStatusBadge status={item.status} />
                  </td>
                  <td>{taskTypeLabels[item.type]}</td>
                  <td>{item.assigneeName}</td>
                  <td>
                    {item.batchId ? (
                      <a className="batch-link" href={`#batches/${item.batchId}`}>
                        {item.batchCode}
                      </a>
                    ) : (
                      "Szervezés"
                    )}
                  </td>
                  <td>
                    <DateLabel
                      date={item.dueDate}
                      late={isTaskLate(
                        item.dueDate,
                        item.status,
                        todayInBudapest(),
                      )}
                    />
                  </td>
                </InteractiveRow>
              ))}
            </DataTable>
          )}
        </Panel>
      )}
      {editId === "new" || editing ? (
        <TaskForm
          task={editing}
          users={users}
          batches={batches}
          close={() => setEditId(null)}
        />
      ) : null}
    </>
  );
}
