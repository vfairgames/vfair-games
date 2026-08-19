import { Button, Callout, Card, Flex, Spinner, Tabs } from '@radix-ui/themes';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormPageHeader } from '../../components/form-page-header/form-page-header';
import { ConfirmDeleteDialog } from '../../components/confirm-delete-dialog/confirm-delete-dialog';
import { canDeleteUser } from '../../components/users-table/users-table';
import { UserSignInHistory } from '../../components/user-sign-in-history/user-sign-in-history';
import { useAllPartners } from '../../hooks/use-all-partners';
import { useNavigateBack } from '../../hooks/use-navigate-back';
import {
  usePatchSearchParams,
  useTabQueryParam,
} from '../../hooks/use-query-param';
import { usePageTitle } from '../../hooks/use-page-title';
import {
  deleteUser,
  fetchUser,
  fetchUserRoles,
  updateUser,
} from '../../services/admin-api.service';
import { toast } from '../../store/toast-store';
import { useRouteIdParam } from '../../hooks/use-route-id-param';
import { UserFormFields } from './user-form-fields/user-form-fields';
import {
  buildUserFormSchema,
  isPartnerRole,
  type UserFormValues,
} from './user-form-schema';
import './edit-user-page.scss';

type EditUserTab = 'details' | 'sign-in-history';

const EDIT_USER_TABS = [
  'details',
  'sign-in-history',
] as const satisfies readonly EditUserTab[];

export const EditUserPage = () => {
  const userId = useRouteIdParam();
  const navigateBack = useNavigateBack();
  const queryClient = useQueryClient();
  const [activeTab] = useTabQueryParam('details', EDIT_USER_TABS);
  const patchSearchParams = usePatchSearchParams();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleTabChange = (value: string) => {
    const tab = value as EditUserTab;
    if (tab === 'details') {
      patchSearchParams({ tab: null, page: null });
    } else {
      patchSearchParams({ tab, page: null });
    }
  };

  const {
    data: user,
    isLoading,
    isError: loadFailed,
  } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => {
      if (userId === null) {
        throw new Error('Invalid user id');
      }
      return fetchUser(userId);
    },
    enabled: userId !== null,
    staleTime: Infinity,
  });

  usePageTitle(user?.email ? `User · ${user.email}` : 'User');

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles'],
    queryFn: fetchUserRoles,
  });

  const schema = useMemo(() => buildUserFormSchema(roles, 'edit'), [roles]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    values: {
      email: user?.email ?? '',
      password: '',
      roleId: user?.role.id != null ? String(user.role.id) : '',
      partnerId: user?.partner?.id != null ? String(user.partner.id) : '',
    },
  });

  const watchedRoleId = watch('roleId');
  const partnerRoleSelected = isPartnerRole(roles, watchedRoleId);

  const { partners: fetchedPartners, isLoading: partnersLoading } =
    useAllPartners({
      enabled: partnerRoleSelected || user?.role.name === 'PARTNER',
    });

  const partners = useMemo(() => {
    const userPartner = user?.partner;
    if (!userPartner) {
      return fetchedPartners;
    }

    if (fetchedPartners.some((partner) => partner.id === userPartner.id)) {
      return fetchedPartners;
    }

    return [userPartner, ...fetchedPartners];
  }, [fetchedPartners, user?.partner]);

  const mutation = useMutation({
    mutationFn: (values: UserFormValues) => {
      if (userId === null) {
        throw new Error('Invalid user id');
      }

      const payload: Parameters<typeof updateUser>[1] = {};
      if (values.email !== user?.email) payload.email = values.email;
      if (values.password) payload.password = values.password;
      if (values.roleId !== String(user?.role.id)) {
        payload.roleId = Number(values.roleId);
      }

      if (partnerRoleSelected) {
        payload.partnerId = values.partnerId
          ? Number(values.partnerId)
          : undefined;
      } else if (user?.role.name === 'PARTNER') {
        payload.partnerId = null;
      }

      return updateUser(userId, payload);
    },
    onSuccess: (updated) => {
      toast.success(`User "${updated.email}" updated`);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (userId === null) {
        throw new Error('Invalid user id');
      }
      return deleteUser(userId);
    },
    onSuccess: () => {
      toast.success(`User "${user?.email}" deleted`);
      setDeleteDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      navigateBack();
    },
  });

  const handleDeleteClick = () => {
    if (!user || !canDeleteUser(user)) {
      toast.error('Users with the ADMIN role cannot be deleted');
      return;
    }
    setDeleteDialogOpen(true);
  };

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  return (
    <Flex direction="column" gap="4" className="edit-user-page">
      <FormPageHeader backLabel="Users" />

      {userId === null ? (
        <Callout.Root color="red" size="1">
          <Callout.Text>User not found.</Callout.Text>
        </Callout.Root>
      ) : isLoading || rolesLoading ? (
        <Flex justify="center" py="6">
          <Spinner size="3" />
        </Flex>
      ) : loadFailed ? (
        <Callout.Root color="red" size="1">
          <Callout.Text>User not found.</Callout.Text>
        </Callout.Root>
      ) : (
        <Card className="edit-user-page__card">
          <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
            <Tabs.List>
              <Tabs.Trigger value="details">Details</Tabs.Trigger>
              <Tabs.Trigger value="sign-in-history">
                Sign-in history
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="details">
              <form onSubmit={onSubmit} autoComplete="off">
                <Flex
                  direction="column"
                  gap="4"
                  className="edit-user-page__tab-content"
                >
                  <UserFormFields
                    register={register}
                    control={control}
                    errors={errors}
                    roles={roles}
                    partners={partners}
                    isPartnerRole={partnerRoleSelected}
                    partnersLoading={partnersLoading}
                    passwordOptional
                  />

                  <Flex gap="2" justify="between">
                    <Button
                      variant="soft"
                      color="red"
                      type="button"
                      onClick={handleDeleteClick}
                    >
                      Delete User
                    </Button>
                    <Flex gap="2">
                      <Button
                        variant="soft"
                        color="gray"
                        type="button"
                        onClick={navigateBack}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" loading={mutation.isPending}>
                        Save Changes
                      </Button>
                    </Flex>
                  </Flex>
                </Flex>
              </form>
            </Tabs.Content>

            <Tabs.Content value="sign-in-history">
              <div className="edit-user-page__tab-content">
                {userId !== null && <UserSignInHistory userId={userId} />}
              </div>
            </Tabs.Content>
          </Tabs.Root>
        </Card>
      )}

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        title="Delete User"
        entityName={user?.email ?? ''}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setDeleteDialogOpen(false)}
      />
    </Flex>
  );
};
