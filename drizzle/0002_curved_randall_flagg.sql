CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`assignee_id` integer NOT NULL,
	`batch_id` integer,
	`due_date` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "tasks_type_batch_ck" CHECK(("tasks"."type" = 'general' AND "tasks"."batch_id" IS NULL) OR ("tasks"."type" = 'production' AND "tasks"."batch_id" IS NOT NULL))
);
