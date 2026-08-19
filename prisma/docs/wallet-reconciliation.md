# Wallet Reconciliation

Bets create an `ACTIVE` round and a `PENDING` DEBIT wallet transaction in one database transaction before calling the partner. A successful partner debit updates that transaction to `CONFIRMED`. Winning rounds similarly create a `PENDING` CREDIT transaction before partner credit and update it to `CONFIRMED` afterward. Partner-call or confirmation failures best-effort update the pending transaction to `FAILED`. When something goes wrong after the round row exists, the API updates that same round to `FAILED` and stores failure context in `outcome`:

```json
{
  "gameMode": "rollUnder",
  "sliderValue": 50,
  "multiplier": 1.96,
  "winChance": 50,
  "err_code": "partner_wallet_error",
  "message": "{\"message\":\"Request failed with status code 502\",\"status\":502}",
  "failure_stage": "debit"
}
```

`failure_stage` is one of `debit`, `settle`, or `credit`.

`outcome.err_code` is the games-api / client error code (for example `partner_wallet_error`, `bet_failed`), not a partner-specific wallet code. Partner HTTP details may appear in `outcome.message`. Triage by `failure_stage`, local wallet rows, and the deterministic wallet `requestId` against the partner — not by expecting a partner `err_code` in `outcome`.

`FAILED` rounds are internal. They are excluded from bet history and partner round APIs, but they remain in live tables for operations until archive retention moves them out.

The gameplay API does not reverse or recover partner wallet state automatically. Handle mismatches manually.

Round create constraint violations (duplicate `requestId`, an existing `ACTIVE` round, or nonce collision) return `round_create_conflict` and do not create a second round.

## When a round becomes `FAILED`

| Situation                                                          | Round state                    | Wallet rows                        |
| ------------------------------------------------------------------ | ------------------------------ | ---------------------------------- |
| Partner debit or DEBIT confirmation failed                         | Same round updated to `FAILED` | DEBIT `FAILED`                     |
| Settlement failed after debit                                      | Same round updated to `FAILED` | DEBIT `CONFIRMED`                  |
| Win credit or CREDIT confirmation failed after settlement as `WON` | Same round updated to `FAILED` | DEBIT `CONFIRMED`, CREDIT `FAILED` |

The client always receives an error. The database keeps the failed attempt for manual review.

## Find failed rounds

```sql
SELECT
  gr."id" AS "roundId",
  gr."partnerId",
  gr."playerId",
  gr."requestId" AS "roundRequestId",
  gr."status" AS "roundStatus",
  gr."outcome" ->> 'err_code' AS "errCode",
  gr."outcome" ->> 'failure_stage' AS "failureStage",
  gr."settledAt",
  wt."id" AS "walletTransactionId",
  wt."requestId" AS "walletRequestId",
  wt."status" AS "walletStatus",
  wt."partnerTransactionId",
  wt."amount",
  wt."createdAt"
FROM "GameRound" gr
JOIN "WalletTransaction" wt
  ON wt."roundId" = gr."id"
WHERE gr."status" = 'FAILED'
ORDER BY gr."createdAt" DESC, gr."id" DESC;
```

Filter by failure stage:

```sql
AND gr."outcome" ->> 'failure_stage' = 'credit'
```

## Manual review

1. Read `outcome.failure_stage` (and optionally `outcome.err_code` / `outcome.message`) on the `FAILED` round.
2. Inspect the relevant DEBIT or CREDIT wallet transaction and use `walletRequestId` to check partner wallet state. Request IDs are deterministic: `<externalPlayerId>:<roundRequestId>:bet|win`.
3. Compare partner records with the local wallet row and resolve any mismatch outside the gameplay API.

## Related retention rules

Archive retention only moves old terminal rounds out of live tables. See [maintain-archive-retention.md](./maintain-archive-retention.md):

- `ACTIVE` rounds are never archived.
- `FAILED` rounds are archived once they are old enough and no live wallet rows still reference them.

Keep `LIVE_RETAIN_MONTHS` long enough to investigate failed bets before they leave live tables.
