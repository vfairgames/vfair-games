import { Button, Callout, Card, Flex, Spinner, Tabs } from '@radix-ui/themes';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormPageHeader } from '../../components/form-page-header/form-page-header';
import { PartnerCurrencies } from '../../components/partner-currencies/partner-currencies';
import { PartnerAuthorization } from '../../components/partner-authorization/partner-authorization';
import { PartnerGames } from '../../components/partner-games/partner-games';
import { PartnerThemeEditor } from '../../components/partner-theme-editor/partner-theme-editor';
import { PartnerUsers } from '../../components/partner-users/partner-users';
import { useNavigateBack } from '../../hooks/use-navigate-back';
import {
  usePatchSearchParams,
  useTabQueryParam,
} from '../../hooks/use-query-param';
import { usePageTitle } from '../../hooks/use-page-title';
import { fetchPartner, updatePartner } from '../../services/admin-api.service';
import { toast } from '../../store/toast-store';
import { useRouteIdParam } from '../../hooks/use-route-id-param';
import { PartnerFormFields } from './partner-form-fields/partner-form-fields';
import {
  partnerFormSchema,
  toUpdatePartnerPayload,
  type PartnerFormValues,
} from './partner-form-schema';
import './edit-partner-page.scss';

type EditPartnerTab =
  | 'details'
  | 'currencies'
  | 'users'
  | 'games'
  | 'theme-config'
  | 'authorization';

const EDIT_PARTNER_TABS = [
  'details',
  'currencies',
  'users',
  'games',
  'theme-config',
  'authorization',
] as const satisfies readonly EditPartnerTab[];

export const EditPartnerPage = () => {
  const navigateBack = useNavigateBack();
  const partnerId = useRouteIdParam();
  const queryClient = useQueryClient();
  const [activeTab] = useTabQueryParam('details', EDIT_PARTNER_TABS);
  const patchSearchParams = usePatchSearchParams();

  const handleTabChange = (value: string) => {
    const tab = value as EditPartnerTab;
    if (tab === 'details') {
      patchSearchParams({
        tab: null,
        page: null,
        game: null,
        gameSection: null,
      });
      return;
    }

    if (tab === 'games') {
      patchSearchParams({ tab, page: null });
      return;
    }

    if (tab === 'theme-config' || tab === 'authorization') {
      patchSearchParams({ tab, page: null, game: null, gameSection: null });
      return;
    }

    patchSearchParams({ tab, page: null, game: null, gameSection: null });
  };

  const {
    data: partner,
    isLoading,
    isError: loadFailed,
  } = useQuery({
    queryKey: ['partner', partnerId],
    queryFn: () => {
      if (partnerId === null) {
        throw new Error('Invalid partner id');
      }
      return fetchPartner(partnerId);
    },
    enabled: partnerId !== null,
    staleTime: Infinity,
  });

  usePageTitle(partner?.name ? `Partner · ${partner.name}` : 'Partner');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerFormSchema),
    values: {
      name: partner?.name ?? '',
      lobbyUrl: partner?.lobbyUrl ?? '',
      webhookUrl: partner?.webhookUrl ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: PartnerFormValues) => {
      if (partnerId === null) {
        throw new Error('Invalid partner id');
      }
      return updatePartner(partnerId, toUpdatePartnerPayload(values));
    },
    onSuccess: (updated) => {
      toast.success(`Partner "${updated.name}" updated`);
      void queryClient.invalidateQueries({ queryKey: ['partners'] });
      void queryClient.invalidateQueries({ queryKey: ['partner', partnerId] });
    },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  return (
    <Flex direction="column" gap="4" className="edit-partner-page">
      <FormPageHeader backLabel="Partners" />

      {partnerId === null ? (
        <Callout.Root color="red" size="1">
          <Callout.Text>Partner not found.</Callout.Text>
        </Callout.Root>
      ) : isLoading ? (
        <Flex justify="center" py="6">
          <Spinner size="3" />
        </Flex>
      ) : loadFailed ? (
        <Callout.Root color="red" size="1">
          <Callout.Text>Partner not found.</Callout.Text>
        </Callout.Root>
      ) : (
        <Card className="edit-partner-page__card">
          <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
            <Tabs.List>
              <Tabs.Trigger value="details">Details</Tabs.Trigger>
              <Tabs.Trigger value="currencies">Currencies</Tabs.Trigger>
              <Tabs.Trigger value="users">Users</Tabs.Trigger>
              <Tabs.Trigger value="games">Games</Tabs.Trigger>
              <Tabs.Trigger value="theme-config">Theme config</Tabs.Trigger>
              <Tabs.Trigger value="authorization">Authorization</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="details">
              <form onSubmit={onSubmit}>
                <Flex
                  direction="column"
                  gap="4"
                  className="edit-partner-page__tab-content"
                >
                  <PartnerFormFields
                    register={register}
                    errors={errors}
                    nameAutoFocus
                    code={partner?.code}
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
                      Save Changes
                    </Button>
                  </Flex>
                </Flex>
              </form>
            </Tabs.Content>

            <Tabs.Content value="currencies">
              <div className="edit-partner-page__tab-content">
                {partnerId !== null && (
                  <PartnerCurrencies partnerId={partnerId} />
                )}
              </div>
            </Tabs.Content>

            <Tabs.Content value="users">
              <div className="edit-partner-page__tab-content">
                {partnerId !== null && <PartnerUsers partnerId={partnerId} />}
              </div>
            </Tabs.Content>

            <Tabs.Content value="games">
              <div className="edit-partner-page__tab-content">
                {partnerId !== null && <PartnerGames partnerId={partnerId} />}
              </div>
            </Tabs.Content>

            <Tabs.Content value="theme-config">
              <div className="edit-partner-page__tab-content">
                {partnerId !== null && (
                  <PartnerThemeEditor partnerId={partnerId} />
                )}
              </div>
            </Tabs.Content>

            <Tabs.Content value="authorization">
              <div className="edit-partner-page__tab-content">
                {partnerId !== null && (
                  <PartnerAuthorization partnerId={partnerId} />
                )}
              </div>
            </Tabs.Content>
          </Tabs.Root>
        </Card>
      )}
    </Flex>
  );
};
