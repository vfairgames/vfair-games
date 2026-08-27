import { Button, Flex, Spinner } from '@radix-ui/themes';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { TablePagination } from '../table-pagination/table-pagination';
import { UsersTable } from '../users-table/users-table';
import { LIST_PAGE_SIZE } from '../../constants/constants';
import { usePageQueryParam } from '../../hooks/use-query-param';
import { fetchUsers } from '../../services/admin-api.service';

type PartnerUsersProps = {
  partnerId: number;
};

export const PartnerUsers = ({ partnerId }: PartnerUsersProps) => {
  const navigate = useNavigate();
  const [page, setPage] = usePageQueryParam();

  const { data, isFetching } = useQuery({
    queryKey: ['users', 'partner', partnerId, page],
    queryFn: () =>
      fetchUsers({
        page,
        limit: LIST_PAGE_SIZE,
        partnerId,
      }),
    placeholderData: keepPreviousData,
  });

  const users = data?.data ?? [];
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
    <Flex direction="column" gap="4">
      <Flex justify="end">
        <Button
          onClick={() =>
            navigate(
              `/users/new?partnerId=${encodeURIComponent(String(partnerId))}`,
            )
          }
        >
          Create User
        </Button>
      </Flex>

      <UsersTable
        users={users}
        showDelete={false}
        emptyMessage="No users assigned to this partner."
      />

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        totalLabel="user"
        onPageChange={setPage}
      />
    </Flex>
  );
};
