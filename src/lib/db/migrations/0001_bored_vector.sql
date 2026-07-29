CREATE TABLE "belegbot_user_config" (
	"owner" text PRIMARY KEY NOT NULL,
	"telegram_user_id" bigint,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "belegbot_user_config_telegram_user_id_unique" UNIQUE("telegram_user_id")
);
