CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_email` text,
	`action` text NOT NULL,
	`target_email` text,
	`details_json` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `organization_profiles` (
	`email` text PRIMARY KEY NOT NULL,
	`department` text NOT NULL,
	`level` integer DEFAULT 3 NOT NULL,
	`job_title` text NOT NULL,
	`english_name` text NOT NULL,
	`chinese_name` text NOT NULL,
	`phone` text,
	`birthday` text
);
