CREATE TYPE "public"."evidence_request_status" AS ENUM('open', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."evidence_status" AS ENUM('pending', 'quarantined', 'clean', 'infected', 'rejected');--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid,
	"fulfils_request_id" uuid,
	"file_name" text NOT NULL,
	"declared_content_type" text NOT NULL,
	"detected_content_type" text,
	"size_bytes" bigint NOT NULL,
	"status" "evidence_status" DEFAULT 'pending' NOT NULL,
	"quarantine_key" text,
	"evidence_key" text,
	"sha256" text,
	"scan_result" text,
	"scan_signature" text,
	"scanned_at" timestamp with time zone,
	"classification" text,
	"classified_by_user_id" uuid,
	"classified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "evidence_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"requested_by_user_id" uuid,
	"description" text NOT NULL,
	"status" "evidence_request_status" DEFAULT 'open' NOT NULL,
	"due_at" timestamp with time zone,
	"fulfilled_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_fulfils_request_id_evidence_requests_id_fk" FOREIGN KEY ("fulfils_request_id") REFERENCES "public"."evidence_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_classified_by_user_id_users_id_fk" FOREIGN KEY ("classified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_requests" ADD CONSTRAINT "evidence_requests_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_requests" ADD CONSTRAINT "evidence_requests_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_requests" ADD CONSTRAINT "evidence_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evidence_org_application_idx" ON "evidence" USING btree ("organisation_id","application_id");--> statement-breakpoint
CREATE INDEX "evidence_org_status_idx" ON "evidence" USING btree ("organisation_id","status");--> statement-breakpoint
CREATE INDEX "evidence_requests_org_application_idx" ON "evidence_requests" USING btree ("organisation_id","application_id");