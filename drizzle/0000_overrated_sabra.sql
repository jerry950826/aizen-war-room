CREATE TABLE `members` (
	`email` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`password_hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`email` text PRIMARY KEY NOT NULL,
	`leave` integer DEFAULT true NOT NULL,
	`claims` integer DEFAULT true NOT NULL,
	`instructors` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL
);
