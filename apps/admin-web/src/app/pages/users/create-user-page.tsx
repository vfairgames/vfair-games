import { Button, Card, Flex, Spinner } from '@radix-ui/themes';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormPageHeader } from '../../components/form-page-header/form-page-header';
import { useAllPartners } from '../../hooks/use-all-partners';
import { useNavigateBack } from '../../hooks/use-navigate-back';
import { useQueryParamValue } from '../../hooks/use-query-param';
import { usePageTitle } from '../../hooks/use-page-title';
import {
  createUser,
  fetchPartner,
  fetchUserRoles,
} from '../../services/admin-api.service';
import { toast } from '../../store/toast-store';
import { parseRouteId } from '../../utils/parse-route-id';
import { UserFormFields } from './user-form-fields/user-form-fields';
import {
  buildUserFormSchema,
  isPartnerRole,
  type UserFormValues,
} from './user-form-schema';
import './create-user-page.scss';

export const CreateUserPage = () => {
  usePageTitle('Create User');
  const navigateBack = useNavigateBack();
  const queryClient = useQueryClient();
  const presetPartnerIdParam = useQueryParamValue('partnerId', '');
  const presetPartnerId = parseRouteId(presetPartnerIdParam || undefined);

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles'],
    queryFn: fetchUserRoles,
  });

  const { data: presetPartner, isLoading: presetPartnerLoading } = useQuery({
    queryKey: ['partner', presetPartnerId],
    queryFn: () => {
      if (presetPartnerId === null) {
        throw new Error('Invalid partner id');
      }
      return fetchPartner(presetPartnerId);
    },
    enabled: !!presetPartnerId,
  });

  const partnerRoleId = useMemo(
    () => String(roles.find((role) => role.name === 'PARTNER')?.id ?? ''),
    [roles],
  );

  const schema = useMemo(() => buildUserFormSchema(roles, 'create'), [roles]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', roleId: '', partnerId: '' },
  });

  useEffect(() => {
    if (!presetPartnerId || !partnerRoleId) {
      return;
    }

    reset({
      email: '',
      password: '',
      roleId: partnerRoleId,
      partnerId: String(presetPartnerId),
    });
  }, [presetPartnerId, partnerRoleId, reset]);

  const watchedRoleId = watch('roleId');
  const partnerRoleSelected = isPartnerRole(roles, watchedRoleId);
  const isPartnerPreset = !!presetPartnerId;

  const { partners, isLoading: partnersLoading } = useAllPartners({
    enabled: partnerRoleSelected || isPartnerPreset,
  });

  const resolvedPartners = useMemo(() => {
    if (!presetPartner) {
      return partners;
    }

    if (partners.some((partner) => partner.id === presetPartner.id)) {
      return partners;
    }

    return [presetPartner, ...partners];
  }, [partners, presetPartner]);

  const fixedAssignment = useMemo(() => {
    if (!isPartnerPreset || !presetPartner || !partnerRoleId) {
      return undefined;
    }

    return {
      roleName: 'PARTNER',
      partnerName: presetPartner.name,
    };
  }, [isPartnerPreset, presetPartner, partnerRoleId]);

  const mutation = useMutation({
    mutationFn: (values: UserFormValues) =>
      createUser({
        email: values.email.trim(),
        password: values.password,
        roleId: Number(values.roleId),
        partnerId:
          partnerRoleSelected || isPartnerPreset
            ? Number(values.partnerId)
            : undefined,
      }),
    onSuccess: (user) => {
      toast.success(`User "${user.email}" created`);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      navigateBack();
    },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  return (
    <Flex direction="column" gap="4" className="create-user-page">
      <FormPageHeader backLabel={isPartnerPreset ? 'Partner' : 'Users'} />

      {rolesLoading || (isPartnerPreset && presetPartnerLoading) ? (
        <Flex justify="center" py="6">
          <Spinner size="3" />
        </Flex>
      ) : (
        <Card className="create-user-page__card">
          <form onSubmit={onSubmit} autoComplete="off">
            <Flex direction="column" gap="4">
              <UserFormFields
                register={register}
                control={control}
                errors={errors}
                roles={roles}
                partners={resolvedPartners}
                isPartnerRole={partnerRoleSelected || isPartnerPreset}
                partnersLoading={partnersLoading}
                fixedAssignment={fixedAssignment}
                emailAutoFocus
              />

              <Flex gap="2" justify="end">
                <Button
                  variant="soft"
                  color="gray"
                  type="button"
                  onClick={navigateBack}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={mutation.isPending}>
                  Create User
                </Button>
              </Flex>
            </Flex>
          </form>
        </Card>
      )}
    </Flex>
  );
};
