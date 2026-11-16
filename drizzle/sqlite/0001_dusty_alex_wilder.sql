CREATE TABLE `ryze_opencode_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`ryzeSessionId` text NOT NULL,
	`openCodeSessionId` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ryzeSessionId`) REFERENCES `ryze_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ryze_opencode_sessions_user_session_uq` ON `ryze_opencode_sessions` (`userId`,`ryzeSessionId`);--> statement-breakpoint
CREATE UNIQUE INDEX `ryze_opencode_sessions_opencode_id_uq` ON `ryze_opencode_sessions` (`openCodeSessionId`);