-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SourceFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingRequestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PRIMARY_MEETING',
    "fileName" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "extractedText" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SourceFile_meetingRequestId_fkey" FOREIGN KEY ("meetingRequestId") REFERENCES "MeetingRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SourceFile" ("fileName", "id", "meetingRequestId", "storageUrl", "type", "uploadedAt") SELECT "fileName", "id", "meetingRequestId", "storageUrl", "type", "uploadedAt" FROM "SourceFile";
DROP TABLE "SourceFile";
ALTER TABLE "new_SourceFile" RENAME TO "SourceFile";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
