CREATE TABLE `ryze_telegram_access` (
	`userId` integer PRIMARY KEY NOT NULL,
	`adminTelegramUserId` text,
	`temporaryTelegramUserId` text,
	`temporaryExpiresAt` integer,
	`secretCodeHash` text,
	`secretCodeExpiresAt` integer,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ryze_telegram_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`label` text NOT NULL,
	`phoneMasked` text NOT NULL,
	`telegramUserId` text,
	`status` text DEFAULT 'configured' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ryze_telegram_accounts_user_uq` ON `ryze_telegram_accounts` (`userId`);--> statement-breakpoint
CREATE TABLE `ryze_telegram_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`accountId` integer,
	`direction` text NOT NULL,
	`telegramUserId` text,
	`chatId` text,
	`messagePreview` text NOT NULL,
	`status` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `ryze_telegram_accounts`(`id`) ON UPDATE no action ON DELETE set null
);
