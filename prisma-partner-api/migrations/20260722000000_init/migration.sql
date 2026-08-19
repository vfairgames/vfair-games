-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PartnerWalletTxType" AS ENUM ('DEBIT', 'CREDIT', 'ROLLBACK');

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerWallet" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL,
    "decimals" INTEGER NOT NULL,

    CONSTRAINT "PlayerWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "walletId" INTEGER NOT NULL,
    "type" "PartnerWalletTxType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balanceAfter" DECIMAL(18,2) NOT NULL,
    "requestId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundId" TEXT,
    "reversesTransactionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_username_key" ON "Player"("username");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerWallet_playerId_currency_key" ON "PlayerWallet"("playerId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_requestId_key" ON "WalletTransaction"("requestId");

-- CreateIndex
CREATE INDEX "WalletTransaction_playerId_createdAt_idx" ON "WalletTransaction"("playerId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "PlayerWallet" ADD CONSTRAINT "PlayerWallet_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "PlayerWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_reversesTransactionId_fkey" FOREIGN KEY ("reversesTransactionId") REFERENCES "WalletTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
