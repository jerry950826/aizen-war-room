CREATE TABLE `instructor_cohort_records` (
	`id` text PRIMARY KEY NOT NULL,
	`cohort` integer NOT NULL,
	`client` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`district` text DEFAULT '' NOT NULL,
	`village` text DEFAULT '' NOT NULL,
	`member_count` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `instructor_course_events` (
	`id` text PRIMARY KEY NOT NULL,
	`series_id` text DEFAULT '' NOT NULL,
	`cohort` integer NOT NULL,
	`client` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`teacher_id` text DEFAULT '' NOT NULL,
	`teacher_name` text DEFAULT '' NOT NULL,
	`teacher_email` text DEFAULT '' NOT NULL,
	`teacher_phone` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`status` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `instructor_message_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `instructor_schedule_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`occurred_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `instructor_teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
