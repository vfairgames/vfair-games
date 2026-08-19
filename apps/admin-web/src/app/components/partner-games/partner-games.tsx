import { Button, Flex, Spinner, Switch, Table, Text } from '@radix-ui/themes';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PartnerGameConfig } from '../partner-game-config/partner-game-config';
import { isAvailableGameId } from '@vfair/game-contracts';
import {
  usePatchSearchParams,
  useQueryParamValue,
} from '../../hooks/use-query-param';
import {
  fetchPartnerGames,
  updatePartnerGame,
  type PartnerGame,
} from '../../services/admin-api.service';
import { toast } from '../../store/toast-store';

type PartnerGamesProps = {
  partnerId: number;
};

export const PartnerGames = ({ partnerId }: PartnerGamesProps) => {
  const queryClient = useQueryClient();
  const patchSearchParams = usePatchSearchParams();
  const selectedGameId = useQueryParamValue('game', '');

  const { data: games = [], isFetching } = useQuery({
    queryKey: ['partner-games', partnerId],
    queryFn: () => fetchPartnerGames(partnerId),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ gameId, enabled }: { gameId: string; enabled: boolean }) =>
      updatePartnerGame(partnerId, gameId, { enabled }),
    onMutate: async ({ gameId, enabled }) => {
      await queryClient.cancelQueries({
        queryKey: ['partner-games', partnerId],
      });

      const previousGames = queryClient.getQueryData<PartnerGame[]>([
        'partner-games',
        partnerId,
      ]);

      queryClient.setQueryData<PartnerGame[]>(
        ['partner-games', partnerId],
        (current) =>
          current?.map((game) =>
            game.gameId === gameId ? { ...game, enabled } : game,
          ) ?? current,
      );

      return { previousGames };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousGames) {
        queryClient.setQueryData(
          ['partner-games', partnerId],
          context.previousGames,
        );
      }
      toast.error('Failed to update game');
    },
    onSuccess: (updated) => {
      toast.success(
        `${updated.name} ${updated.enabled ? 'enabled' : 'disabled'}`,
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ['partner-games', partnerId],
      });
    },
  });

  const handleToggle = (game: PartnerGame, enabled: boolean) => {
    toggleMutation.mutate({ gameId: game.gameId, enabled });
  };

  const handleConfigure = (gameId: string) => {
    patchSearchParams({ tab: 'games', game: gameId });
  };

  if (selectedGameId && isAvailableGameId(selectedGameId)) {
    return <PartnerGameConfig partnerId={partnerId} gameId={selectedGameId} />;
  }

  if (isFetching && games.length === 0) {
    return (
      <Flex justify="center" py="6">
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Table.Root variant="surface">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Game</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Enabled</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {games.length === 0 ? (
          <Table.Row>
            <Table.Cell colSpan={3}>
              <Text size="2" color="gray">
                No games available.
              </Text>
            </Table.Cell>
          </Table.Row>
        ) : (
          games.map((game) => (
            <Table.Row key={game.gameId}>
              <Table.Cell>{game.name}</Table.Cell>
              <Table.Cell>
                <Switch
                  checked={game.enabled}
                  onCheckedChange={(enabled) => handleToggle(game, enabled)}
                />
              </Table.Cell>
              <Table.Cell>
                <Button
                  variant="soft"
                  size="1"
                  onClick={() => handleConfigure(game.gameId)}
                >
                  Configure
                </Button>
              </Table.Cell>
            </Table.Row>
          ))
        )}
      </Table.Body>
    </Table.Root>
  );
};
