import { CaretRightIcon } from '@phosphor-icons/react';
import { Badge, Button, Flex, Spinner, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { useMemo, useState } from 'react';

import { formatCurrency } from '@vfair/app-common';
import type { MinesBetResult } from '@vfair/game-contracts';
import {
  formatBetHistoryDate,
  useMainStore,
  useTranslation,
} from '@vfair/games-web-shell';

import { useMinesBetHistory } from '../../query/use-mines-bet-history';
import { MinesBetHistoryDetail } from '../mines-bet-history-detail/mines-bet-history-detail';

import './mines-bet-history-tab.scss';

type MinesBetHistoryRowProps = {
  result: MinesBetResult;
  onSelect: (result: MinesBetResult) => void;
};

const MinesBetHistoryRow = ({ result, onSelect }: MinesBetHistoryRowProps) => {
  const { t } = useTranslation();
  const isDemo = useMainStore((state) => state.isDemo);
  const isWon = result.status === 'won';
  const isActive = result.status === 'active';
  const { date, time } = formatBetHistoryDate(result.createdAt);
  const currencyOptions = {
    currency: result.currency.code,
    decimals: result.currency.decimals,
  };
  const formattedBetAmount = formatCurrency(result.betAmount, currencyOptions);
  const formattedCashOut = formatCurrency(result.cashOut, currencyOptions);

  return (
    <div
      className="mines-bet-history-tab__row"
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
      <Flex className="mines-bet-history-tab__date" direction="column" gap="1">
        <Text className="mines-bet-history-tab__date-line" size="1">
          {date}
        </Text>
        <Text
          className="mines-bet-history-tab__date-line mines-bet-history-tab__date-line--muted"
          size="1"
        >
          {time}
        </Text>
      </Flex>

      <Text
        className="mines-bet-history-tab__bet"
        size="2"
        weight="medium"
        role="cell"
      >
        {formattedBetAmount}
      </Text>

      <Flex
        align="center"
        className="mines-bet-history-tab__cash-out"
        gap="1"
        justify="end"
        role="cell"
      >
        {isActive ? (
          <Badge color="blue" size="1" variant="soft">
            {t('minesBetHistoryInProgress')}
          </Badge>
        ) : (
          <>
            <Text
              className={clsx(
                'mines-bet-history-tab__cash-out-amount',
                isWon
                  ? 'mines-bet-history-tab__cash-out-amount--won'
                  : 'mines-bet-history-tab__cash-out-amount--lost',
              )}
              size="2"
              weight="medium"
            >
              {formattedCashOut}
            </Text>
            <Text
              className={clsx(
                'mines-bet-history-tab__multiplier',
                isWon
                  ? 'mines-bet-history-tab__multiplier--won'
                  : 'mines-bet-history-tab__multiplier--lost',
              )}
              size="2"
              weight="medium"
            >
              {result.gameData.multiplier}x
            </Text>
          </>
        )}
        {isDemo ? (
          <Text className="mines-bet-history-tab__demo-tag" size="1">
            {t('shellDemo')}
          </Text>
        ) : null}
        <CaretRightIcon
          aria-hidden
          className="mines-bet-history-tab__chevron"
          size={12}
          weight="bold"
        />
      </Flex>
    </div>
  );
};

export const MinesBetHistoryTab = () => {
  const { t } = useTranslation();
  const [selectedResult, setSelectedResult] = useState<MinesBetResult | null>(
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
  } = useMinesBetHistory();
  const betResults = useMemo(
    () => (data?.pages.flatMap((page) => page.items) ?? []) as MinesBetResult[],
    [data],
  );

  if (selectedResult) {
    return (
      <MinesBetHistoryDetail
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
      className="mines-bet-history-tab"
      role="table"
    >
      <div className="mines-bet-history-tab__header" role="row">
        <Text
          className="mines-bet-history-tab__header-cell"
          role="columnheader"
          size="1"
        >
          {t('minesBetHistoryDate')}
        </Text>
        <Text
          className="mines-bet-history-tab__header-cell mines-bet-history-tab__header-cell--bet"
          role="columnheader"
          size="1"
        >
          {t('minesBetHistoryBet')}
        </Text>
        <Text
          className="mines-bet-history-tab__header-cell mines-bet-history-tab__header-cell--cash-out"
          role="columnheader"
          size="1"
        >
          {t('minesBetHistoryCashOut')}
        </Text>
      </div>

      <div className="mines-bet-history-tab__body" role="rowgroup">
        {betResults.map((result) => (
          <MinesBetHistoryRow
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
