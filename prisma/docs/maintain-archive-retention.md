# Archive Retention Maintenance

This job keeps high-growth gameplay history tables small without changing normal application writes.

Live tables stay authoritative for gameplay:

- `GameRound`
- `WalletTransaction`

Old completed data is copied into monthly partitioned archive tables:

- `GameRoundArchive`
- `WalletTransactionArchive`

## Command

Apply database migrations before running retention for the first time:

```bash
pnpm db:migrate
```

Run one maintenance batch with defaults:

```bash
pnpm db:maintain-archive-retention
```

The command loads the same environment files used by the Prisma seed scripts:

- `apps/admin-api/.env.local`
- `apps/admin-api/.env`
- `.env.local`
- `.env`

Make sure `DATABASE_URL` points at the database you want to maintain.

Recommended first production run:

```bash
ARCHIVE_BATCH_SIZE=1000 pnpm db:maintain-archive-retention
```

Increase the batch size after checking database load:

```bash
ARCHIVE_BATCH_SIZE=5000 pnpm db:maintain-archive-retention
ARCHIVE_BATCH_SIZE=10000 pnpm db:maintain-archive-retention
```

Run with explicit production retention settings:

```bash
LIVE_RETAIN_MONTHS=12 ARCHIVE_RETAIN_MONTHS=36 ARCHIVE_BATCH_SIZE=10000 pnpm db:maintain-archive-retention
```

For an initial backlog, run the command repeatedly until it reports no more rows archived:

```bash
while true; do
  LIVE_RETAIN_MONTHS=12 ARCHIVE_RETAIN_MONTHS=36 ARCHIVE_BATCH_SIZE=5000 pnpm db:maintain-archive-retention
  sleep 10
done
```

Stop the loop when output shows:

```txt
Archived wallet transactions: 0
Archived game rounds: 0
```

Example output:

```txt
Live retention window: 12 month(s)
Archive retention window: 36 month(s)
Total retention window: 48 month(s)
Archive partition months back: 48
Archive batch size: 10000
Archived wallet transactions: 10000
Archived game rounds: 7320
No archive partitions dropped
```

## Configuration

| Variable                 |                                      Default | Meaning                                               |
| ------------------------ | -------------------------------------------: | ----------------------------------------------------- |
| `LIVE_RETAIN_MONTHS`     |                                         `12` | Months to keep in live tables.                        |
| `ARCHIVE_RETAIN_MONTHS`  |                                         `36` | Extra months to keep in archive tables.               |
| `ARCHIVE_BATCH_SIZE`     |                                      `10000` | Max wallet rows and max round rows processed per run. |
| `PARTITION_MONTHS_BACK`  | `LIVE_RETAIN_MONTHS + ARCHIVE_RETAIN_MONTHS` | Archive partitions to pre-create in the past.         |
| `PARTITION_MONTHS_AHEAD` |                                          `1` | Archive partitions to pre-create in the future.       |

Default total retention:

```txt
12 months live + 36 months archive = 48 months total
```

## What It Does

1. Creates missing monthly archive partitions.
2. Archives old wallet transactions first.
3. Deletes archived wallet transactions from live tables.
4. Archives old game rounds only after no live wallet transactions reference them.
5. Deletes archived game rounds from live tables.
6. Drops archive partitions older than the total retention window.
7. Deletes expired rows from archive default partitions if old backlog landed there.

## Safety Rules

Wallet transactions are archived only when:

- `createdAt` is older than `LIVE_RETAIN_MONTHS`
- `status` is not `PENDING`
- the linked round is old and not `ACTIVE`, or the wallet row has no `roundId`
- no live wallet transaction still references it through `reversesTransactionId`

Game rounds are archived only when:

- `createdAt` is older than `LIVE_RETAIN_MONTHS`
- `status` is not `ACTIVE` (`WON`, `LOST`, and `FAILED` are eligible once old enough)
- no live wallet transaction still references the round

`ACTIVE` is the only in-flight round status. `FAILED` rounds are terminal and store `{ "err_code": "..." }` in `outcome` for operations review before they age out of live tables.

Reversal chains are archived from leaf to root across multiple runs. This is expected.

The maintenance command uses a PostgreSQL session advisory lock, so overlapping jobs fail fast instead of running concurrently. Each maintenance step commits separately to avoid holding one long transaction across partition setup, archiving, and cleanup.

## Scheduling

For normal production operation, run hourly or nightly.

Example cron:

```cron
15 * * * * cd /srv/vfair && LIVE_RETAIN_MONTHS=12 ARCHIVE_RETAIN_MONTHS=36 ARCHIVE_BATCH_SIZE=10000 pnpm db:maintain-archive-retention >> /var/log/vfair/archive-retention.log 2>&1
```

Keep running the job until both counts become `0`:

```txt
Archived wallet transactions: 0
Archived game rounds: 0
```

## Monitoring

During rollout, monitor:

- database CPU and IO
- lock waits
- application query latency
- replication lag, if replicas exist
- job output counts

If the database is under pressure, reduce:

```bash
ARCHIVE_BATCH_SIZE=1000
```

## Important Operational Caveat

After data leaves live tables, gameplay code will not use it for live dispute handling. Choose `LIVE_RETAIN_MONTHS` to cover the maximum operational dispute and reconciliation window.

Recent `FAILED` rounds may still have a confirmed partner debit without a completed player-facing settlement. Review them manually with [wallet-reconciliation.md](./wallet-reconciliation.md) before they are archived.

## Future Parquet Export

The archive tables are monthly partitions, so they can later be exported to Parquet and dropped from PostgreSQL:

```txt
live tables -> archive partitions -> Parquet/object storage -> drop partition
```

Before dropping exported partitions, add an export manifest table with:

- partition name
- object storage path
- row count
- checksum
- exported timestamp

Only drop a PostgreSQL archive partition after the Parquet export and manifest are verified.
