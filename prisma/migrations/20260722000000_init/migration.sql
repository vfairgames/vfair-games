-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('ADMIN', 'PARTNER');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('MANAGE_USERS', 'MANAGE_PARTNERS', 'MANAGE_PLAYERS');

-- CreateEnum
CREATE TYPE "PartnerThemeAppearance" AS ENUM ('light', 'dark');

-- CreateEnum
CREATE TYPE "SeedStatus" AS ENUM ('COMMITTED', 'ACTIVE', 'REVEALED');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('ACTIVE', 'WON', 'LOST', 'FAILED');

-- CreateEnum
CREATE TYPE "WalletTxType" AS ENUM ('DEBIT', 'CREDIT', 'ROLLBACK');

-- CreateEnum
CREATE TYPE "WalletTxStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "FailedRoundEventAction" AS ENUM ('SOLVED', 'UNSOLVED');

-- CreateEnum
CREATE TYPE "KpiScope" AS ENUM ('PLAYER', 'PARTNER', 'GLOBAL');

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" "RoleName" NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" SERIAL NOT NULL,
    "roleId" INTEGER NOT NULL,
    "permission" "Permission" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "partnerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastAccessAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSignIn" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSignIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "lobbyUrl" TEXT,
    "webhookUrl" TEXT,
    "secret" TEXT NOT NULL,
    "ipWhitelist" TEXT NOT NULL DEFAULT '*',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerCurrency" (
    "id" SERIAL NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "minBet" DECIMAL(38,18) NOT NULL,
    "maxBet" DECIMAL(38,18) NOT NULL,
    "maxWin" DECIMAL(38,18) NOT NULL,
    "decimals" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerCurrency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerGame" (
    "id" SERIAL NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rtp" DOUBLE PRECISION NOT NULL DEFAULT 0.98,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerTheme" (
    "partnerId" INTEGER NOT NULL,
    "lightAccent" TEXT NOT NULL,
    "lightGray" TEXT NOT NULL,
    "lightBg" TEXT NOT NULL,
    "darkAccent" TEXT NOT NULL,
    "darkGray" TEXT NOT NULL,
    "darkBg" TEXT NOT NULL,
    "defaultAppearance" "PartnerThemeAppearance" NOT NULL DEFAULT 'light',
    "themeSwitcherEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lightAccentColor" TEXT NOT NULL,
    "darkAccentColor" TEXT NOT NULL,
    "theme" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerTheme_pkey" PRIMARY KEY ("partnerId")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProvablyFairSeed" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "serverSeed" TEXT NOT NULL,
    "serverSeedHash" TEXT NOT NULL,
    "status" "SeedStatus" NOT NULL DEFAULT 'COMMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revealedAt" TIMESTAMP(3),

    CONSTRAINT "ProvablyFairSeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FairnessRotation" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "serverSeedId" INTEGER NOT NULL,
    "clientSeed" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "nonceCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "FairnessRotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRound" (
    "id" BIGSERIAL NOT NULL,
    "rotationId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "rtp" DECIMAL(8,6) NOT NULL,
    "requestId" TEXT NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'ACTIVE',
    "betAmount" DECIMAL(38,18) NOT NULL,
    "payoutMultiplier" DECIMAL(20,8),
    "winAmount" DECIMAL(38,18),
    "balanceAfter" DECIMAL(38,18),
    "outcome" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FailedRoundEvent" (
    "id" SERIAL NOT NULL,
    "roundId" BIGINT NOT NULL,
    "action" "FailedRoundEventAction" NOT NULL,
    "note" TEXT NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FailedRoundEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" BIGSERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "roundId" BIGINT,
    "type" "WalletTxType" NOT NULL,
    "status" "WalletTxStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(38,18) NOT NULL,
    "balanceBefore" DECIMAL(38,18),
    "balanceAfter" DECIMAL(38,18),
    "partnerTransactionId" TEXT,
    "requestId" TEXT NOT NULL,
    "reversesTransactionId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyKpi" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "scope" "KpiScope" NOT NULL,
    "partnerId" INTEGER NOT NULL DEFAULT 0,
    "playerId" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "totalWagered" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "totalWon" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "ggr" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "totalBets" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyKpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyKpiGame" (
    "id" SERIAL NOT NULL,
    "dailyKpiId" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "totalWagered" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "totalWon" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "ggr" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "totalBets" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyKpiGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiProcessedRound" (
    "roundId" BIGINT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiProcessedRound_pkey" PRIMARY KEY ("roundId")
);

