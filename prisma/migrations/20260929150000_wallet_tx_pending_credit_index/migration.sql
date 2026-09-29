-- CreateIndex
CREATE INDEX "WalletTransaction_status_type_createdAt_idx" ON "WalletTransaction"("status", "type", "createdAt");
