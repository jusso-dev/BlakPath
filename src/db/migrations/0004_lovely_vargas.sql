CREATE TYPE "public"."conflict_status" AS ENUM('declared', 'cleared', 'recused');--> statement-breakpoint
CREATE TYPE "public"."decision_outcome" AS ENUM('confirmed', 'not_confirmed', 'deferred');--> statement-breakpoint
CREATE TYPE "public"."decision_status" AS ENUM('proposed', 'finalised', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."meeting_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."vote_choice" AS ENUM('for', 'against', 'abstain');--> statement-breakpoint
CREATE TABLE "conflict_declarations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"meeting_id" uuid,
	"declared_by_user_id" uuid NOT NULL,
	"status" "conflict_status" DEFAULT 'declared' NOT NULL,
	"reason" text,
	"cleared_by_user_id" uuid,
	"cleared_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_agenda_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"meeting_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"title" text NOT NULL,
	"scheduled_start" timestamp with time zone NOT NULL,
	"scheduled_end" timestamp with time zone,
	"location" text,
	"status" "meeting_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "decision_votes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"decision_id" uuid NOT NULL,
	"voter_user_id" uuid NOT NULL,
	"choice" "vote_choice" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"meeting_id" uuid,
	"proposed_by_user_id" uuid,
	"proposed_outcome" "decision_outcome" NOT NULL,
	"rationale" text,
	"status" "decision_status" DEFAULT 'proposed' NOT NULL,
	"final_outcome" "decision_outcome",
	"finalised_by_user_id" uuid,
	"finalised_at" timestamp with time zone,
	"reversed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "conflict_declarations" ADD CONSTRAINT "conflict_declarations_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflict_declarations" ADD CONSTRAINT "conflict_declarations_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflict_declarations" ADD CONSTRAINT "conflict_declarations_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflict_declarations" ADD CONSTRAINT "conflict_declarations_declared_by_user_id_users_id_fk" FOREIGN KEY ("declared_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflict_declarations" ADD CONSTRAINT "conflict_declarations_cleared_by_user_id_users_id_fk" FOREIGN KEY ("cleared_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD CONSTRAINT "meeting_agenda_items_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD CONSTRAINT "meeting_agenda_items_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD CONSTRAINT "meeting_agenda_items_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_votes" ADD CONSTRAINT "decision_votes_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_votes" ADD CONSTRAINT "decision_votes_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_votes" ADD CONSTRAINT "decision_votes_voter_user_id_users_id_fk" FOREIGN KEY ("voter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_proposed_by_user_id_users_id_fk" FOREIGN KEY ("proposed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_finalised_by_user_id_users_id_fk" FOREIGN KEY ("finalised_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conflict_declarations_org_application_idx" ON "conflict_declarations" USING btree ("organisation_id","application_id");--> statement-breakpoint
CREATE INDEX "conflict_declarations_org_meeting_idx" ON "conflict_declarations" USING btree ("organisation_id","meeting_id");--> statement-breakpoint
CREATE INDEX "meeting_agenda_items_org_meeting_idx" ON "meeting_agenda_items" USING btree ("organisation_id","meeting_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_agenda_items_meeting_application_unique" ON "meeting_agenda_items" USING btree ("meeting_id","application_id");--> statement-breakpoint
CREATE INDEX "meetings_org_start_idx" ON "meetings" USING btree ("organisation_id","scheduled_start");--> statement-breakpoint
CREATE INDEX "meetings_org_status_idx" ON "meetings" USING btree ("organisation_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "decision_votes_decision_voter_unique" ON "decision_votes" USING btree ("decision_id","voter_user_id");--> statement-breakpoint
CREATE INDEX "decision_votes_org_decision_idx" ON "decision_votes" USING btree ("organisation_id","decision_id");--> statement-breakpoint
CREATE INDEX "decisions_org_application_idx" ON "decisions" USING btree ("organisation_id","application_id");--> statement-breakpoint
CREATE INDEX "decisions_org_meeting_idx" ON "decisions" USING btree ("organisation_id","meeting_id");