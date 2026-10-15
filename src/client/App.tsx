import { useEffect, useRef } from "react";
import {
  Factory,
  Package,
  Users,
  FlaskConical,
  ChevronRight,
  LayoutDashboard,
  ShoppingBag,
  Building2,
  ListChecks,
} from "lucide-react";
import { Button } from "@client/components/ui/button";
import {
  useBatches,
  useProducts,
  useVariants,
  useCustomers,
  useOrders,
  useUsers,
  useTasks,
} from "@client/hooks/use-data";
import { ProductsPage } from "@client/components/features/products";
import { OrdersPage } from "@client/components/features/orders";
import { BatchesPage } from "@client/components/features/batches";
import { OverviewPage } from "@client/components/features/overview";
import { TasksPage } from "@client/components/features/tasks";
import { taskTypeLabels } from "@shared/schemas/task";
import {
  Panel,
  DataTable,
  ListToolbar,
  useRoute,
} from "@client/components/features/common";
const navigation = [
  {
    id: "overview",
    label: "Áttekintő",
    icon: LayoutDashboard,
    description: "Rendelések, határidők és gyártás egy helyen.",
  },
  {
    id: "orders",
    label: "Vevői rendelések",
    icon: ShoppingBag,
    description: "A megrendeléstől a teljesítésig, követhető kapcsolatokkal.",
  },
  {
    id: "batches",
    label: "Gyártási tételek",
    icon: Factory,
    description: "Kövesd a gyártást a tervezéstől az elkészült termékig.",
  },
  {
    id: "tasks",
    label: "Feladatok",
    icon: ListChecks,
    description: "Teendők, felelősök és határidők egy helyen.",
  },
  {
    id: "products",
    label: "Termékek",
    icon: Package,
    description: "Termékek, kiszerelések és listaárak kezelése.",
  },
  {
    id: "customers",
    label: "Ügyfelek",
    icon: Building2,
    description: "Ügyfelek, kapcsolattartók és kapcsolódó rendelések.",
  },
  {
    id: "users",
    label: "Munkatársak",
    icon: Users,
    description: "A gyártásban és az operációban részt vevő csapat.",
  },
];
export function App() {
  const route = useRoute();
  const [path, searchParams] = route.split("?");
  const [page, detail, orderForBatch] = path.split("/");
  const statusFilter = new URLSearchParams(searchParams).get("status") ?? "";
  const taskView =
    new URLSearchParams(searchParams).get("view") === "board" ? "board" : "list";
  const active = navigation.find((n) => n.id === page) ?? navigation[0];
  const navRef = useRef<HTMLElement>(null);
  // On narrow screens the navigation scrolls sideways; keep the current page
  // visible without moving the document.
  useEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !link || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft =
      link.offsetLeft -
      nav.offsetLeft -
      (nav.clientWidth - link.offsetWidth) / 2;
  }, [active.id]);
  const batches = useBatches(),
    products = useProducts(),
    variants = useVariants(),
    customers = useCustomers(),
    orders = useOrders(),
    users = useUsers(),
    tasks = useTasks();
  const queries = [batches, products, variants, customers, orders, users, tasks];
  const failed = queries.find((q) => q.isError);
  const loading = queries.some((q) => q.isPending);
  const b = batches.data ?? [],
    p = products.data ?? [],
    v = variants.data ?? [],
    c = customers.data ?? [],
    o = orders.data ?? [],
    u = users.data ?? [],
    taskList = tasks.data ?? [];
  const detailId = detail && detail !== "new" ? Number(detail) : undefined;
  // A detail route is titled by its record; the module stays in the breadcrumb.
  const record =
    detailId === undefined
      ? undefined
      : active.id === "orders"
        ? o
            .filter((order) => order.id === detailId)
            .map((order) => ({
              title: order.orderCode,
              description: `${order.customerName} · ${order.productName}`,
            }))[0]
        : active.id === "batches"
          ? b
              .filter((batch) => batch.id === detailId)
              .map((batch) => ({
                title: batch.batchCode,
                description: `${batch.productName} · ${batch.size}`,
              }))[0]
          : active.id === "products"
            ? p
                .filter((product) => product.id === detailId)
                .map((product) => ({
                  title: product.name,
                  description: product.category,
                }))[0]
            : active.id === "tasks"
              ? taskList
                  .filter((task) => task.id === detailId)
                  .map((task) => ({
                    title: task.title,
                    description: `${taskTypeLabels[task.type]} · ${task.assigneeName}`,
                  }))[0]
              : undefined;
  const heading = record ?? {
    title: active.label,
    description: active.description,
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview">
          <span className="brand-mark">b.</span>
          <span>
            BILDR<span className="brand-sub">MŰHELY</span>
          </span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">
            <FlaskConical size={18} />
          </span>
          <div>
            <strong>Minta Manufaktúra</strong>
            <span>Gyártás és operáció</span>
          </div>
        </div>
        <p className="nav-label">MUNKATERÜLET</p>
        <nav aria-label="Fő navigáció" ref={navRef}>
          {navigation.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`nav-item ${active.id === item.id ? "active" : ""}`}
              aria-current={active.id === item.id ? "page" : undefined}
            >
              <item.icon size={19} />
              {item.label}
              {active.id === item.id ? (
                <ChevronRight size={15} className="ml-auto" />
              ) : null}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <span className="avatar">DE</span>
            <div>
              <strong>Demó Elek</strong>
              <span>Fejlesztői hozzáférés</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <nav aria-label="Elérési út">
            <span>Munkaterület</span>
            <ChevronRight size={14} aria-hidden="true" />
            {detailId !== undefined ? (
              <>
                <a href={`#${active.id}`}>{active.label}</a>
                <ChevronRight size={14} aria-hidden="true" />
                <strong aria-current="page">
                  {record?.title ?? "Részletek"}
                </strong>
              </>
            ) : (
              <strong aria-current="page">{active.label}</strong>
            )}
          </nav>
        </header>
        <main key={path} className="page-content">
          <div className="page-heading">
            <div>
              <h1>{heading.title}</h1>
              <p>{heading.description}</p>
            </div>
          </div>
          {failed ? (
            <div className="error" role="alert">
              <strong>Nem sikerült betölteni az adatokat.</strong>
              <p>{failed.error?.message}</p>
              <Button
                variant="outline"
                onClick={() => queries.forEach((q) => void q.refetch())}
              >
                Újrapróbálás
              </Button>
            </div>
          ) : loading ? (
            <div className="empty" role="status">
              Adatok betöltése…
            </div>
          ) : active.id === "overview" ? (
            <OverviewPage orders={o} batches={b} products={p} variants={v} />
          ) : active.id === "products" ? (
            <ProductsPage
              key={route}
              products={p}
              variants={v}
              detailId={detailId}
            />
          ) : active.id === "orders" ? (
            <OrdersPage
              key={route}
              orders={o}
              batches={b}
              customers={c}
              variants={v}
              detailId={detailId}
            />
          ) : active.id === "batches" ? (
            <BatchesPage
              key={path}
              statusFilter={statusFilter}
              batches={b}
              variants={v}
              orders={o}
              users={u}
              tasks={taskList}
              detailId={detailId}
              createRoute={detail === "new"}
              newOrderId={orderForBatch ? Number(orderForBatch) : undefined}
            />
          ) : active.id === "tasks" ? (
            <TasksPage
              tasks={taskList}
              users={u}
              batches={b}
              detailId={detailId}
              view={taskView}
            />
          ) : active.id === "customers" ? (
            <Panel>
              <ListToolbar count={c.length} unit="ügyfél" />
              <DataTable
                headings={[
                  "Ügyfél",
                  "Kapcsolattartó",
                  "E-mail",
                  "Város",
                  "Rendelések",
                ]}
              >
                {c.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <strong>{customer.name}</strong>
                    </td>
                    <td>{customer.contactName}</td>
                    <td>{customer.email}</td>
                    <td>{customer.city}</td>
                    <td>
                      {o
                        .filter((order) => order.customerId === customer.id)
                        .map((order) => (
                          <a
                            className="batch-link customer-order"
                            key={order.id}
                            href={`#orders/${order.id}`}
                          >
                            {order.orderCode}
                          </a>
                        ))}
                    </td>
                  </tr>
                ))}
              </DataTable>
            </Panel>
          ) : (
            <Panel>
              <ListToolbar count={u.length} unit="munkatárs" />
              <DataTable
                headings={[
                  "Név",
                  "Feladatkör",
                  "E-mail",
                  { label: "Aktív gyártások", numeric: true },
                ]}
              >
                {u.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className="owner">
                        <span className="mini-avatar" aria-hidden="true">
                          {user.displayName
                            .split(" ")
                            .map((part) => part[0])
                            .join("")}
                        </span>
                        <strong>{user.displayName}</strong>
                      </span>
                    </td>
                    <td>{user.role}</td>
                    <td>{user.email}</td>
                    <td className="number">
                      {
                        b.filter(
                          (batch) =>
                            batch.ownerId === user.id &&
                            batch.status !== "closed",
                        ).length
                      }
                    </td>
                  </tr>
                ))}
              </DataTable>
            </Panel>
          )}
        </main>
      </div>
    </div>
  );
}
