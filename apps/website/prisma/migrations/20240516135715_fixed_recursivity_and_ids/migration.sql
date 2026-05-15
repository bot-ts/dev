-- CreateTable
CREATE TABLE "PreRendered" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_PreRenderedRequirement" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PreRenderedRequirement_A_fkey" FOREIGN KEY ("A") REFERENCES "PreRendered" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PreRenderedRequirement_B_fkey" FOREIGN KEY ("B") REFERENCES "PreRendered" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_PreRenderedRequirement_AB_unique" ON "_PreRenderedRequirement"("A", "B");

-- CreateIndex
CREATE INDEX "_PreRenderedRequirement_B_index" ON "_PreRenderedRequirement"("B");
