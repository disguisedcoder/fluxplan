-- AlterTable
ALTER TABLE "AdaptiveSuggestion" ALTER COLUMN "payload" SET DEFAULT '{}'::jsonb;

-- AlterTable
ALTER TABLE "EventLog" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb;

-- AlterTable
ALTER TABLE "TaskInteraction" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb;

-- AlterTable
ALTER TABLE "UserPreference" ALTER COLUMN "value" SET DEFAULT '{}'::jsonb;
