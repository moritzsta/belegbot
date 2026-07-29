CREATE TABLE "belegbot_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"owner" text NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"paid_by" text NOT NULL,
	"receipt_date" date,
	"merchant" text,
	"total_amount" numeric(10, 2),
	"category" text DEFAULT 'Andere' NOT NULL,
	"vat_7_base" numeric(10, 2),
	"vat_7_amount" numeric(10, 2),
	"vat_19_base" numeric(10, 2),
	"vat_19_amount" numeric(10, 2),
	"note" text,
	"telegram_message_id" bigint,
	"telegram_user_id" bigint,
	"file_path" text,
	"extraction_confidence" text DEFAULT 'medium'
);
--> statement-breakpoint
CREATE INDEX "belegbot_receipts_owner_idx" ON "belegbot_receipts" USING btree ("owner");--> statement-breakpoint
CREATE INDEX "belegbot_receipts_is_shared_idx" ON "belegbot_receipts" USING btree ("is_shared");--> statement-breakpoint
CREATE INDEX "belegbot_receipts_receipt_date_idx" ON "belegbot_receipts" USING btree ("receipt_date");--> statement-breakpoint
CREATE INDEX "belegbot_receipts_category_idx" ON "belegbot_receipts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "belegbot_receipts_paid_by_idx" ON "belegbot_receipts" USING btree ("paid_by");