-- CreateTable
CREATE TABLE "GameVerificationContent" (
    "id" SERIAL NOT NULL,
    "gameId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "partnerId" INTEGER NOT NULL,

    CONSTRAINT "GameVerificationContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permission_key" ON "RolePermission"("roleId", "permission");

-- CreateIndex
CREATE INDEX "UserSignIn_userId_createdAt_idx" ON "UserSignIn"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserSignIn_email_createdAt_idx" ON "UserSignIn"("email", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Partner_secret_key" ON "Partner"("secret");

-- CreateIndex
CREATE INDEX "PartnerCurrency_partnerId_idx" ON "PartnerCurrency"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerCurrency_partnerId_code_key" ON "PartnerCurrency"("partnerId", "code");

-- CreateIndex
CREATE INDEX "PartnerGame_partnerId_idx" ON "PartnerGame"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerGame_partnerId_gameId_key" ON "PartnerGame"("partnerId", "gameId");

-- CreateIndex
CREATE INDEX "Player_partnerId_idx" ON "Player"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_partnerId_externalId_key" ON "Player"("partnerId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProvablyFairSeed_serverSeedHash_key" ON "ProvablyFairSeed"("serverSeedHash");

-- CreateIndex
CREATE INDEX "ProvablyFairSeed_playerId_status_idx" ON "ProvablyFairSeed"("playerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FairnessRotation_serverSeedId_key" ON "FairnessRotation"("serverSeedId");

-- CreateIndex
CREATE INDEX "FairnessRotation_playerId_endedAt_idx" ON "FairnessRotation"("playerId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FairnessRotation_playerId_sequence_key" ON "FairnessRotation"("playerId", "sequence");

-- CreateIndex
CREATE INDEX "GameRound_createdAt_id_idx" ON "GameRound"("createdAt", "id");

-- CreateIndex
CREATE INDEX "GameRound_playerId_createdAt_idx" ON "GameRound"("playerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GameRound_playerId_gameId_createdAt_id_idx" ON "GameRound"("playerId", "gameId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "GameRound_partnerId_gameId_createdAt_idx" ON "GameRound"("partnerId", "gameId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GameRound_partnerId_currency_createdAt_idx" ON "GameRound"("partnerId", "currency", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GameRound_partnerId_status_createdAt_idx" ON "GameRound"("partnerId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GameRound_playerId_status_idx" ON "GameRound"("playerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_rotationId_nonce_key" ON "GameRound"("rotationId", "nonce");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_playerId_requestId_key" ON "GameRound"("playerId", "requestId");

-- CreateIndex
CREATE INDEX "FailedRoundEvent_roundId_createdAt_idx" ON "FailedRoundEvent"("roundId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WalletTransaction_createdAt_id_idx" ON "WalletTransaction"("createdAt", "id");

-- CreateIndex
CREATE INDEX "WalletTransaction_playerId_createdAt_idx" ON "WalletTransaction"("playerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WalletTransaction_roundId_idx" ON "WalletTransaction"("roundId");

-- CreateIndex
CREATE INDEX "WalletTransaction_reversesTransactionId_idx" ON "WalletTransaction"("reversesTransactionId");

-- CreateIndex
CREATE INDEX "WalletTransaction_partnerId_currency_createdAt_idx" ON "WalletTransaction"("partnerId", "currency", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WalletTransaction_partnerId_status_idx" ON "WalletTransaction"("partnerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_partnerId_requestId_key" ON "WalletTransaction"("partnerId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_partnerId_partnerTransactionId_key" ON "WalletTransaction"("partnerId", "partnerTransactionId");

-- CreateIndex
CREATE INDEX "DailyKpi_scope_partnerId_date_idx" ON "DailyKpi"("scope", "partnerId", "date");

-- CreateIndex
CREATE INDEX "DailyKpi_scope_playerId_date_idx" ON "DailyKpi"("scope", "playerId", "date");

-- CreateIndex
CREATE INDEX "DailyKpi_scope_date_idx" ON "DailyKpi"("scope", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyKpi_date_scope_partnerId_playerId_currency_key" ON "DailyKpi"("date", "scope", "partnerId", "playerId", "currency");

-- CreateIndex
CREATE INDEX "DailyKpiGame_gameId_idx" ON "DailyKpiGame"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyKpiGame_dailyKpiId_gameId_key" ON "DailyKpiGame"("dailyKpiId", "gameId");

-- CreateIndex
CREATE INDEX "GameVerificationContent_partnerId_gameId_idx" ON "GameVerificationContent"("partnerId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameVerificationContent_partnerId_gameId_lang_key" ON "GameVerificationContent"("partnerId", "gameId", "lang");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSignIn" ADD CONSTRAINT "UserSignIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCurrency" ADD CONSTRAINT "PartnerCurrency_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerGame" ADD CONSTRAINT "PartnerGame_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerTheme" ADD CONSTRAINT "PartnerTheme_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProvablyFairSeed" ADD CONSTRAINT "ProvablyFairSeed_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FairnessRotation" ADD CONSTRAINT "FairnessRotation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FairnessRotation" ADD CONSTRAINT "FairnessRotation_serverSeedId_fkey" FOREIGN KEY ("serverSeedId") REFERENCES "ProvablyFairSeed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "FairnessRotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_partnerGame_fkey" FOREIGN KEY ("partnerId", "gameId") REFERENCES "PartnerGame"("partnerId", "gameId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_partnerCurrency_fkey" FOREIGN KEY ("partnerId", "currency") REFERENCES "PartnerCurrency"("partnerId", "code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FailedRoundEvent" ADD CONSTRAINT "FailedRoundEvent_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FailedRoundEvent" ADD CONSTRAINT "FailedRoundEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_partnerCurrency_fkey" FOREIGN KEY ("partnerId", "currency") REFERENCES "PartnerCurrency"("partnerId", "code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_reversesTransactionId_fkey" FOREIGN KEY ("reversesTransactionId") REFERENCES "WalletTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyKpiGame" ADD CONSTRAINT "DailyKpiGame_dailyKpiId_fkey" FOREIGN KEY ("dailyKpiId") REFERENCES "DailyKpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameVerificationContent" ADD CONSTRAINT "GameVerificationContent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Partner_code_active_key" ON "Partner"("code") WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "GameRound_one_active_per_player_game"
  ON "GameRound" ("playerId", "gameId")
  WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "FairnessRotation_one_active_per_player"
  ON "FairnessRotation" ("playerId")
  WHERE "endedAt" IS NULL;

CREATE UNIQUE INDEX "ProvablyFairSeed_one_per_status_per_player"
  ON "ProvablyFairSeed" ("playerId", "status")
  WHERE "status" IN ('ACTIVE', 'COMMITTED');

ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_betAmount_positive" CHECK ("betAmount" > 0);
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_winAmount_nonneg" CHECK ("winAmount" IS NULL OR "winAmount" >= 0);
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_amount_nonneg" CHECK ("amount" >= 0);

CREATE UNIQUE INDEX "User_email_active_key"
  ON "User"("email")
  WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "Partner_name_active_key"
  ON "Partner"("name")
  WHERE "deletedAt" IS NULL;
