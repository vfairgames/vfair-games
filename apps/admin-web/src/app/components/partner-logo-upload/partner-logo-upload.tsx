import { Button, Flex, Text } from '@radix-ui/themes';
import type { PartnerThemeConfig } from '@vfair/radix-palette';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, type ChangeEvent } from 'react';
import {
  removePartnerLogo,
  uploadPartnerLogo,
} from '../../services/admin-api.service';
import { toast } from '../../store/toast-store';
import './partner-logo-upload.scss';

type PartnerLogoUploadProps = {
  partnerId: number;
  logo: string | null;
  onLogoChange?: (logo: string | null) => void;
};

export const PartnerLogoUpload = ({
  partnerId,
  logo,
  onLogoChange,
}: PartnerLogoUploadProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const themeQueryKey = ['partner-theme', partnerId] as const;

  const patchThemeLogo = (nextLogo: string | null) => {
    queryClient.setQueryData<PartnerThemeConfig>(themeQueryKey, (current) =>
      current ? { ...current, logo: nextLogo } : current,
    );
    onLogoChange?.(nextLogo);
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadPartnerLogo(partnerId, file),
    onSuccess: ({ logo: uploadedLogo }) => {
      patchThemeLogo(uploadedLogo);
      toast.success('Partner logo uploaded');
      void queryClient.invalidateQueries({ queryKey: themeQueryKey });
    },
    onError: () => toast.error('Failed to upload partner logo'),
  });

  const removeMutation = useMutation({
    mutationFn: () => removePartnerLogo(partnerId),
    onSuccess: () => {
      patchThemeLogo(null);
      toast.success('Partner logo removed');
      void queryClient.invalidateQueries({ queryKey: themeQueryKey });
    },
    onError: () => toast.error('Failed to remove partner logo'),
  });

  const isBusy = uploadMutation.isPending || removeMutation.isPending;

  return (
    <Flex direction="column" gap="2">
      <Text as="label" size="2" weight="medium">
        Logo
      </Text>

      <Flex align="center" gap="3" wrap="wrap">
        {logo ? (
          <img src={logo} alt="" className="partner-logo-upload__preview" />
        ) : (
          <Text size="2" color="gray">
            No logo uploaded
          </Text>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="partner-logo-upload__file-input"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) {
              uploadMutation.mutate(file);
            }
          }}
        />

        <Button
          type="button"
          variant="soft"
          disabled={isBusy}
          loading={uploadMutation.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {logo ? 'Replace logo' : 'Upload logo'}
        </Button>

        {logo ? (
          <Button
            type="button"
            variant="soft"
            color="red"
            disabled={isBusy}
            loading={removeMutation.isPending}
            onClick={() => removeMutation.mutate()}
          >
            Remove
          </Button>
        ) : null}
      </Flex>
    </Flex>
  );
};
