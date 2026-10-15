import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, check } from "drizzle-orm/sqlite-core";
import type { BatchStatus } from "@shared/schemas/batch";
import type { OrderStatus } from "@shared/schemas/operations";
import type {
  TaskPriority,
  TaskStatus,
  TaskType,
} from "@shared/schemas/task";
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(),
});
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
});
export const variants = sqliteTable("variants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  sku: text("sku").notNull().unique(),
  size: text("size").notNull(),
  unitPriceHuf: integer("unit_price_huf").notNull().default(0),
});
export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  city: text("city").notNull(),
});
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderCode: text("order_code").notNull().unique(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  variantId: integer("variant_id")
    .notNull()
    .references(() => variants.id),
  quantity: integer("quantity").notNull(),
  dueDate: text("due_date").notNull(),
  status: text("status").$type<OrderStatus>().notNull().default("draft"),
  notes: text("notes").notNull().default(""),
});
export const batches = sqliteTable("batches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  batchCode: text("batch_code")
    .notNull()
    .unique("batches_batch_code_unique_v2"),
  variantId: integer("variant_id")
    .notNull()
    .references(() => variants.id),
  orderId: integer("order_id").references(() => orders.id),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),
  status: text("status").$type<BatchStatus>().notNull(),
  quantity: integer("quantity").notNull(),
  plannedDate: text("planned_date").notNull(),
  notes: text("notes").notNull().default(""),
});
export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    type: text("type").$type<TaskType>().notNull(),
    status: text("status").$type<TaskStatus>().notNull().default("open"),
    priority: text("priority").$type<TaskPriority>().notNull().default("normal"),
    assigneeId: integer("assignee_id")
      .notNull()
      .references(() => users.id),
    batchId: integer("batch_id").references(() => batches.id),
    dueDate: text("due_date").notNull(),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    check(
      "tasks_type_batch_ck",
      sql`(${table.type} = 'general' AND ${table.batchId} IS NULL) OR (${table.type} = 'production' AND ${table.batchId} IS NOT NULL)`,
    ),
  ],
);
