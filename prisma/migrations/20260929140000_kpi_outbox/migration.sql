-- CreateTable
CREATE TABLE "KpiOutbox" (
    "id" BIGSERIAL NOT NULL,
    "roundId" BIGINT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "KpiOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KpiOutbox_roundId_key" ON "KpiOutbox"("roundId");

-- CreateIndex
CREATE INDEX "KpiOutbox_publishedAt_createdAt_idx" ON "KpiOutbox"("publishedAt", "createdAt");
