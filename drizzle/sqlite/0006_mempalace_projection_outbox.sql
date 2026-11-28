CREATE TABLE `ryze_memory_projection_outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`memoryId` text NOT NULL,
	`operation` text NOT NULL,
	`projectionKey` text NOT NULL,
	`payload` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lastError` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`appliedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ryze_memory_projection_outbox_key_uq` ON `ryze_memory_projection_outbox` (`userId`,`projectionKey`);
--> statement-breakpoint
CREATE INDEX `ryze_memory_projection_outbox_pending_idx` ON `ryze_memory_projection_outbox` (`status`,`updatedAt`,`id`);
