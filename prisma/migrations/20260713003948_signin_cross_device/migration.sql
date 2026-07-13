/*
  Warnings:

  - A unique constraint covering the columns `[pendingHash]` on the table `SignInToken` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SignInToken" ADD COLUMN     "approvedUserId" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "pendingHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SignInToken_pendingHash_key" ON "SignInToken"("pendingHash");
