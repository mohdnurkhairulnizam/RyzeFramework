ALTER TABLE `ryze_files` ADD `telegramChatId` text;
--> statement-breakpoint
ALTER TABLE `ryze_files` ADD `telegramSenderId` text;
--> statement-breakpoint
ALTER TABLE `ryze_files` ADD `telegramMessageId` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `ryze_files_telegram_origin_uq` ON `ryze_files` (`userId`,`telegramChatId`,`telegramMessageId`);
