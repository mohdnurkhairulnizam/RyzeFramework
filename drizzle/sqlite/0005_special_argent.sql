CREATE TABLE `ryze_identity_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` integer NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`description` text NOT NULL,
	`communicationStyle` text NOT NULL,
	`workingPrinciples` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ryze_identity_profiles_user_uq` ON `ryze_identity_profiles` (`userId`);--> statement-breakpoint
CREATE TABLE `ryze_identity_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`profileId` text NOT NULL,
	`userId` integer NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`description` text NOT NULL,
	`communicationStyle` text NOT NULL,
	`workingPrinciples` text NOT NULL,
	`version` integer NOT NULL,
	`changedBy` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`profileId`) REFERENCES `ryze_identity_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ryze_system_memory` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` integer NOT NULL,
	`memoryType` text NOT NULL,
	`content` text NOT NULL,
	`tags` text NOT NULL,
	`sourceSystemId` text NOT NULL,
	`branchId` text DEFAULT 'main' NOT NULL,
	`sourceRef` text,
	`derivedFrom` text,
	`createdBy` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`sensitivity` text DEFAULT 'normal' NOT NULL,
	`syncStatus` text DEFAULT 'local' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `ryze_memory` ADD `legacyScope` text;--> statement-breakpoint
ALTER TABLE `ryze_memory` ADD `category` text;--> statement-breakpoint
ALTER TABLE `ryze_memory` ADD `memoryType` text;--> statement-breakpoint
ALTER TABLE `ryze_memory` ADD `ownerScope` text DEFAULT 'owner' NOT NULL;--> statement-breakpoint
ALTER TABLE `ryze_memory` ADD `sourceSystemId` text;--> statement-breakpoint
ALTER TABLE `ryze_memory` ADD `branchId` text DEFAULT 'main' NOT NULL;--> statement-breakpoint
ALTER TABLE `ryze_memory` ADD `sourceRef` text;--> statement-breakpoint
ALTER TABLE `ryze_memory` ADD `derivedFrom` text;--> statement-breakpoint
ALTER TABLE `ryze_memory` ADD `createdBy` text;--> statement-breakpoint
ALTER TABLE `ryze_memory` ADD `updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL;--> statement-breakpoint
ALTER TABLE `ryze_memory` ADD `version` integer;--> statement-breakpoint
ALTER TABLE `ryze_memory` ADD `status` text DEFAULT 'legacy_unclassified';--> statement-breakpoint
ALTER TABLE `ryze_memory` ADD `sensitivity` text DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE `ryze_memory` ADD `syncStatus` text DEFAULT 'local';--> statement-breakpoint
UPDATE `ryze_memory` SET `legacyScope` = `scope`, `status` = 'legacy_unclassified', `sensitivity` = 'normal', `syncStatus` = 'local' WHERE `legacyScope` IS NULL;
