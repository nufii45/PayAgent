CREATE TYPE "public"."evidence_kind" AS ENUM('image', 'text');--> statement-breakpoint
CREATE TABLE "analysis_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investigation_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"trigger" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"extraction" jsonb,
	"analysis" jsonb,
	"corrections" jsonb,
	"model" text,
	"latency_ms" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investigation_id" uuid NOT NULL,
	"kind" "evidence_kind" NOT NULL,
	"label" text NOT NULL,
	"position" integer NOT NULL,
	"text_content" text,
	"image_data_url" text,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investigations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"instruction" text,
	"corrections" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_requests" ADD COLUMN "investigation_id" uuid;--> statement-breakpoint
ALTER TABLE "analysis_versions" ADD CONSTRAINT "analysis_versions_investigation_id_investigations_id_fk" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD CONSTRAINT "evidence_sources_investigation_id_investigations_id_fk" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_version_uq" ON "analysis_versions" USING btree ("investigation_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_hash_uq" ON "evidence_sources" USING btree ("investigation_id","content_hash");--> statement-breakpoint
CREATE INDEX "evidence_inv_idx" ON "evidence_sources" USING btree ("investigation_id","position");--> statement-breakpoint
ALTER TABLE "agent_requests" ADD CONSTRAINT "agent_requests_investigation_id_investigations_id_fk" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE set null ON UPDATE no action;