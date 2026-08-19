-- CreateTable
CREATE TABLE "GameRoundArchive" (
    "id" BIGINT NOT NULL,
    "rotationId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "rtp" DECIMAL(8,6) NOT NULL,
    "requestId" TEXT NOT NULL,
    "status" "RoundStatus" NOT NULL,
    "betAmount" DECIMAL(38,18) NOT NULL,
    "payoutMultiplier" DECIMAL(20,8),
    "winAmount" DECIMAL(38,18),
    "balanceAfter" DECIMAL(38,18),
    "outcome" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE ("createdAt");

-- CreateTable
CREATE TABLE "WalletTransactionArchive" (
    "id" BIGINT NOT NULL,
    "playerId" INTEGER NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "roundId" BIGINT,
    "type" "WalletTxType" NOT NULL,
    "status" "WalletTxStatus" NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(38,18) NOT NULL,
    "balanceBefore" DECIMAL(38,18),
    "balanceAfter" DECIMAL(38,18),
    "partnerTransactionId" TEXT,
    "requestId" TEXT NOT NULL,
    "reversesTransactionId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE ("createdAt");

CREATE TABLE "GameRoundArchive_default" PARTITION OF "GameRoundArchive" DEFAULT;
CREATE TABLE "WalletTransactionArchive_default" PARTITION OF "WalletTransactionArchive" DEFAULT;

-- CreateIndex
CREATE INDEX "GameRoundArchive_id_idx" ON "GameRoundArchive"("id");

-- CreateIndex
CREATE INDEX "GameRoundArchive_playerId_createdAt_idx" ON "GameRoundArchive"("playerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GameRoundArchive_playerId_gameId_createdAt_id_idx" ON "GameRoundArchive"("playerId", "gameId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "GameRoundArchive_partnerId_gameId_createdAt_idx" ON "GameRoundArchive"("partnerId", "gameId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GameRoundArchive_partnerId_currency_createdAt_idx" ON "GameRoundArchive"("partnerId", "currency", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WalletTransactionArchive_id_idx" ON "WalletTransactionArchive"("id");

-- CreateIndex
CREATE INDEX "WalletTransactionArchive_roundId_idx" ON "WalletTransactionArchive"("roundId");

-- CreateIndex
CREATE INDEX "WalletTransactionArchive_playerId_createdAt_idx" ON "WalletTransactionArchive"("playerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WalletTransactionArchive_partnerId_currency_createdAt_idx" ON "WalletTransactionArchive"("partnerId", "currency", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WalletTransactionArchive_partnerId_requestId_idx" ON "WalletTransactionArchive"("partnerId", "requestId");

-- CreateIndex
CREATE INDEX "WalletTransactionArchive_partnerId_partnerTransactionId_idx" ON "WalletTransactionArchive"("partnerId", "partnerTransactionId");

CREATE SCHEMA IF NOT EXISTS "maintenance";

CREATE OR REPLACE FUNCTION "maintenance"."partition_name"(
  table_name text,
  partition_start timestamptz
) RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT table_name || '_y' || to_char(partition_start AT TIME ZONE 'UTC', 'YYYY') || 'm' || to_char(partition_start AT TIME ZONE 'UTC', 'MM')
$$;

CREATE OR REPLACE FUNCTION "maintenance"."create_monthly_partition"(
  parent_table regclass,
  partition_start timestamptz
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  parent_schema text;
  parent_name text;
  child_name text;
  child_regclass regclass;
  partition_end timestamptz;
BEGIN
  SELECT n.nspname, c.relname
    INTO parent_schema, parent_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.oid = parent_table;

  IF parent_schema IS NULL THEN
    RAISE EXCEPTION 'Partition parent % was not found', parent_table;
  END IF;

  partition_start := date_trunc('month', partition_start AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  partition_end := partition_start + interval '1 month';
  child_name := "maintenance"."partition_name"(parent_name, partition_start);
  child_regclass := to_regclass(format('%I.%I', parent_schema, child_name));

  IF child_regclass IS NOT NULL THEN
    RETURN;
  END IF;

  EXECUTE format(
    'CREATE TABLE %I.%I PARTITION OF %s FOR VALUES FROM (%L) TO (%L)',
    parent_schema,
    child_name,
    parent_table,
    partition_start,
    partition_end
  );
END;
$$;

CREATE OR REPLACE FUNCTION "maintenance"."ensure_archive_partitions"(
  months_back integer DEFAULT 48,
  months_ahead integer DEFAULT 1
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  month_start timestamptz;
  offset_month integer;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('maintenance.archive_retention')) THEN
    RAISE EXCEPTION 'Archive retention maintenance is already running';
  END IF;

  IF months_back < 0 OR months_ahead < 0 THEN
    RAISE EXCEPTION 'months_back and months_ahead must be non-negative';
  END IF;

  FOR offset_month IN -months_back..months_ahead LOOP
    month_start := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' + make_interval(months => offset_month);
    PERFORM "maintenance"."create_monthly_partition"('"GameRoundArchive"'::regclass, month_start);
    PERFORM "maintenance"."create_monthly_partition"('"WalletTransactionArchive"'::regclass, month_start);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION "maintenance"."archive_fast_growth_data"(
  live_retain_months integer DEFAULT 12,
  batch_size integer DEFAULT 10000
) RETURNS TABLE(archived_wallet_transactions bigint, archived_game_rounds bigint)
LANGUAGE plpgsql
AS $$
DECLARE
  cutoff timestamptz;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('maintenance.archive_retention')) THEN
    RAISE EXCEPTION 'Archive retention maintenance is already running';
  END IF;

  IF live_retain_months < 1 THEN
    RAISE EXCEPTION 'live_retain_months must be at least 1';
  END IF;

  IF batch_size < 1 THEN
    RAISE EXCEPTION 'batch_size must be at least 1';
  END IF;

  cutoff := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' - make_interval(months => live_retain_months);

  WITH wallet_batch AS (
    SELECT wt.*
    FROM "WalletTransaction" wt
    WHERE wt."createdAt" < cutoff
      AND wt."status" <> 'PENDING'
      AND (
        wt."roundId" IS NULL
        OR EXISTS (
          SELECT 1
          FROM "GameRound" gr
          WHERE gr."id" = wt."roundId"
            AND gr."createdAt" < cutoff
            AND gr."status" <> 'ACTIVE'
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "WalletTransaction" referencing_wt
        WHERE referencing_wt."reversesTransactionId" = wt."id"
          AND referencing_wt."id" <> wt."id"
          AND NOT EXISTS (
            SELECT 1
            FROM "WalletTransactionArchive" archived_referencing_wt
            WHERE archived_referencing_wt."id" = referencing_wt."id"
          )
      )
    ORDER BY wt."createdAt", wt."id"
    LIMIT batch_size
  ),
  archived AS (
    INSERT INTO "WalletTransactionArchive" (
      "id",
      "playerId",
      "partnerId",
      "roundId",
      "type",
      "status",
      "currency",
      "amount",
      "balanceBefore",
      "balanceAfter",
      "partnerTransactionId",
      "requestId",
      "reversesTransactionId",
      "createdAt",
      "updatedAt",
      "archivedAt"
    )
    SELECT
      "id",
      "playerId",
      "partnerId",
      "roundId",
      "type",
      "status",
      "currency",
      "amount",
      "balanceBefore",
      "balanceAfter",
      "partnerTransactionId",
      "requestId",
      "reversesTransactionId",
      "createdAt",
      "updatedAt",
      now()
    FROM wallet_batch
    RETURNING "id"
  ),
  deleted AS (
    DELETE FROM "WalletTransaction" wt
    USING archived a
    WHERE wt."id" = a."id"
    RETURNING wt."id"
  )
  SELECT count(*) INTO archived_wallet_transactions FROM deleted;

  WITH round_batch AS (
    SELECT gr.*
    FROM "GameRound" gr
    WHERE gr."createdAt" < cutoff
      AND gr."status" <> 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1
        FROM "WalletTransaction" wt
        WHERE wt."roundId" = gr."id"
      )
    ORDER BY gr."createdAt", gr."id"
    LIMIT batch_size
  ),
  archived AS (
    INSERT INTO "GameRoundArchive" (
      "id",
      "rotationId",
      "playerId",
      "partnerId",
      "gameId",
      "nonce",
      "currency",
      "rtp",
      "requestId",
      "status",
      "betAmount",
      "payoutMultiplier",
      "winAmount",
      "balanceAfter",
      "outcome",
      "createdAt",
      "updatedAt",
      "settledAt",
      "archivedAt"
    )
    SELECT
      "id",
      "rotationId",
      "playerId",
      "partnerId",
      "gameId",
      "nonce",
      "currency",
      "rtp",
      "requestId",
      "status",
      "betAmount",
      "payoutMultiplier",
      "winAmount",
      "balanceAfter",
      "outcome",
      "createdAt",
      "updatedAt",
      "settledAt",
      now()
    FROM round_batch
    RETURNING "id"
  ),
  deleted AS (
    DELETE FROM "GameRound" gr
    USING archived a
    WHERE gr."id" = a."id"
    RETURNING gr."id"
  )
  SELECT count(*) INTO archived_game_rounds FROM deleted;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION "maintenance"."drop_old_archive_partitions"(
  archive_retain_months integer DEFAULT 48
) RETURNS TABLE(dropped_table text)
LANGUAGE plpgsql
AS $$
DECLARE
  cutoff timestamptz;
  partition record;
  deleted_default_rows bigint;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('maintenance.archive_retention')) THEN
    RAISE EXCEPTION 'Archive retention maintenance is already running';
  END IF;

  IF archive_retain_months < 1 THEN
    RAISE EXCEPTION 'archive_retain_months must be at least 1';
  END IF;

  cutoff := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' - make_interval(months => archive_retain_months);

  DELETE FROM "WalletTransactionArchive_default"
  WHERE "createdAt" < cutoff;
  GET DIAGNOSTICS deleted_default_rows = ROW_COUNT;

  IF deleted_default_rows > 0 THEN
    dropped_table := format('%I.%I rows=%s', 'public', 'WalletTransactionArchive_default', deleted_default_rows);
    RETURN NEXT;
  END IF;

  DELETE FROM "GameRoundArchive_default"
  WHERE "createdAt" < cutoff;
  GET DIAGNOSTICS deleted_default_rows = ROW_COUNT;

  IF deleted_default_rows > 0 THEN
    dropped_table := format('%I.%I rows=%s', 'public', 'GameRoundArchive_default', deleted_default_rows);
    RETURN NEXT;
  END IF;

  FOR partition IN
    WITH bounds AS (
      SELECT
        parent.relname AS parent_name,
        child_ns.nspname AS child_schema,
        child.relname AS child_name,
        (regexp_match(pg_get_expr(child.relpartbound, child.oid), $re$FROM \('([^']+)'\) TO \('([^']+)'\)$re$))[2]::timestamptz AS partition_end
      FROM pg_inherits i
      JOIN pg_class parent ON parent.oid = i.inhparent
      JOIN pg_class child ON child.oid = i.inhrelid
      JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
      WHERE parent.relname IN ('WalletTransactionArchive', 'GameRoundArchive')
        AND pg_get_expr(child.relpartbound, child.oid) <> 'DEFAULT'
    )
    SELECT child_schema, child_name
    FROM bounds
    WHERE partition_end <= cutoff
    ORDER BY
      CASE parent_name WHEN 'WalletTransactionArchive' THEN 1 ELSE 2 END,
      child_name
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.%I', partition.child_schema, partition.child_name);
    dropped_table := format('%I.%I', partition.child_schema, partition.child_name);
    RETURN NEXT;
  END LOOP;
END;
$$;

SELECT "maintenance"."ensure_archive_partitions"(48, 1);

