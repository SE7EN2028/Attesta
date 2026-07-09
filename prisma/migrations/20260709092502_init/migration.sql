-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MeetingRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "governingBody" TEXT NOT NULL,
    "meetingDate" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "outputLanguage" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MeetingRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SourceFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingRequestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SourceFile_meetingRequestId_fkey" FOREIGN KEY ("meetingRequestId") REFERENCES "MeetingRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceFileId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "speakerLabels" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transcript_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingRequestId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "outputLanguage" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "speakerAnalytics" JSONB NOT NULL,
    "numericalData" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "lockedAt" DATETIME,
    "lockedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Report_meetingRequestId_fkey" FOREIGN KEY ("meetingRequestId") REFERENCES "MeetingRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplianceFinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ruleReference" TEXT,
    "impactDescription" TEXT,
    "confidence" INTEGER NOT NULL,
    CONSTRAINT "ComplianceFinding_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SourceFile_meetingRequestId_key" ON "SourceFile"("meetingRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Transcript_sourceFileId_key" ON "Transcript"("sourceFileId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_meetingRequestId_key" ON "Report"("meetingRequestId");
