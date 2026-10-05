/*
  Warnings:

  - You are about to drop the column `date` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `emptyCyls` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `fullCyls` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `hawkerId` on the `Trip` table. All the data in the column will be lost.
  - Added the required column `cylindersOut` to the `Trip` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destination` to the `Trip` table without a default value. This is not possible if the table is not empty.
  - Added the required column `driverName` to the `Trip` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Trip` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicleNo` to the `Trip` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleNo" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "cylindersOut" INTEGER NOT NULL,
    "cylindersInFull" INTEGER NOT NULL DEFAULT 0,
    "cylindersInEmpty" INTEGER NOT NULL DEFAULT 0,
    "cylindersInDefective" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OUT',
    "timeOut" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeIn" DATETIME,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Trip" ("id", "status") SELECT "id", "status" FROM "Trip";
DROP TABLE "Trip";
ALTER TABLE "new_Trip" RENAME TO "Trip";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
