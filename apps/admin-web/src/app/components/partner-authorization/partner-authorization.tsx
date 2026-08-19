import {
  AlertDialog,
  Button,
  Flex,
  Spinner,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import { zodResolver } from '@hookform/resolvers/zod';
import { CopyIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  fetchPartner,
  regeneratePartnerSecret,
  updatePartner,
} from '../../services/admin-api.service';
import { toast } from '../../store/toast-store';
import {
  formatIpWhitelistForInput,
  partnerAuthorizationFormSchema,
  toIpWhitelistPayload,
  type PartnerAuthorizationFormValues,
} from './partner-authorization-form-schema';
import './partner-authorization.scss';

type PartnerAuthorizationProps = {
  partnerId: number;
};

export const PartnerAuthorization = ({
  partnerId,
}: PartnerAuthorizationProps) => {
  const queryClient = useQueryClient();
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);

  const {
    data: partner,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['partner', partnerId],
    queryFn: () => fetchPartner(partnerId),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PartnerAuthorizationFormValues>({
    resolver: zodResolver(partnerAuthorizationFormSchema),
    values: {
      ipWhitelist: formatIpWhitelistForInput(partner?.ipWhitelist ?? '*'),
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: PartnerAuthorizationFormValues) => {
      if (!partner) {
        throw new Error('Partner not loaded');
      }
      return updatePartner(partnerId, {
        name: partner.name,
        ipWhitelist: toIpWhitelistPayload(values.ipWhitelist),
      });
    },
    onSuccess: (updated) => {
      toast.success('Authorization settings updated');
      void queryClient.invalidateQueries({ queryKey: ['partner', partnerId] });
      void queryClient.invalidateQueries({ queryKey: ['partners'] });
      void queryClient.setQueryData(['partner', partnerId], updated);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () => regeneratePartnerSecret(partnerId),
    onSuccess: (updated) => {
      toast.success('Partner secret regenerated');
      setRegenerateDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['partner', partnerId] });
      void queryClient.setQueryData(['partner', partnerId], updated);
    },
  });

  const handleCopySecret = async () => {
    if (!partner?.secret) {
      return;
    }
    await navigator.clipboard.writeText(partner.secret);
    toast.success('Secret copied to clipboard');
  };

  const onSubmit = handleSubmit((values) => saveMutation.mutate(values));

  if (isLoading) {
    return (
      <Flex justify="center" py="6">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (isError || !partner) {
    return (
      <Text size="2" color="red">
        Failed to load authorization settings.
      </Text>
    );
  }

  return (
    <Flex direction="column" gap="4" className="partner-authorization">
      <Flex direction="column" gap="2">
        <Text as="label" size="2" weight="medium">
          Secret
        </Text>
        <Flex gap="2" align="center">
          <TextField.Root
            readOnly
            value={partner.secret}
            className="partner-authorization__secret-field"
          />
          <Button
            type="button"
            variant="soft"
            color="gray"
            onClick={() => void handleCopySecret()}
          >
            <CopyIcon />
            Copy
          </Button>
          <Button
            type="button"
            variant="soft"
            onClick={() => setRegenerateDialogOpen(true)}
          >
            <ArrowsClockwiseIcon />
            Regenerate
          </Button>
        </Flex>
        <Text size="1" color="gray">
          Shared secret between this partner and the game API. Regenerating
          invalidates the previous secret immediately.
        </Text>
      </Flex>

      <form onSubmit={onSubmit}>
        <Flex direction="column" gap="4">
          <Flex direction="column" gap="2">
            <Text as="label" size="2" weight="medium" htmlFor="ipWhitelist">
              IP whitelist
            </Text>
            <TextArea
              id="ipWhitelist"
              rows={6}
              placeholder="*"
              color={errors.ipWhitelist ? 'red' : undefined}
              {...register('ipWhitelist')}
            />
            {errors.ipWhitelist ? (
              <Text size="1" color="red">
                {errors.ipWhitelist.message}
              </Text>
            ) : (
              <Text size="1" color="gray">
                Use * to allow all IPs. Otherwise enter one IP address or CIDR
                range per line. Commas and semicolons are also accepted.
              </Text>
            )}
          </Flex>

          <Flex gap="2" justify="end">
            <Button type="submit" loading={saveMutation.isPending}>
              Save Changes
            </Button>
          </Flex>
        </Flex>
      </form>

      <AlertDialog.Root
        open={regenerateDialogOpen}
        onOpenChange={(open) => !open && setRegenerateDialogOpen(false)}
      >
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>Regenerate secret?</AlertDialog.Title>
          <AlertDialog.Description>
            This will invalidate the current secret immediately. Partner
            integrations using the old secret will stop working until updated.
          </AlertDialog.Description>
          <Flex gap="2" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                onClick={() => regenerateMutation.mutate()}
                loading={regenerateMutation.isPending}
              >
                Regenerate
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Flex>
  );
};
