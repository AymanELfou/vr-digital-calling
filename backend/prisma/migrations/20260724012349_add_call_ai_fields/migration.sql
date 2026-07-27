/*
  Warnings:

  - You are about to drop the column `recordingUrl` on the `calls` table. All the data in the column will be lost.
  - The `transcript` column on the `calls` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ai_configs" ADD COLUMN     "maxTokens" INTEGER NOT NULL DEFAULT 4096,
ADD COLUMN     "silenceMs" INTEGER NOT NULL DEFAULT 500,
ALTER COLUMN "allowGeneral" SET DEFAULT true,
ALTER COLUMN "language" SET DEFAULT 'auto';

-- AlterTable
ALTER TABLE "calls" DROP COLUMN "recordingUrl",
ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "detectedLang" TEXT,
DROP COLUMN "transcript",
ADD COLUMN     "transcript" JSONB;
