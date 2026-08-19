import { CaretRightIcon } from '@phosphor-icons/react';
import { Button, Flex, Spinner, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { useMemo, useState } from 'react';

import type { KenoBetResult } from '@vfair/game-contracts';
import { useTranslation } from '@vfair/games-web-shell';

import { useKenoBetHistory } from '../../query/use-keno-bet-history';
import { useKenoBetResultDisplay } from '../../use-keno-bet-result-display';
import { KenoBetHistoryDetail } from '../keno-bet-history-detail/keno-bet-history-detail';

import './keno-bet-history-tab.scss';

type KenoBetHistoryRowProps = {
  result: KenoBetResult;
  onSelect: (result: KenoBetResult) => void;
};

const KenoBetHistoryRow = ({ result, onSelect }: KenoBetHistoryRowProps) => {
  const { t } = useTranslation();
  const { isDemo, isWon, date, time, formattedBetAmount, formattedCashOut } =
    useKenoBetResultDisplay(result);

  return (
    <div
      className="keno-bet-history-tab__row"
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
      <Flex className="keno-bet-history-tab__date" direction="column" gap="1">
        <Text className="keno-bet-history-tab__date-line" size="1">
          {date}
        </Text>
        <Text
          className="keno-bet-history-tab__date-line keno-bet-history-tab__date-line--muted"
          size="1"
        >
          {time}
        </Text>
      </Flex>

      <Text
        className="keno-bet-history-tab__bet"
        role="cell"
        size="2"
        weight="medium"
      >
        {formattedBetAmount}
      </Text>

      <Flex
        align="center"
        className="keno-bet-history-tab__cash-out"
        gap="1"
        justify="end"
        role="cell"
      >
        <Text
          className={clsx(
            'keno-bet-history-tab__cash-out-amount',
            isWon
              ? 'keno-bet-history-tab__cash-out-amount--won'
              : 'keno-bet-history-tab__cash-out-amount--lost',
          )}
          size="2"
          weight="medium"
        >
          {formattedCashOut}
        </Text>
        <Text
          className={clsx(
            'keno-bet-history-tab__multiplier',
            isWon
              ? 'keno-bet-history-tab__multiplier--won'
              : 'keno-bet-history-tab__multiplier--lost',
          )}
          size="2"
          weight="medium"
        >
          {Number(result.gameData.multiplier.toFixed(2))}x
        </Text>
        {isDemo ? (
          <Text className="keno-bet-history-tab__demo-tag" size="1">
            {t('shellDemo')}
          </Text>
        ) : null}
        <CaretRightIcon
          aria-hidden
          className="keno-bet-history-tab__chevron"
          size={12}
          weight="bold"
        />
      </Flex>
    </div>
  );
};

export const KenoBetHistoryTab = () => {
  const { t } = useTranslation();
  const [selectedResult, setSelectedResult] = useState<KenoBetResult | null>(
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
  } = useKenoBetHistory();
  const betResults = useMemo(
    () => (data?.pages.flatMap((page) => page.items) ?? []) as KenoBetResult[],
    [data],
  );

  if (selectedResult) {
    return (
      <KenoBetHistoryDetail
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
        <Text color="gray" size="2">
          {error instanceof Error ? error.message : t('shellNoBetHistoryYet')}
        </Text>
      </Flex>
    );
  }

  if (betResults.length === 0) {
    return (
      <Flex align="center" justify="center" py="8">
        <Text color="gray" size="2">
          {t('shellNoBetHistoryYet')}
        </Text>
      </Flex>
    );
  }

  return (
    <div
      aria-label={t('shellBetHistory')}
      className="keno-bet-history-tab"
      role="table"
    >
      <div className="keno-bet-history-tab__header" role="row">
        <Text
          className="keno-bet-history-tab__header-cell"
          role="columnheader"
          size="1"
        >
          {t('kenoBetHistoryDate')}
        </Text>
        <Text
          className="keno-bet-history-tab__header-cell keno-bet-history-tab__header-cell--bet"
          role="columnheader"
          size="1"
        >
          {t('kenoBetHistoryBet')}
        </Text>
        <Text
          className="keno-bet-history-tab__header-cell keno-bet-history-tab__header-cell--cash-out"
          role="columnheader"
          size="1"
        >
          {t('kenoBetHistoryCashOut')}
        </Text>
      </div>

      <div className="keno-bet-history-tab__body" role="rowgroup">
        {betResults.map((result) => (
          <KenoBetHistoryRow
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
            size="2"
            variant="soft"
            onClick={() => {
              void fetchNextPage();
            }}
          >
            {isFetchingNextPage ? <Spinner size="1" /> : t('shellLoadMore')}
          </Button>
        </Flex>
      ) : null}
    </div>
  );
};
