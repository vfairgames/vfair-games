import { Button, Card, Flex } from '@radix-ui/themes';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormPageHeader } from '../../components/form-page-header/form-page-header';
import { useNavigateBack } from '../../hooks/use-navigate-back';
import { usePageTitle } from '../../hooks/use-page-title';
import { createPartner } from '../../services/admin-api.service';
import { toast } from '../../store/toast-store';
import { PartnerFormFields } from './partner-form-fields/partner-form-fields';
import {
  partnerFormSchema,
  type PartnerFormValues,
} from './partner-form-schema';
import './create-partner-page.scss';

export const CreatePartnerPage = () => {
  usePageTitle('Create Partner');
  const navigate = useNavigate();
  const navigateBack = useNavigateBack();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerFormSchema),
    defaultValues: {
      name: '',
      lobbyUrl: '',
      webhookUrl: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: PartnerFormValues) =>
      createPartner(values.name.trim()),
    onSuccess: (partner) => {
      toast.success(`Partner "${partner.name}" created`);
      void queryClient.invalidateQueries({ queryKey: ['partners'] });
      navigate(`/partners/${partner.id}/edit`);
    },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  return (
    <Flex direction="column" gap="4" className="create-partner-page">
      <FormPageHeader backLabel="Partners" />

      <Card className="create-partner-page__card">
        <form onSubmit={onSubmit}>
          <Flex direction="column" gap="4">
            <PartnerFormFields
              register={register}
              errors={errors}
              nameAutoFocus
              showLobbyUrl={false}
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
                Create Partner
              </Button>
            </Flex>
          </Flex>
        </form>
      </Card>
    </Flex>
  );
};
