import { Badge, Flex, Spinner, Table, Text } from '@radix-ui/themes';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { TablePagination } from '../table-pagination/table-pagination';
import { LIST_PAGE_SIZE } from '../../constants/constants';
import { usePageQueryParam } from '../../hooks/use-query-param';
import { fetchUserSignIns } from '../../services/admin-api.service';
import { formatDateTime } from '../../utils/format-date';
import './user-sign-in-history.scss';

type UserSignInHistoryProps = {
  userId: number;
};

export const UserSignInHistory = ({ userId }: UserSignInHistoryProps) => {
  const [page, setPage] = usePageQueryParam();

  const { data, isFetching } = useQuery({
    queryKey: ['user-sign-ins', userId, page],
    queryFn: () => fetchUserSignIns(userId, { page, limit: LIST_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const signIns = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));

  if (isFetching && !data) {
    return (
      <Flex justify="center" py="6">
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4" className="user-sign-in-history">
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>IP address</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>User agent</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {signIns.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={4}>
                <Text size="2" color="gray">
                  No sign-in attempts recorded.
                </Text>
              </Table.Cell>
            </Table.Row>
          ) : (
            signIns.map((signIn) => (
              <Table.Row key={signIn.id}>
                <Table.Cell>{formatDateTime(signIn.createdAt)}</Table.Cell>
                <Table.Cell>
                  <Text size="2" color={signIn.ipAddress ? undefined : 'gray'}>
                    {signIn.ipAddress ?? '—'}
                  </Text>
                </Table.Cell>
                <Table.Cell className="user-sign-in-history__user-agent">
                  <Text
                    size="2"
                    color={signIn.userAgent ? undefined : 'gray'}
                    title={signIn.userAgent ?? undefined}
                  >
                    {signIn.userAgent ?? '—'}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge
                    color={signIn.success ? 'green' : 'red'}
                    variant="soft"
                  >
                    {signIn.success ? 'Success' : 'Failed'}
                  </Badge>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table.Root>

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        totalLabel="attempt"
        onPageChange={setPage}
      />
    </Flex>
  );
};
