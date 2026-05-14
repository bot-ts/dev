/*
  Warnings:

  - You are about to drop the column `state` on the `FormState` table. All the data in the column will be lost.
  - You are about to drop the column `step` on the `FormState` table. All the data in the column will be lost.
  - Added the required column `progress` to the `FormState` table without a default value. This is not possible if the table is not empty.
  - Added the required column `values` to the `FormState` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FormState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "values" TEXT NOT NULL,
    "progress" INTEGER NOT NULL,
    CONSTRAINT "FormState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FormState" ("id", "userId") SELECT "id", "userId" FROM "FormState";
DROP TABLE "FormState";
ALTER TABLE "new_FormState" RENAME TO "FormState";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
