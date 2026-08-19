import {
  Button,
  Flex,
  IconButton,
  Spinner,
  Table,
  Text,
} from '@radix-ui/themes';
import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ConfirmDeleteDialog } from '../../components/confirm-delete-dialog/confirm-delete-dialog';
import { TableFiltersPanel } from '../../components/table-filters-panel/table-filters-panel';
import { TablePagination } from '../../components/table-pagination/table-pagination';
import { LIST_PAGE_SIZE } from '../../constants/constants';
import { useDebouncedSearch } from '../../hooks/use-debounced-search';
import { usePageQueryParam } from '../../hooks/use-query-param';
import { usePageTitle } from '../../hooks/use-page-title';
import {
  deletePartner,
  fetchPartners,
  type Partner,
} from '../../services/admin-api.service';
import { formatShortDate } from '../../utils/format-date';
import { toast } from '../../store/toast-store';
import './partners-page.scss';

const canDeletePartner = (partner: Partner) => (partner.usersCount ?? 0) === 0;

export const PartnersPage = () => {
  usePageTitle('Partners');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = usePageQueryParam();
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['partners', page, debouncedSearch],
    queryFn: () =>
      fetchPartners({
        page,
        limit: LIST_PAGE_SIZE,
        name: debouncedSearch || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const partners = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePartner(id),
    onSuccess: () => {
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });

  const handleDeleteClick = (partner: Partner) => {
    if (!canDeletePartner(partner)) {
      toast.error('Partners with assigned users cannot be deleted');
      return;
    }
    setDeleteTarget(partner);
  };

  return (
    <Flex direction="column" gap="4" p="4" className="partners-page">
      <TableFiltersPanel
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name…"
        showFilterToggle={false}
        actions={
          <Button onClick={() => navigate('/partners/new')}>
            Create Partner
          </Button>
        }
      />

      {isFetching && !data ? (
        <Flex justify="center" py="6">
          <Spinner size="3" />
        </Flex>
      ) : (
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Users</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Updated At</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell className="partners-page__actions-col">
                Actions
              </Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {partners.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={5}>
                  <Text size="2" color="gray">
                    No partners found.
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              partners.map((partner) => (
                <Table.Row
                  key={partner.id}
                  className="partners-page__row"
                  onClick={() => navigate(`/partners/${partner.id}/edit`)}
                >
                  <Table.Cell>{partner.name}</Table.Cell>
                  <Table.Cell>{partner.usersCount ?? 0}</Table.Cell>
                  <Table.Cell>{formatShortDate(partner.createdAt)}</Table.Cell>
                  <Table.Cell>{formatShortDate(partner.updatedAt)}</Table.Cell>
                  <Table.Cell
                    className="partners-page__actions-col"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Flex gap="2" justify="end">
                      <IconButton
                        variant="ghost"
                        size="1"
                        onClick={() => navigate(`/partners/${partner.id}/edit`)}
                        aria-label="Edit partner"
                      >
                        <PencilSimpleIcon size={16} />
                      </IconButton>
                      <IconButton
                        variant="ghost"
                        size="1"
                        color="red"
                        onClick={() => handleDeleteClick(partner)}
                        aria-label="Delete partner"
                      >
                        <TrashIcon size={16} />
                      </IconButton>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      )}

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        totalLabel="partner"
        onPageChange={setPage}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Delete Partner"
        entityName={deleteTarget?.name ?? ''}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </Flex>
  );
};
