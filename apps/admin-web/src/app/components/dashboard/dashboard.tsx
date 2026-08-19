import {
  Callout,
  Card,
  Flex,
  Grid,
  IconButton,
  Spinner,
  Text,
} from '@radix-ui/themes';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react';
import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/auth-store';
import { useAllPartners } from '../../hooks/use-all-partners';
import {
  usePatchSearchParams,
  useQueryParamValue,
} from '../../hooks/use-query-param';
import {
  fetchDashboardKpi,
  fetchDashboardMeta,
} from '../../services/admin-api.service';
import {
  dateRangeForLastDays,
  isDateRangeOrdered,
} from '../../utils/format-date';
import { DashboardFilters } from '../dashboard-filters/dashboard-filters';
import { KpiReportPanel } from '../kpi-report-panel/kpi-report-panel';
import { KpiUtcCallout } from '../kpi-utc-callout/kpi-utc-callout';
import './dashboard.scss';

const isAdminUser = (role: string | undefined) => role === 'ADMIN';

const parsePartnerIdParam = (value: string): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const isAdmin = isAdminUser(user?.role);
  const patchSearchParams = usePatchSearchParams();
  const partnerIdParam = useQueryParamValue('partnerId', '');
  const currency = useQueryParamValue('currency', '');
  const dateFrom = useQueryParamValue('dateFrom', '');
  const dateTo = useQueryParamValue('dateTo', '');
  const dateRangeValid = isDateRangeOrdered(dateFrom, dateTo);

  const resolvedPartnerId = isAdmin
    ? parsePartnerIdParam(partnerIdParam)
    : (user?.partnerId ?? undefined);

  const { partners, isLoading: partnersLoading } = useAllPartners({
    enabled: isAdmin,
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

    if (Object.keys(patch).length > 0) {
      patchSearchParams(patch);
    }
  }, [dateFrom, dateTo, patchSearchParams]);

  const {
    data: meta,
    isLoading: metaLoading,
    isError: metaError,
  } = useQuery({
    queryKey: ['dashboard-meta', resolvedPartnerId],
    queryFn: () =>
      fetchDashboardMeta({
        partnerId: isAdmin ? resolvedPartnerId : undefined,
      }),
    enabled: resolvedPartnerId != null,
  });

  useEffect(() => {
    if (!currency && meta && meta.currencies.length > 0) {
      patchSearchParams({ currency: meta.currencies[0].code });
    }
  }, [currency, meta, patchSearchParams]);

  useEffect(() => {
    if (
      currency &&
      meta &&
      meta.currencies.length > 0 &&
      !meta.currencies.some((item) => item.code === currency)
    ) {
      patchSearchParams({ currency: meta.currencies[0].code });
    }
  }, [currency, meta, patchSearchParams]);

  const hasRequiredFilters = Boolean(
    resolvedPartnerId != null && currency && dateRangeValid,
  );

  const {
    data: kpi,
    isLoading: kpiLoading,
    isError: kpiError,
    isFetching: kpiFetching,
    refetch: refetchKpi,
  } = useQuery({
    queryKey: ['dashboard-kpi', resolvedPartnerId, currency, dateFrom, dateTo],
    queryFn: () =>
      fetchDashboardKpi({
        partnerId: isAdmin ? resolvedPartnerId : undefined,
        currency,
        dateFrom,
        dateTo,
      }),
    enabled: hasRequiredFilters,
  });

  const handleFilterChange = (
    key: 'partnerId' | 'currency' | 'dateFrom' | 'dateTo',
    value: string,
  ) => {
    if (key === 'partnerId') {
      patchSearchParams({
        partnerId: value || null,
        currency: null,
      });
      return;
    }

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

  let detailContent: ReactNode;

  if (isAdmin && resolvedPartnerId == null) {
    detailContent = (
      <Callout.Root color="gray">
        <Callout.Text>Select a partner to view dashboard reports.</Callout.Text>
      </Callout.Root>
    );
  } else if (metaLoading || partnersLoading) {
    detailContent = (
      <Flex justify="center" py="6">
        <Spinner size="3" />
      </Flex>
    );
  } else if (metaError || !meta) {
    detailContent = (
      <Callout.Root color="red">
        <Callout.Text>Failed to load dashboard.</Callout.Text>
      </Callout.Root>
    );
  } else if (dateFrom && dateTo && !dateRangeValid) {
    detailContent = (
      <Callout.Root color="red">
        <Callout.Text>Date from must be on or before date to.</Callout.Text>
      </Callout.Root>
    );
  } else if (!hasRequiredFilters) {
    detailContent = (
      <Callout.Root color="gray">
        <Callout.Text>
          Select a currency and date range to view reports.
        </Callout.Text>
      </Callout.Root>
    );
  } else if (kpiLoading || (kpiFetching && !kpi)) {
    detailContent = (
      <Flex justify="center" py="6">
        <Spinner size="3" />
      </Flex>
    );
  } else if (kpiError || !kpi) {
    detailContent = (
      <Callout.Root color="red">
        <Callout.Text>Failed to load partner reports.</Callout.Text>
      </Callout.Root>
    );
  } else if (kpi.summary.totalBets === 0) {
    detailContent = (
      <Flex direction="column" gap="4">
        <Grid columns={{ initial: '1', sm: '2' }} gap="3">
          <Card>
            <Flex direction="column" gap="1" p="3">
              <Text size="2" color="gray">
                Players
              </Text>
              <Text size="5" weight="medium">
                {meta.playerCount}
              </Text>
            </Flex>
          </Card>
          <Card>
            <Flex direction="column" gap="1" p="3">
              <Text size="2" color="gray">
                Enabled games
              </Text>
              <Text size="5" weight="medium">
                {meta.enabledGameCount}
              </Text>
            </Flex>
          </Card>
        </Grid>
        <Callout.Root color="gray">
          <Callout.Text>
            No activity for {currency} in this range. Try another currency or
            widen the dates.
          </Callout.Text>
        </Callout.Root>
      </Flex>
    );
  } else {
    detailContent = (
      <KpiReportPanel
        kpi={kpi}
        rtpLabel="Realized RTP"
        columns={{ initial: '1', sm: '2', md: '4' }}
        extraCards={
          <>
            <Card>
              <Flex direction="column" gap="1" p="3">
                <Text size="2" color="gray">
                  Players
                </Text>
                <Text size="5" weight="medium">
                  {meta.playerCount}
                </Text>
              </Flex>
            </Card>
            <Card>
              <Flex direction="column" gap="1" p="3">
                <Text size="2" color="gray">
                  Enabled games
                </Text>
                <Text size="5" weight="medium">
                  {meta.enabledGameCount}
                </Text>
              </Flex>
            </Card>
          </>
        }
      />
    );
  }

  return (
    <Flex direction="column" gap="4" className="dashboard">
      <KpiUtcCallout />
      <Flex align="start" justify="between" gap="3">
        <Flex flexGrow="1" minWidth="0">
          <DashboardFilters
            filters={{
              partnerId: partnerIdParam,
              currency,
              dateFrom,
              dateTo,
            }}
            onFilterChange={handleFilterChange}
            onPresetRange={handlePresetRange}
            currencies={meta?.currencies ?? []}
            partners={partners}
            showPartnerSelect={isAdmin}
          />
        </Flex>
        <IconButton
          size="2"
          variant="soft"
          color="gray"
          aria-label="Reload dashboard"
          disabled={!hasRequiredFilters || kpiFetching}
          loading={kpiFetching && !!kpi}
          onClick={() => {
            void refetchKpi();
          }}
        >
          <ArrowsClockwiseIcon size={16} />
        </IconButton>
      </Flex>
      {detailContent}
    </Flex>
  );
};
