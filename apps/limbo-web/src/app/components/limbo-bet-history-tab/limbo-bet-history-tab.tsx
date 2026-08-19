import { CaretRightIcon } from '@phosphor-icons/react';
import { Button, Flex, Spinner, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { useMemo, useState } from 'react';

import { formatCurrency } from '@vfair/app-common';
import type { LimboBetResult } from '@vfair/game-contracts';
import {
  formatBetHistoryDate,
  useMainStore,
  useTranslation,
} from '@vfair/games-web-shell';

import { useLimboBetHistory } from '../../query/use-limbo-bet-history';
import { LimboBetHistoryDetail } from '../limbo-bet-history-detail/limbo-bet-history-detail';

import './limbo-bet-history-tab.scss';

type LimboBetHistoryRowProps = {
  result: LimboBetResult;
  onSelect: (result: LimboBetResult) => void;
};

const LimboBetHistoryRow = ({ result, onSelect }: LimboBetHistoryRowProps) => {
  const { t } = useTranslation();
  const isDemo = useMainStore((state) => state.isDemo);
  const isWon = result.status === 'won';
  const { date, time } = formatBetHistoryDate(result.createdAt);
  const formattedBetAmount = useMemo(
    () =>
      formatCurrency(result.betAmount, {
        currency: result.currency.code,
        decimals: result.currency.decimals,
      }),
    [result.betAmount, result.currency],
  );
  const formattedCashOut = useMemo(
    () =>
      formatCurrency(result.cashOut, {
        currency: result.currency.code,
        decimals: result.currency.decimals,
      }),
    [result.cashOut, result.currency],
  );

  return (
    <div
      className="limbo-bet-history-tab__row"
      role="row"
      tabIndex={0}
      onClick={() => onSelect(result)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(result);
        }
      }}
    >
      <Flex className="limbo-bet-history-tab__date" direction="column" gap="1">
        <Text className="limbo-bet-history-tab__date-line" size="1">
          {date}
        </Text>
        <Text
          className="limbo-bet-history-tab__date-line limbo-bet-history-tab__date-line--muted"
          size="1"
        >
          {time}
        </Text>
      </Flex>

      <Text
        className="limbo-bet-history-tab__bet"
        size="2"
        weight="medium"
        role="cell"
      >
        {formattedBetAmount}
      </Text>

      <Flex
        align="center"
        className="limbo-bet-history-tab__cash-out"
        gap="1"
        justify="end"
        role="cell"
      >
        <Text
          className={clsx(
            'limbo-bet-history-tab__cash-out-amount',
            isWon
              ? 'limbo-bet-history-tab__cash-out-amount--won'
              : 'limbo-bet-history-tab__cash-out-amount--lost',
          )}
          size="2"
          weight="medium"
        >
          {formattedCashOut}
        </Text>
        <Text
          className={clsx(
            'limbo-bet-history-tab__multiplier',
            isWon
              ? 'limbo-bet-history-tab__multiplier--won'
              : 'limbo-bet-history-tab__multiplier--lost',
          )}
          size="2"
          weight="medium"
        >
          {result.gameData.multiplier}x
        </Text>
        {isDemo ? (
          <Text className="limbo-bet-history-tab__demo-tag" size="1">
            {t('shellDemo')}
          </Text>
        ) : null}
        <CaretRightIcon
          aria-hidden
          className="limbo-bet-history-tab__chevron"
          size={12}
          weight="bold"
        />
      </Flex>
    </div>
  );
};

export const LimboBetHistoryTab = () => {
  const { t } = useTranslation();
  const [selectedResult, setSelectedResult] = useState<LimboBetResult | null>(
    null,
  );
  const {
    data,
    isPending,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useLimboBetHistory();
  const betResults = useMemo(
    () => (data?.pages.flatMap((page) => page.items) ?? []) as LimboBetResult[],
    [data],
  );

  if (selectedResult) {
    return (
      <LimboBetHistoryDetail
        result={selectedResult}
        onBack={() => setSelectedResult(null)}
      />
    );
  }

  if (isPending) {
    return (
      <Flex align="center" justify="center" py="8">
        <Spinner size="2" />
      </Flex>
    );
  }

  if (isError) {
    return (
      <Flex align="center" justify="center" py="8">
        <Text size="2" color="gray">
          {error instanceof Error ? error.message : t('shellNoBetHistoryYet')}
        </Text>
      </Flex>
    );
  }

  if (betResults.length === 0) {
    return (
      <Flex align="center" justify="center" py="8">
        <Text size="2" color="gray">
          {t('shellNoBetHistoryYet')}
        </Text>
      </Flex>
    );
  }

  return (
    <div
      aria-label={t('shellBetHistory')}
      className="limbo-bet-history-tab"
      role="table"
    >
      <div className="limbo-bet-history-tab__header" role="row">
        <Text
          className="limbo-bet-history-tab__header-cell"
          role="columnheader"
          size="1"
        >
          {t('limboBetHistoryDate')}
        </Text>
        <Text
          className="limbo-bet-history-tab__header-cell limbo-bet-history-tab__header-cell--bet"
          role="columnheader"
          size="1"
        >
          {t('limboBetHistoryBet')}
        </Text>
        <Text
          className="limbo-bet-history-tab__header-cell limbo-bet-history-tab__header-cell--cash-out"
          role="columnheader"
          size="1"
        >
          {t('limboBetHistoryCashOut')}
        </Text>
      </div>

      <div className="limbo-bet-history-tab__body" role="rowgroup">
        {betResults.map((result) => (
          <LimboBetHistoryRow
            key={result.id}
            result={result}
            onSelect={setSelectedResult}
          />
        ))}
      </div>

      {hasNextPage ? (
        <Flex align="center" justify="center" p="3">
          <Button
            disabled={isFetchingNextPage}
            onClick={() => {
              void fetchNextPage();
            }}
            size="2"
            variant="soft"
          >
            {isFetchingNextPage ? <Spinner size="1" /> : t('shellLoadMore')}
          </Button>
        </Flex>
      ) : null}
    </div>
  );
};
