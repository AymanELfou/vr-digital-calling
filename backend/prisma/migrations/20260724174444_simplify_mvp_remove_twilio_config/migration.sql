/*
  Warnings:

  - You are about to drop the `twilio_configs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "twilio_configs" DROP CONSTRAINT "twilio_configs_companyId_fkey";

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "phone" TEXT;

-- DropTable
DROP TABLE "twilio_configs";
