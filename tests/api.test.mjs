import { test } from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL;
if (!base) throw new Error("Run npm test for an isolated test database.");
async function req(path, method = "GET", data, status = 200, headers = {}) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const body = await response.json();
  assert.equal(response.status, status, JSON.stringify(body));
  return body;
}
test("A seed kapcsolatai és mennyiségei összefüggőek", async () => {
  const [batches, products, variants, orders, customers, users] =
    await Promise.all(
      ["batches", "products", "variants", "orders", "customers", "users"].map(
        (p) => req("/" + p),
      ),
    );
  assert.equal(batches.length, 16);
  assert.equal(products.length, 8);
  assert.equal(variants.length, 16);
  assert.equal(orders.length, 12);
  assert.equal(customers.length, 5);
  assert.equal(users.length, 6);
  for (const b of batches) {
    assert.ok(variants.some((v) => v.id === b.variantId));
    assert.ok(users.some((u) => u.id === b.ownerId));
    if (b.orderId)
      assert.equal(
        orders.find((o) => o.id === b.orderId).variantId,
        b.variantId,
      );
  }
  for (const o of orders.filter((o) => o.status === "fulfilled"))
    assert.ok(
      batches
        .filter((b) => b.orderId === o.id && b.status === "closed")
        .reduce((sum, b) => sum + b.quantity, 0) >= o.quantity,
    );
  assert.ok(users.every((u) => u.email.endsWith("@example.test")));
  assert.equal((await req("/users/me")).id, 1);
});
test("Termék és kiszerelés létrehozása, szerkesztése, egyedi cikkszám", async () => {
  const product = await req(
    "/products",
    "POST",
    { name: "Új teszttermék", category: "Demó", description: "Teszt" },
    201,
  );
  await req(`/products/${product.id}`, "PUT", {
    name: "Módosított teszttermék",
    category: "Demó",
    description: "Mentett leírás",
  });
  const variant = await req(
    "/variants",
    "POST",
    {
      productId: product.id,
      sku: "TEST-UNIQUE",
      size: "150 ml",
      unitPriceHuf: 3500,
    },
    201,
  );
  await req(`/variants/${variant.id}`, "PUT", {
    productId: product.id,
    sku: "TEST-UNIQUE",
    size: "200 ml",
    unitPriceHuf: 4200,
  });
  assert.equal(
    (await req("/variants")).find((v) => v.id === variant.id).size,
    "200 ml",
  );
  await req(
    "/variants",
    "POST",
    {
      productId: product.id,
      sku: "TEST-UNIQUE",
      size: "50 ml",
      unitPriceHuf: 100,
    },
    409,
  );
  await req(
    "/products",
    "POST",
    { name: "   ", category: "Demó", description: "" },
    400,
  );
  await req(
    "/variants",
    "POST",
    { productId: 999999, sku: "BAD", size: "50 ml", unitPriceHuf: 0 },
    400,
  );
});
test("Rendelés és gyártás teljes folyamata, üzleti szabályokkal", async () => {
  const order = await req(
    "/orders",
    "POST",
    {
      customerId: 1,
      variantId: 1,
      quantity: 10,
      dueDate: "2026-12-01",
      notes: "Teljes folyamat",
    },
    201,
  );
  const input = {
    variantId: 1,
    orderId: order.id,
    ownerId: 2,
    quantity: 10,
    plannedDate: "2026-11-20",
    notes: "Tesztgyártás",
  };
  await req("/batches", "POST", input, 400);
  await req(`/orders/${order.id}/status`, "PATCH", { status: "confirmed" });
  await req("/batches", "POST", { ...input, variantId: 2 }, 400);
  await req("/batches", "POST", { ...input, ownerId: 99999 }, 400);
  const batch = await req("/batches", "POST", input, 201);
  await req(
    `/orders/${order.id}/status`,
    "PATCH",
    { status: "fulfilled" },
    409,
  );
  await req(
    `/orders/${order.id}/status`,
    "PATCH",
    { status: "cancelled" },
    409,
  );
  await req(`/batches/${batch.id}`, "PUT", { ...input, status: "closed" }, 409);
  await req(`/batches/${batch.id}`, "PUT", { ...input, status: "mixing" });
  await req(
    `/batches/${batch.id}`,
    "PUT",
    { ...input, quantity: 20, status: "mixing" },
    409,
  );
  for (const status of ["qc", "filling", "boxing", "closed"])
    await req(`/batches/${batch.id}`, "PUT", { ...input, status });
  await req(`/batches/${batch.id}`, "PUT", { ...input, status: "boxing" }, 409);
  await req(
    `/batches/${batch.id}/notes`,
    "PATCH",
    { notes: "Nem engedélyezett" },
    409,
  );
  await req(`/orders/${order.id}/status`, "PATCH", { status: "fulfilled" });
  await req(
    `/orders/${order.id}/status`,
    "PATCH",
    { status: "confirmed" },
    409,
  );
  assert.equal(
    (await req("/batches")).find((b) => b.id === batch.id).notes,
    input.notes,
  );
});
test("Hibás dátum, mennyiség, idegen kulcs és ismeretlen rekord elutasítása", async () => {
  const order = {
    customerId: 1,
    variantId: 1,
    quantity: 10,
    dueDate: "2026-12-01",
    notes: "",
  };
  await req("/orders", "POST", { ...order, dueDate: "2026-02-30" }, 400);
  await req("/orders", "POST", { ...order, quantity: 0 }, 400);
  await req("/orders", "POST", { ...order, customerId: 99999 }, 400);
  await req("/orders/999999/status", "PATCH", { status: "confirmed" }, 404);
  await req("/batches/abc/notes", "PATCH", { notes: "" }, 400);
  await req("/batches/999999/notes", "PATCH", { notes: "" }, 404);
  await req(
    "/products",
    "POST",
    { name: "Próba", category: "Demó", description: "" },
    403,
    { Origin: "https://example.test" },
  );
  await req("/does-not-exist", "GET", undefined, 404);
});
test("Feladat felvétele, kapcsolati szabály és verzióütközés", async () => {
  const general = {
    title: "Műszak egyeztetés",
    description: "Következő hét",
    type: "general",
    priority: "normal",
    assigneeId: 6,
    batchId: null,
    dueDate: "2026-12-01",
  };
  const created = await req("/tasks", "POST", general, 201);
  assert.equal(created.status, "open");
  assert.equal(created.version, 1);
  assert.equal(created.batchId, null);
  assert.equal(created.assigneeName, "Demó Nóra");
  await req("/tasks", "POST", { ...general, type: "production", batchId: null }, 400);
  await req("/tasks", "POST", { ...general, type: "general", batchId: 1 }, 400);
  await req("/tasks", "POST", { ...general, assigneeId: 99999 }, 400);
  await req(
    "/tasks",
    "POST",
    { ...general, type: "production", batchId: 99999 },
    400,
  );
  const production = await req(
    "/tasks",
    "POST",
    { ...general, title: "Minta a tételhez", type: "production", batchId: 1 },
    201,
  );
  assert.equal(production.batchCode, "DEMO-001");
  const update = {
    title: created.title,
    description: "Frissítve",
    type: "general",
    priority: "urgent",
    assigneeId: 6,
    batchId: null,
    dueDate: "2026-12-01",
    status: "in_progress",
    version: 1,
  };
  const saved = await req(`/tasks/${created.id}`, "PATCH", update);
  assert.equal(saved.version, 2);
  assert.equal(saved.status, "in_progress");
  assert.equal(saved.description, "Frissítve");
  const stale = await req(
    `/tasks/${created.id}`,
    "PATCH",
    { ...update, status: "done", description: "Elavult" },
    409,
  );
  assert.match(stale.error, /módosította/);
  const current = (await req("/tasks")).find((task) => task.id === created.id);
  assert.equal(current.status, "in_progress");
  assert.equal(current.version, 2);
  assert.equal(current.description, "Frissítve");
  const raced = {
    ...update,
    version: 2,
  };
  const [first, second] = await Promise.all([
    fetch(`${base}/api/tasks/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...raced, status: "blocked", description: "Egyik" }),
    }),
    fetch(`${base}/api/tasks/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...raced, status: "done", description: "Másik" }),
    }),
  ]);
  const statuses = [first.status, second.status].sort();
  assert.deepEqual(statuses, [200, 409]);
  const winner = (await req("/tasks")).find((task) => task.id === created.id);
  assert.equal(winner.version, 3);
  assert.ok(winner.status === "blocked" || winner.status === "done");
  assert.notEqual(winner.description, "Elavult");
  await req(`/tasks/999999`, "PATCH", update, 404);
});
