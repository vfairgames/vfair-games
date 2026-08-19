# Keno math

Fixed payout tables. The draw comes from seeds and nonce (provably fair). Partner RTP is not used.

## How it works

1. **Picks** — choose 1–10 numbers from 1–40.
2. **Draw** — seeds and nonce shuffle 1–40; take the first 10 (sorted).
3. **Hits** — how many picks land in the draw.
4. **Payout** — `bet × multiplier[hits]` for `(pick count, risk)`.

Chance of each hit count (10 drawn from 40, no repeats):

```
P(hits = k) = C(picks, k) × C(40 − picks, 10 − k) / C(40, 10)
```

Risk changes payouts only, not hit chances. Expected return is about 99%.

## Limits

|                     |                            |
| ------------------- | -------------------------- |
| Pool                | 1–40                       |
| Draw                | 10 numbers                 |
| Picks               | 1–10                       |
| Risk                | classic, low, medium, high |
| Multiplier decimals | 2                          |

## 1 pick

Expected return: **classic** 99% · **low** 98.75% · **medium** 98.75% · **high** 99%

| Hits | Chance | Classic |   Low | Medium |  High |
| ---: | -----: | ------: | ----: | -----: | ----: |
|    0 | 75.00% |       0 |  0.7× |   0.4× |     0 |
|    1 | 25.00% |   3.96× | 1.85× |  2.75× | 3.96× |

## 2 picks

Expected return: **classic** 99.038% · **low** 98.846% · **medium** 98.654% · **high** 98.654%

| Hits | Chance | Classic |  Low | Medium |  High |
| ---: | -----: | ------: | ---: | -----: | ----: |
|    0 | 55.77% |       0 |    0 |      0 |     0 |
|    1 | 38.46% |    1.9× |   2× |   1.8× |     0 |
|    2 |  5.77% |    4.5× | 3.8× |   5.1× | 17.1× |

## 3 picks

Expected return: **classic** 99.018% · **low** 98.866% · **medium** 98.988% · **high** 98.988%

| Hits | Chance | Classic |   Low | Medium |  High |
| ---: | -----: | ------: | ----: | -----: | ----: |
|    0 | 41.09% |       0 |     0 |      0 |     0 |
|    1 | 44.03% |      1× |  1.1× |      0 |     0 |
|    2 | 13.66% |    3.1× | 1.38× |   2.8× |     0 |
|    3 |  1.21% |   10.4× |   26× |    50× | 81.5× |

## 4 picks

Expected return: **classic** 98.96% · **low** 98.922% · **medium** 98.783% · **high** 98.906%

| Hits | Chance | Classic |  Low | Medium | High |
| ---: | -----: | ------: | ---: | -----: | ---: |
|    0 | 29.99% |       0 |    0 |      0 |    0 |
|    1 | 44.42% |    0.8× |    0 |      0 |    0 |
|    2 | 21.42% |    1.8× | 2.2× |   1.7× |    0 |
|    3 |  3.94% |      5× | 7.9× |    10× |  10× |
|    4 | 0.230% |   22.5× |  90× |   100× | 259× |

## 5 picks

Expected return: **classic** 98.986% · **low** 98.903% · **medium** 98.944% · **high** 98.889%

| Hits |  Chance | Classic |  Low | Medium | High |
| ---: | ------: | ------: | ---: | -----: | ---: |
|    0 |  21.66% |       0 |    0 |      0 |    0 |
|    1 |  41.65% |   0.25× |    0 |      0 |    0 |
|    2 |  27.77% |    1.4× | 1.5× |   1.4× |    0 |
|    3 |   7.93% |    4.1× | 4.2× |     4× | 4.5× |
|    4 |  0.957% |   16.5× |  13× |    14× |  48× |
|    5 | 0.0383% |     36× | 300× |   390× | 450× |

## 6 picks

Expected return: **classic** 98.967% · **low** 99.008% · **medium** 98.835% · **high** 98.999%

| Hits |   Chance | Classic |  Low | Medium | High |
| ---: | -------: | ------: | ---: | -----: | ---: |
|    0 |   15.47% |       0 |    0 |      0 |    0 |
|    1 |   37.13% |       0 |    0 |      0 |    0 |
|    2 |   32.13% |      1× | 1.1× |      0 |    0 |
|    3 |   12.69% |   3.68× |   2× |     3× |    0 |
|    4 |    2.38% |      7× | 6.2× |     9× |  11× |
|    5 |   0.197% |   16.5× | 100× |   180× | 350× |
|    6 | 0.00547% |     40× | 700× |   710× | 710× |

