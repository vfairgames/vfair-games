import {
  Callout,
  Card,
  Flex,
  Spinner,
  Tabs,
  Text,
  TextField,
} from '@radix-ui/themes';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { FormPageHeader } from '../../components/form-page-header/form-page-header';
import { PlayerBetHistory } from '../../components/player-bet-history/player-bet-history';
import { PlayerReports } from '../../components/player-reports/player-reports';
import { PlayerTransactions } from '../../components/player-transactions/player-transactions';
import { useAuthStore } from '../../auth/auth-store';
import { useTabQueryParam } from '../../hooks/use-query-param';
import { usePageTitle } from '../../hooks/use-page-title';
import { fetchPlayer } from '../../services/admin-api.service';
import { useRouteIdParam } from '../../hooks/use-route-id-param';
import { formatDateTime } from '../../utils/format-date';
import './edit-player-page.scss';

type EditPlayerTab = 'details' | 'reports' | 'bet-history' | 'transactions';

const EDIT_PLAYER_TABS = [
  'details',
  'reports',
  'bet-history',
  'transactions',
] as const satisfies readonly EditPlayerTab[];

const isAdminUser = (role: string | undefined) => role === 'ADMIN';

export const EditPlayerPage = () => {
  const playerId = useRouteIdParam();
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = isAdminUser(role);
  const [activeTab] = useTabQueryParam('details', EDIT_PLAYER_TABS);
  const [, setSearchParams] = useSearchParams();

  const handleTabChange = (value: string) => {
    const tab = value as EditPlayerTab;
    setSearchParams(tab === 'details' ? {} : { tab }, { replace: true });
  };

  const {
    data: player,
    isLoading,
    isError: loadFailed,
  } = useQuery({
    queryKey: ['player', playerId],
    queryFn: () => {
      if (playerId === null) {
        throw new Error('Invalid player id');
      }
      return fetchPlayer(playerId);
    },
    enabled: playerId !== null,
    staleTime: Infinity,
  });

  usePageTitle(player?.externalId ? `Player · ${player.externalId}` : 'Player');

  if (playerId === null) {
    return (
      <Flex direction="column" gap="4" p="4">
        <Callout.Root color="red">
          <Callout.Text>Invalid player id.</Callout.Text>
        </Callout.Root>
      </Flex>
    );
  }

  if (isLoading) {
    return (
      <Flex justify="center" py="8">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (loadFailed || !player) {
    return (
      <Flex direction="column" gap="4" p="4">
        <FormPageHeader backLabel="Players" />
        <Callout.Root color="red">
          <Callout.Text>Failed to load player.</Callout.Text>
        </Callout.Root>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4" p="4" className="edit-player-page">
      <FormPageHeader backLabel="Players" />

      <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
        <Tabs.List>
          <Tabs.Trigger value="details">Details</Tabs.Trigger>
          <Tabs.Trigger value="reports">Reports</Tabs.Trigger>
          <Tabs.Trigger value="bet-history">Bet History</Tabs.Trigger>
          <Tabs.Trigger value="transactions">Transactions</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="details">
          <Card mt="4">
            <Flex direction="column" gap="4" p="4">
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">
                  ID
                </Text>
                <TextField.Root readOnly value={String(player.id)} />
              </Flex>

              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">
                  External ID
                </Text>
                <TextField.Root readOnly value={player.externalId} />
              </Flex>

              {isAdmin ? (
                <Flex direction="column" gap="1">
                  <Text size="2" weight="medium">
                    Partner
                  </Text>
                  <TextField.Root readOnly value={player.partner.name} />
                </Flex>
              ) : null}

              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">
                  Created At
                </Text>
                <TextField.Root
                  readOnly
                  value={formatDateTime(player.createdAt)}
                />
              </Flex>
            </Flex>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="reports">
          <Card mt="4">
            <Flex direction="column" p="4">
              <PlayerReports playerId={player.id} />
            </Flex>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="bet-history">
          <Card mt="4">
            <Flex direction="column" p="4">
              <PlayerBetHistory playerId={player.id} />
            </Flex>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="transactions">
          <Card mt="4">
            <Flex direction="column" p="4">
              <PlayerTransactions playerId={player.id} />
            </Flex>
          </Card>
        </Tabs.Content>
      </Tabs.Root>
    </Flex>
  );
};
