import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { api, readJson } from "@client/lib/api";
import type {
  ProductInput,
  VariantInput,
  OrderInput,
  OrderStatus,
  BatchInput,
  BatchUpdate,
} from "@shared/schemas/operations";
import type { TaskInput, TaskUpdate } from "@shared/schemas/task";
import { taskConflictMessage } from "@shared/schemas/task";
export type Batch = InferResponseType<typeof api.api.batches.$get>[number];
export type Product = InferResponseType<typeof api.api.products.$get>[number];
export type Variant = InferResponseType<typeof api.api.variants.$get>[number];
export type Customer = InferResponseType<typeof api.api.customers.$get>[number];
export type Order = InferResponseType<typeof api.api.orders.$get>[number];
export type User = InferResponseType<typeof api.api.users.$get>[number];
export type Task = InferResponseType<typeof api.api.tasks.$get>[number];
export function useBatches() {
  return useQuery({
    queryKey: ["operations", "batches"],
    queryFn: async () => readJson<Batch[]>(await api.api.batches.$get()),
  });
}
export function useProducts() {
  return useQuery({
    queryKey: ["operations", "products"],
    queryFn: async () => readJson<Product[]>(await api.api.products.$get()),
  });
}
export function useVariants() {
  return useQuery({
    queryKey: ["operations", "variants"],
    queryFn: async () => readJson<Variant[]>(await api.api.variants.$get()),
  });
}
export function useCustomers() {
  return useQuery({
    queryKey: ["operations", "customers"],
    queryFn: async () => readJson<Customer[]>(await api.api.customers.$get()),
  });
}
export function useOrders() {
  return useQuery({
    queryKey: ["operations", "orders"],
    queryFn: async () => readJson<Order[]>(await api.api.orders.$get()),
  });
}
export function useUsers() {
  return useQuery({
    queryKey: ["operations", "users"],
    queryFn: async () => readJson<User[]>(await api.api.users.$get()),
  });
}
export function useTasks() {
  return useQuery({
    queryKey: ["operations", "tasks"],
    queryFn: async () => readJson<Task[]>(await api.api.tasks.$get()),
  });
}
function useWrite<T>(write: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: () => client.invalidateQueries({ queryKey: ["operations"] }),
  });
}
export function useSaveProduct() {
  return useWrite(async ({ id, ...json }: ProductInput & { id?: number }) =>
    readJson(
      id
        ? await api.api.products[":id"].$put({
            param: { id: String(id) },
            json,
          })
        : await api.api.products.$post({ json }),
    ),
  );
}
export function useSaveVariant() {
  return useWrite(async ({ id, ...json }: VariantInput & { id?: number }) =>
    readJson(
      id
        ? await api.api.variants[":id"].$put({
            param: { id: String(id) },
            json,
          })
        : await api.api.variants.$post({ json }),
    ),
  );
}
export function useCreateOrder() {
  return useWrite(async (json: OrderInput) =>
    readJson(await api.api.orders.$post({ json })),
  );
}
export function useOrderStatus() {
  return useWrite(async ({ id, status }: { id: number; status: OrderStatus }) =>
    readJson(
      await api.api.orders[":id"].status.$patch({
        param: { id: String(id) },
        json: { status },
      }),
    ),
  );
}
export function useCreateBatch() {
  return useWrite(async (json: BatchInput) =>
    readJson(await api.api.batches.$post({ json })),
  );
}
export function useUpdateBatch() {
  return useWrite(async ({ id, ...json }: BatchUpdate & { id: number }) =>
    readJson(
      await api.api.batches[":id"].$put({ param: { id: String(id) }, json }),
    ),
  );
}
export function useCreateTask() {
  return useWrite(async (json: TaskInput) =>
    readJson(await api.api.tasks.$post({ json })),
  );
}
export function useUpdateTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...json }: TaskUpdate & { id: number }) =>
      readJson(
        await api.api.tasks[":id"].$patch({
          param: { id: String(id) },
          json,
        }),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ["operations"] }),
    onError: (error) => {
      if (error instanceof Error && error.message === taskConflictMessage)
        void client.invalidateQueries({ queryKey: ["operations"] });
    },
  });
}
