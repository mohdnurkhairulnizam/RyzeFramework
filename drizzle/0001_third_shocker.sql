CREATE TABLE `ryze_files` (
	`id` varchar(40) NOT NULL,
	`userId` int NOT NULL,
	`taskId` varchar(40),
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`byteSize` int NOT NULL,
	`category` varchar(48) NOT NULL,
	`source` enum('upload','generated') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ryze_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ryze_memory` (
	`id` varchar(40) NOT NULL,
	`userId` int NOT NULL,
	`scope` enum('core','evolving') NOT NULL,
	`kind` varchar(64) NOT NULL,
	`content` text NOT NULL,
	`tags` text NOT NULL,
	`outcome` enum('SUCCESS','FAIL','NEUTRAL') NOT NULL DEFAULT 'NEUTRAL',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ryze_memory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ryze_sessions` (
	`id` varchar(40) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ryze_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `ryze_sessions_user_name_uq` UNIQUE(`userId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `ryze_settings` (
	`userId` int NOT NULL,
	`demoMode` boolean NOT NULL DEFAULT true,
	`provider` varchar(32) NOT NULL DEFAULT 'local-demo',
	`ryzeModel` varchar(120) NOT NULL DEFAULT 'ryze-safe-demo',
	`nerdModel` varchar(120) NOT NULL DEFAULT 'nerd-safe-demo',
	`externalLlmEnabled` boolean NOT NULL DEFAULT false,
	`emailEnabled` boolean NOT NULL DEFAULT false,
	`telegramEnabled` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ryze_settings_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
CREATE TABLE `ryze_skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`domain` varchar(48) NOT NULL,
	`xp` int NOT NULL DEFAULT 0,
	`level` int NOT NULL DEFAULT 1,
	`successCount` int NOT NULL DEFAULT 0,
	`failCount` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ryze_skills_id` PRIMARY KEY(`id`),
	CONSTRAINT `ryze_skills_user_domain_uq` UNIQUE(`userId`,`domain`)
);
--> statement-breakpoint
CREATE TABLE `ryze_task_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskId` varchar(40) NOT NULL,
	`sequence` int NOT NULL,
	`actor` enum('ryze','nerd','system') NOT NULL,
	`level` enum('info','success','warning','error') NOT NULL DEFAULT 'info',
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ryze_task_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `ryze_task_logs_task_sequence_uq` UNIQUE(`taskId`,`sequence`)
);
--> statement-breakpoint
CREATE TABLE `ryze_tasks` (
	`id` varchar(40) NOT NULL,
	`userId` int NOT NULL,
	`sessionId` varchar(40) NOT NULL,
	`prompt` text NOT NULL,
	`action` varchar(64) NOT NULL,
	`status` enum('PENDING','IN_PROGRESS','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
	`summary` text,
	`retryCount` int NOT NULL DEFAULT 0,
	`completedSteps` int NOT NULL DEFAULT 0,
	`totalSteps` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `ryze_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','user') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `ryze_files` ADD CONSTRAINT `ryze_files_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ryze_files` ADD CONSTRAINT `ryze_files_taskId_ryze_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `ryze_tasks`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ryze_memory` ADD CONSTRAINT `ryze_memory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ryze_sessions` ADD CONSTRAINT `ryze_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ryze_settings` ADD CONSTRAINT `ryze_settings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ryze_skills` ADD CONSTRAINT `ryze_skills_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ryze_task_logs` ADD CONSTRAINT `ryze_task_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ryze_task_logs` ADD CONSTRAINT `ryze_task_logs_taskId_ryze_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `ryze_tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ryze_tasks` ADD CONSTRAINT `ryze_tasks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ryze_tasks` ADD CONSTRAINT `ryze_tasks_sessionId_ryze_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `ryze_sessions`(`id`) ON DELETE cascade ON UPDATE no action;