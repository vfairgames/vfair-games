import { Badge, Flex, IconButton, Table, Text } from '@radix-ui/themes';
import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../services/admin-api.service';
import { formatDateTime, formatShortDate } from '../../utils/format-date';
import './users-table.scss';

export const canDeleteUser = (user: User) => user.role.name !== 'ADMIN';

type UsersTableProps = {
  users: User[];
  showDelete?: boolean;
  emptyMessage?: string;
  onDeleteClick?: (user: User) => void;
};

export const UsersTable = ({
  users,
  showDelete = true,
  emptyMessage = 'No users found.',
  onDeleteClick,
}: UsersTableProps) => {
  const navigate = useNavigate();

  return (
    <Table.Root variant="surface" className="users-table">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Partner</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Last Access</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell className="users-table__actions-col">
            Actions
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {users.length === 0 ? (
          <Table.Row>
            <Table.Cell colSpan={6}>
              <Text size="2" color="gray">
                {emptyMessage}
              </Text>
            </Table.Cell>
          </Table.Row>
        ) : (
          users.map((user) => (
            <Table.Row
              key={user.id}
              className="users-table__row"
              onClick={() => navigate(`/users/${user.id}/edit`)}
            >
              <Table.Cell>{user.email}</Table.Cell>
              <Table.Cell>
                <Badge
                  color={user.role.name === 'ADMIN' ? 'blue' : 'green'}
                  variant="soft"
                >
                  {user.role.name}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Text size="2" color={user.partner ? undefined : 'gray'}>
                  {user.partner?.name ?? '—'}
                </Text>
              </Table.Cell>
              <Table.Cell>{formatShortDate(user.createdAt)}</Table.Cell>
              <Table.Cell>
                <Text size="2" color={user.lastAccessAt ? undefined : 'gray'}>
                  {user.lastAccessAt ? formatDateTime(user.lastAccessAt) : '—'}
                </Text>
              </Table.Cell>
              <Table.Cell
                className="users-table__actions-col"
                onClick={(event) => event.stopPropagation()}
              >
                <Flex gap="2" justify="end">
                  <IconButton
                    variant="ghost"
                    size="1"
                    onClick={() => navigate(`/users/${user.id}/edit`)}
                    aria-label="Edit user"
                  >
                    <PencilSimpleIcon size={16} />
                  </IconButton>
                  {showDelete && onDeleteClick && (
                    <IconButton
                      variant="ghost"
                      size="1"
                      color="red"
                      onClick={() => onDeleteClick(user)}
                      aria-label="Delete user"
                    >
                      <TrashIcon size={16} />
                    </IconButton>
                  )}
                </Flex>
              </Table.Cell>
            </Table.Row>
          ))
        )}
      </Table.Body>
    </Table.Root>
  );
};
