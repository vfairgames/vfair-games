import { Callout, Flex, IconButton, Spinner } from '@radix-ui/themes';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react';
import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  usePatchSearchParams,
  useQueryParamValue,
} from '../../hooks/use-query-param';
import {
  fetchPlayerCurrencies,
  fetchPlayerKpi,
} from '../../services/admin-api.service';
import {
  dateRangeForLastDays,
  isDateRangeOrdered,
} from '../../utils/format-date';
import { KpiReportPanel } from '../kpi-report-panel/kpi-report-panel';
import { KpiUtcCallout } from '../kpi-utc-callout/kpi-utc-callout';
import { PlayerReportsFilters } from '../player-reports-filters/player-reports-filters';
import './player-reports.scss';

type PlayerReportsProps = {
  playerId: number;
};

export const PlayerReports = ({ playerId }: PlayerReportsProps) => {
  const patchSearchParams = usePatchSearchParams();
  const currency = useQueryParamValue('currency', '');
  const dateFrom = useQueryParamValue('dateFrom', '');
  const dateTo = useQueryParamValue('dateTo', '');
  const dateRangeValid = isDateRangeOrdered(dateFrom, dateTo);

  const { data: currencies = [], isLoading: currenciesLoading } = useQuery({
    queryKey: ['player-currencies', playerId],
    queryFn: () => fetchPlayerCurrencies(playerId),
    staleTime: Infinity,
  });

  useEffect(() => {
    const patch: Record<string, string | null> = {};

    if (!dateFrom || !dateTo) {
      const defaults = dateRangeForLastDays(30);
      if (!dateFrom) {
        patch.dateFrom = defaults.dateFrom;
      }
      if (!dateTo) {
        patch.dateTo = defaults.dateTo;
      }
    }

    if (!currency && currencies.length > 0) {
      patch.currency = currencies[0].code;
    }

    if (Object.keys(patch).length > 0) {
      patchSearchParams(patch);
    }
  }, [currency, currencies, dateFrom, dateTo, patchSearchParams]);

  const hasRequiredFilters = Boolean(currency && dateRangeValid);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['player-kpi', playerId, currency, dateFrom, dateTo],
    queryFn: () =>
      fetchPlayerKpi(playerId, {
        currency,
        dateFrom,
        dateTo,
      }),
    enabled: hasRequiredFilters,
  });

  const handleFilterChange = (
    key: 'currency' | 'dateFrom' | 'dateTo',
    value: string,
  ) => {
    patchSearchParams({
      [key]: value || null,
    });
  };

  const handlePresetRange = (days: number) => {
    const range = dateRangeForLastDays(days);
    patchSearchParams({
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    });
  };

  if (currenciesLoading) {
    return (
      <Flex justify="center" py="6">
        <Spinner size="3" />
      </Flex>
    );
  }

  let content: ReactNode;

  if (dateFrom && dateTo && !dateRangeValid) {
    content = (
      <Callout.Root color="red">
        <Callout.Text>Date from must be on or before date to.</Callout.Text>
      </Callout.Root>
    );
  } else if (!hasRequiredFilters) {
    content = (
      <Callout.Root color="gray">
        <Callout.Text>
          Select a currency and date range to view reports.
        </Callout.Text>
      </Callout.Root>
    );
  } else if (isLoading || (isFetching && !data)) {
    content = (
      <Flex justify="center" py="6">
        <Spinner size="3" />
      </Flex>
    );
  } else if (isError || !data) {
    content = (
      <Callout.Root color="red">
        <Callout.Text>Failed to load player reports.</Callout.Text>
      </Callout.Root>
    );
  } else if (data.summary.totalBets === 0) {
    content = (
      <Callout.Root color="gray">
        <Callout.Text>
          No activity for {currency} in this range. Try another currency or
          widen the dates.
        </Callout.Text>
      </Callout.Root>
    );
  } else {
    content = <KpiReportPanel kpi={data} rtpLabel="Player RTP" />;
  }

  return (
    <Flex direction="column" gap="4" className="player-reports">
      <KpiUtcCallout />
      <Flex align="start" justify="between" gap="3">
        <Flex flexGrow="1" minWidth="0">
          <PlayerReportsFilters
            filters={{ currency, dateFrom, dateTo }}
            onFilterChange={handleFilterChange}
            onPresetRange={handlePresetRange}
            currencies={currencies}
          />
        </Flex>
        <IconButton
          size="2"
          variant="soft"
          color="gray"
          aria-label="Reload reports"
          disabled={!hasRequiredFilters || isFetching}
          loading={isFetching && !!data}
          onClick={() => {
            void refetch();
          }}
        >
          <ArrowsClockwiseIcon size={16} />
        </IconButton>
      </Flex>
      {content}
    </Flex>
  );
};