## 7 picks

Expected return: **classic** 98.982% · **low** 98.939% · **medium** 98.962% · **high** 98.962%

| Hits |    Chance | Classic |  Low | Medium | High |
| ---: | --------: | ------: | ---: | -----: | ---: |
|    0 |    10.92% |       0 |    0 |      0 |    0 |
|    1 |    31.85% |       0 |    0 |      0 |    0 |
|    2 |    34.40% |   0.47× | 1.1× |      0 |    0 |
|    3 |    17.64% |      3× | 1.6× |     2× |    0 |
|    4 |     4.57% |    4.5× | 3.5× |     7× |   7× |
|    5 |    0.588% |     14× |  15× |    30× |  90× |
|    6 |   0.0338% |     31× | 225× |   400× | 400× |
|    7 | 0.000644% |     60× | 700× |   800× | 800× |

## 8 picks

Expected return: **classic** 99.023% · **low** 99.004% · **medium** 98.924% · **high** 98.957%

| Hits |    Chance | Classic |  Low | Medium | High |
| ---: | --------: | ------: | ---: | -----: | ---: |
|    0 |     7.61% |       0 |    0 |      0 |    0 |
|    1 |    26.47% |       0 |    0 |      0 |    0 |
|    2 |    34.74% |       0 | 1.1× |      0 |    0 |
|    3 |    22.24% |    2.2× | 1.5× |     2× |    0 |
|    4 |     7.48% |      4× |   2× |     4× |   5× |
|    5 |     1.33% |     13× | 5.5× |    11× |  20× |
|    6 |    0.119% |     22× |  39× |    67× | 270× |
|    7 |  0.00468% |     55× | 100× |   400× | 600× |
|    8 | 5.851e-5% |     70× | 800× |   900× | 900× |

## 9 picks

Expected return: **classic** 98.975% · **low** 99.069% · **medium** 98.942% · **high** 98.964%

| Hits |    Chance | Classic |   Low | Medium |  High |
| ---: | --------: | ------: | ----: | -----: | ----: |
|    0 |     5.23% |       0 |     0 |      0 |     0 |
|    1 |    21.40% |       0 |     0 |      0 |     0 |
|    2 |    33.50% |       0 |  1.1× |      0 |     0 |
|    3 |    26.06% |   1.55× |  1.3× |     2× |     0 |
|    4 |    10.94% |      3× |  1.7× |   2.5× |    4× |
|    5 |     2.53% |      8× |  2.5× |     5× |   11× |
|    6 |    0.312% |     15× |  7.5× |    15× |   56× |
|    7 |   0.0191% |     44× |   50× |   100× |  500× |
|    8 | 0.000494% |     60× |  250× |   500× |  800× |
|    9 | 3.657e-6% |     85× | 1000× |  1000× | 1000× |

## 10 picks

Expected return: **classic** 99.037% · **low** 98.76% · **medium** 98.974% · **high** 99.008%

| Hits |    Chance | Classic |   Low | Medium |  High |
| ---: | --------: | ------: | ----: | -----: | ----: |
|    0 |     3.54% |       0 |     0 |      0 |     0 |
|    1 |    16.88% |       0 |     0 |      0 |     0 |
|    2 |    31.07% |       0 |  1.1× |      0 |     0 |
|    3 |    28.82% |    1.4× |  1.2× |   1.6× |     0 |
|    4 |    14.71% |   2.25× |  1.3× |     2× |  3.5× |
|    5 |     4.24% |    4.5× |  1.8× |     4× |    8× |
|    6 |    0.679% |      8× |  3.5× |     7× |   13× |
|    7 |   0.0575% |     17× |   13× |    26× |   63× |
|    8 |  0.00231% |     50× |   50× |   100× |  500× |
|    9 | 3.539e-5% |     80× |  250× |   500× |  800× |
|   10 | 1.180e-7% |    100× | 1000× |  1000× | 1000× |

## Files

- `keno-reference-paytables.ts` — payout tables
- `keno-multipliers.ts` — table lookup
- `keno-probability.ts` — hit chances and expected return
- `keno-math.ts` — odds, validation, hit counting
- `keno-provably-fair.ts` — draw and verify
- `keno-constants.ts` — pool, draw size, picks, risks
