CREATE TABLE `ryze_worker_commands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workerId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`command` varchar(32) NOT NULL,
	`payload` text,
	`status` enum('queued','acknowledged','completed','failed') NOT NULL DEFAULT 'queued',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ryze_worker_commands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ryze_worker_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workerId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`level` enum('info','warning','error') NOT NULL DEFAULT 'info',
	`eventType` varchar(100) NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ryze_worker_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ryze_workers` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`hostname` varchar(120) NOT NULL,
	`version` varchar(64) NOT NULL,
	`status` enum('online','paused','degraded','offline') NOT NULL DEFAULT 'offline',
	`automationPaused` boolean NOT NULL DEFAULT false,
	`lastHeartbeatAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ryze_workers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ryze_worker_commands` ADD CONSTRAINT `ryze_worker_commands_workerId_ryze_workers_id_fk` FOREIGN KEY (`workerId`) REFERENCES `ryze_workers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ryze_worker_commands` ADD CONSTRAINT `ryze_worker_commands_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ryze_worker_events` ADD CONSTRAINT `ryze_worker_events_workerId_ryze_workers_id_fk` FOREIGN KEY (`workerId`) REFERENCES `ryze_workers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ryze_worker_events` ADD CONSTRAINT `ryze_worker_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ryze_workers` ADD CONSTRAINT `ryze_workers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;