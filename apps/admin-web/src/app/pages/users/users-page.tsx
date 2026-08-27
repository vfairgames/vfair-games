import { Button, Flex, Spinner } from '@radix-ui/themes';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ConfirmDeleteDialog } from '../../components/confirm-delete-dialog/confirm-delete-dialog';
import { TableFiltersPanel } from '../../components/table-filters-panel/table-filters-panel';
import { TablePagination } from '../../components/table-pagination/table-pagination';
import {
  canDeleteUser,
  UsersTable,
} from '../../components/users-table/users-table';
import {
  UsersFilters,
  type UserFiltersState,
} from '../../components/users-filters/users-filters';
import { LIST_PAGE_SIZE } from '../../constants/constants';
import { useAllPartners } from '../../hooks/use-all-partners';
import { useDebouncedSearch } from '../../hooks/use-debounced-search';
import {
  usePageQueryParam,
  usePatchSearchParams,
  useQueryParamValue,
} from '../../hooks/use-query-param';
import { usePageTitle } from '../../hooks/use-page-title';
import {
  deleteUser,
  fetchUserRoles,
  fetchUsers,
  type User,
} from '../../services/admin-api.service';
import { toast } from '../../store/toast-store';
import './users-page.scss';

const countActiveFilters = (filters: UserFiltersState) =>
  Object.values(filters).filter(Boolean).length;

export const UsersPage = () => {
  usePageTitle('Users');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = usePageQueryParam();
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const patchSearchParams = usePatchSearchParams();
  const roleId = useQueryParamValue('roleId', '');
  const partnerId = useQueryParamValue('partnerId', '');
  const filters: UserFiltersState = { roleId, partnerId };
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const { data: roles = [] } = useQuery({
    queryKey: ['user-roles'],
    queryFn: fetchUserRoles,
  });

  const { partners } = useAllPartners();
  const activeFilterCount = countActiveFilters(filters);

  const { data, isFetching } = useQuery({
    queryKey: [
      'users',
      page,
      debouncedSearch,
      filters.roleId,
      filters.partnerId,
    ],
    queryFn: () =>
      fetchUsers({
        page,
        limit: LIST_PAGE_SIZE,
        email: debouncedSearch || undefined,
        roleId: filters.roleId ? Number(filters.roleId) : undefined,
        partnerId: filters.partnerId ? Number(filters.partnerId) : undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));

  const deleteMutation = useMutation({
    mutationFn: (user: User) => deleteUser(user.id),
    onSuccess: (_data, user) => {
      toast.success(`User "${user.email}" deleted`);
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleDeleteClick = (user: User) => {
    if (!canDeleteUser(user)) {
      toast.error('Users with the ADMIN role cannot be deleted');
      return;
    }
    setDeleteTarget(user);
  };

  const handleFilterChange = <K extends keyof UserFiltersState>(
    key: K,
    value: UserFiltersState[K],
  ) => {
    patchSearchParams({
      [key]: value || null,
      page: null,
    });
  };

  return (
    <Flex direction="column" gap="4" p="4" className="users-page">
      <TableFiltersPanel
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by email…"
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        activeFilterCount={activeFilterCount}
        actions={
          <Button onClick={() => navigate('/users/new')}>Create User</Button>
        }
      >
        <UsersFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          roles={roles}
          partners={partners}
        />
      </TableFiltersPanel>

      {isFetching && !data ? (
        <Flex justify="center" py="6">
          <Spinner size="3" />
        </Flex>
      ) : (
        <UsersTable users={users} onDeleteClick={handleDeleteClick} />
      )}

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        totalLabel="user"
        onPageChange={setPage}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Delete User"
        entityName={deleteTarget?.email ?? ''}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      />
    </Flex>
  );
};
