CREATE TABLE `ryze_files` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` integer NOT NULL,
	`taskId` text,
	`storageKey` text NOT NULL,
	`url` text NOT NULL,
	`originalName` text NOT NULL,
	`mimeType` text NOT NULL,
	`byteSize` integer NOT NULL,
	`category` text NOT NULL,
	`source` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`taskId`) REFERENCES `ryze_tasks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `ryze_memory` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` integer NOT NULL,
	`scope` text NOT NULL,
	`kind` text NOT NULL,
	`content` text NOT NULL,
	`tags` text NOT NULL,
	`outcome` text DEFAULT 'NEUTRAL' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ryze_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` integer NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ryze_sessions_user_name_uq` ON `ryze_sessions` (`userId`,`name`);--> statement-breakpoint
CREATE TABLE `ryze_settings` (
	`userId` integer PRIMARY KEY NOT NULL,
	`demoMode` integer DEFAULT true NOT NULL,
	`provider` text DEFAULT 'local-demo' NOT NULL,
	`ryzeModel` text DEFAULT 'ryze-safe-demo' NOT NULL,
	`nerdModel` text DEFAULT 'nerd-safe-demo' NOT NULL,
	`externalLlmEnabled` integer DEFAULT false NOT NULL,
	`emailEnabled` integer DEFAULT false NOT NULL,
	`telegramEnabled` integer DEFAULT false NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ryze_skills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`domain` text NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`successCount` integer DEFAULT 0 NOT NULL,
	`failCount` integer DEFAULT 0 NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ryze_skills_user_domain_uq` ON `ryze_skills` (`userId`,`domain`);--> statement-breakpoint
CREATE TABLE `ryze_task_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`taskId` text NOT NULL,
	`sequence` integer NOT NULL,
	`actor` text NOT NULL,
	`level` text DEFAULT 'info' NOT NULL,
	`message` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`taskId`) REFERENCES `ryze_tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ryze_task_logs_task_sequence_uq` ON `ryze_task_logs` (`taskId`,`sequence`);--> statement-breakpoint
CREATE TABLE `ryze_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` integer NOT NULL,
	`sessionId` text NOT NULL,
	`prompt` text NOT NULL,
	`action` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`summary` text,
	`retryCount` integer DEFAULT 0 NOT NULL,
	`completedSteps` integer DEFAULT 0 NOT NULL,
	`totalSteps` integer DEFAULT 1 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`completedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sessionId`) REFERENCES `ryze_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ryze_worker_commands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workerId` text NOT NULL,
	`userId` integer NOT NULL,
	`command` text NOT NULL,
	`payload` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`workerId`) REFERENCES `ryze_workers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ryze_worker_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workerId` text NOT NULL,
	`userId` integer NOT NULL,
	`level` text DEFAULT 'info' NOT NULL,
	`eventType` text NOT NULL,
	`message` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`workerId`) REFERENCES `ryze_workers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ryze_workers` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` integer NOT NULL,
	`hostname` text NOT NULL,
	`version` text NOT NULL,
	`status` text DEFAULT 'offline' NOT NULL,
	`automationPaused` integer DEFAULT false NOT NULL,
	`lastHeartbeatAt` integer,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`lastSignedIn` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);