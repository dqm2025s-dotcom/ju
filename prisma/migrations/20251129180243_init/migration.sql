-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sideA" TEXT NOT NULL,
    "sideB" TEXT NOT NULL,
    "voteCountA" INTEGER NOT NULL DEFAULT 0,
    "voteCountB" INTEGER NOT NULL DEFAULT 0,
    "comments" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
