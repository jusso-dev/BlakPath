CREATE TYPE "public"."certificate_status" AS ENUM('draft', 'signed', 'revoked');--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"decision_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"status" "certificate_status" DEFAULT 'draft' NOT NULL,
	"pdf_object_key" text,
	"sha256" text,
	"verification_code" text NOT NULL,
	"signed_by_user_id" uuid,
	"signed_at" timestamp with time zone,
	"revoked_by_user_id" uuid,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_signed_by_user_id_users_id_fk" FOREIGN KEY ("signed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_revoked_by_user_id_users_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_org_reference_unique" ON "certificates" USING btree ("organisation_id","reference");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_verification_code_unique" ON "certificates" USING btree ("verification_code");--> statement-breakpoint
CREATE INDEX "certificates_org_status_idx" ON "certificates" USING btree ("organisation_id","status");--> statement-breakpoint
CREATE INDEX "certificates_org_application_idx" ON "certificates" USING btree ("organisation_id","application_id");