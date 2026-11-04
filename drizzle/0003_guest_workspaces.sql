CREATE TABLE "model_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"ip_hash" text,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"onboarded_at" timestamp with time zone,
	"privacy_acknowledged_at" timestamp with time zone,
	"replaced_expired_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approvals" DROP CONSTRAINT "approvals_request_id_agent_requests_id_fk";
--> statement-breakpoint
ALTER TABLE "agent_requests" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "investigations" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
CREATE INDEX "model_calls_time_idx" ON "model_calls" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "model_calls_ws_idx" ON "model_calls" USING btree ("workspace_id","created_at");--> statement-breakpoint
ALTER TABLE "agent_requests" ADD CONSTRAINT "agent_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_request_id_agent_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."agent_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_ws_idx" ON "audit_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "investigations_ws_idx" ON "investigations" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE INDEX "invoices_ws_idx" ON "invoices" USING btree ("workspace_id","created_at");