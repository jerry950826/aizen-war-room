CREATE TABLE `daily_fortunes` (
	`email` text NOT NULL,
	`fortune_date` text NOT NULL,
	`sign` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`owner_token` text NOT NULL,
	`result_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`email`, `fortune_date`, `sign`)
);
