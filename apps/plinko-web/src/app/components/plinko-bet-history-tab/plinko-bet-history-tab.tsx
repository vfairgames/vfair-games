import { CaretRightIcon } from '@phosphor-icons/react';
import { Button, Flex, Spinner, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { useMemo, useState } from 'react';

import type { PlinkoBetResult } from '@vfair/game-contracts';
import { useTranslation } from '@vfair/games-web-shell';

import { usePlinkoBetHistory } from '../../query/use-plinko-bet-history';
import { usePlinkoGameStore } from '../../store/plinko-game-store';
import { usePlinkoBetResultDisplay } from '../../use-plinko-bet-result-display';
import { PlinkoBetHistoryDetail } from '../plinko-bet-history-detail/plinko-bet-history-detail';

import './plinko-bet-history-tab.scss';

type PlinkoBetHistoryRowProps = {
  result: PlinkoBetResult;
  onSelect: (result: PlinkoBetResult) => void;
};

const PlinkoBetHistoryRow = ({
  result,
  onSelect,
}: PlinkoBetHistoryRowProps) => {
  const { t } = useTranslation();
  const { isDemo, isWon, date, time, formattedBetAmount, formattedCashOut } =
    usePlinkoBetResultDisplay(result);

  return (
    <div
      className="plinko-bet-history-tab__row"
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
      <Flex className="plinko-bet-history-tab__date" direction="column" gap="1">
        <Text className="plinko-bet-history-tab__date-line" size="1">
          {date}
        </Text>
        <Text
          className="plinko-bet-history-tab__date-line plinko-bet-history-tab__date-line--muted"
          size="1"
        >
          {time}
        </Text>
      </Flex>

      <Text
        className="plinko-bet-history-tab__bet"
        role="cell"
        size="2"
        weight="medium"
      >
        {formattedBetAmount}
      </Text>

      <Flex
        align="center"
        className="plinko-bet-history-tab__cash-out"
        gap="1"
        justify="end"
        role="cell"
      >
        <Text
          className={clsx(
            'plinko-bet-history-tab__cash-out-amount',
            isWon
              ? 'plinko-bet-history-tab__cash-out-amount--won'
              : 'plinko-bet-history-tab__cash-out-amount--lost',
          )}
          size="2"
          weight="medium"
        >
          {formattedCashOut}
        </Text>
        <Text
          className={clsx(
            'plinko-bet-history-tab__multiplier',
            isWon
              ? 'plinko-bet-history-tab__multiplier--won'
              : 'plinko-bet-history-tab__multiplier--lost',
          )}
          size="2"
          weight="medium"
        >
          {Number(result.gameData.multiplier.toFixed(2))}x
        </Text>
        {isDemo ? (
          <Text className="plinko-bet-history-tab__demo-tag" size="1">
            {t('shellDemo')}
          </Text>
        ) : null}
        <CaretRightIcon
          aria-hidden
          className="plinko-bet-history-tab__chevron"
          size={12}
          weight="bold"
        />
      </Flex>
    </div>
  );
};

export const PlinkoBetHistoryTab = () => {
  const { t } = useTranslation();
  const [selectedResult, setSelectedResult] = useState<PlinkoBetResult | null>(
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
  } = usePlinkoBetHistory();
  const inFlightDrops = usePlinkoGameStore((state) => state.drops);
  const betResults = useMemo(() => {
    const inFlightIds = new Set(inFlightDrops.map((drop) => drop.id));

    return (data?.pages.flatMap((page) => page.items) ?? []).filter(
      (result) => !inFlightIds.has(result.id),
    ) as PlinkoBetResult[];
  }, [data, inFlightDrops]);

  if (selectedResult) {
    return (
      <PlinkoBetHistoryDetail
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
      className="plinko-bet-history-tab"
      role="table"
    >
      <div className="plinko-bet-history-tab__header" role="row">
        <Text
          className="plinko-bet-history-tab__header-cell"
          role="columnheader"
          size="1"
        >
          {t('plinkoBetHistoryDate')}
        </Text>
        <Text
          className="plinko-bet-history-tab__header-cell plinko-bet-history-tab__header-cell--bet"
          role="columnheader"
          size="1"
        >
          {t('plinkoBetHistoryBet')}
        </Text>
        <Text
          className="plinko-bet-history-tab__header-cell plinko-bet-history-tab__header-cell--cash-out"
          role="columnheader"
          size="1"
        >
          {t('plinkoBetHistoryCashOut')}
        </Text>
      </div>

      <div className="plinko-bet-history-tab__body" role="rowgroup">
        {betResults.map((result) => (
          <PlinkoBetHistoryRow
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
