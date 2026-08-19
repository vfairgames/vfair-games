import { Flex, Text, TextField } from '@radix-ui/themes';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { PartnerFormValues } from '../partner-form-schema';

type PartnerFormFieldsProps = {
  register: UseFormRegister<PartnerFormValues>;
  errors: FieldErrors<PartnerFormValues>;
  nameAutoFocus?: boolean;
  showLobbyUrl?: boolean;
  code?: string;
};

export const PartnerFormFields = ({
  register,
  errors,
  nameAutoFocus = false,
  showLobbyUrl = true,
  code,
}: PartnerFormFieldsProps) => (
  <>
    <Flex direction="column" gap="1">
      <Text as="label" size="2" weight="medium">
        Name
      </Text>
      <TextField.Root
        placeholder="Partner name"
        autoFocus={nameAutoFocus}
        color={errors.name ? 'red' : undefined}
        {...register('name')}
      />
      {errors.name ? (
        <Text size="1" color="red">
          {errors.name.message}
        </Text>
      ) : null}
    </Flex>

    {code !== undefined ? (
      <Flex direction="column" gap="1">
        <Text as="label" size="2" weight="medium">
          Code
        </Text>
        <TextField.Root value={code} readOnly />
      </Flex>
    ) : null}

    {showLobbyUrl ? (
      <Flex direction="column" gap="1">
        <Text as="label" size="2" weight="medium">
          Lobby URL
        </Text>
        <TextField.Root
          type="url"
          placeholder="https://lobby.example.com"
          color={errors.lobbyUrl ? 'red' : undefined}
          {...register('lobbyUrl')}
        />
        {errors.lobbyUrl ? (
          <Text size="1" color="red">
            {errors.lobbyUrl.message}
          </Text>
        ) : null}
      </Flex>
    ) : null}

    {showLobbyUrl ? (
      <Flex direction="column" gap="1">
        <Text as="label" size="2" weight="medium">
          Webhook URL
        </Text>
        <TextField.Root
          type="url"
          placeholder="https://api.example.com/webhooks/vfair"
          color={errors.webhookUrl ? 'red' : undefined}
          {...register('webhookUrl')}
        />
        {errors.webhookUrl ? (
          <Text size="1" color="red">
            {errors.webhookUrl.message}
          </Text>
        ) : (
          <Text size="1" color="gray">
            Endpoint where the platform sends partner events and notifications.
          </Text>
        )}
      </Flex>
    ) : null}
  </>
);
