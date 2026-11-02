ALTER TABLE "agent_requests" ADD COLUMN "conversation" jsonb;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_request_id_unique" UNIQUE("request_id");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_from_request_id_unique" UNIQUE("created_from_request_id");