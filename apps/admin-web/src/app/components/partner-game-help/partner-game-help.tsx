import { Button, Flex, Spinner, Text } from '@radix-ui/themes';
import { LANGUAGE_CODE_LIST } from '@vfair/app-common';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ComboboxSelect } from '../combobox-select/combobox-select';
import { RichTextEditor } from '../rich-text-editor/rich-text-editor';
import {
  fetchGameHelpContent,
  upsertGameHelpContent,
} from '../../services/admin-api.service';
import { toast } from '../../store/toast-store';

const languageDisplayNames = new Intl.DisplayNames(['en'], {
  type: 'language',
});

const LANGUAGE_OPTIONS = LANGUAGE_CODE_LIST.map((code) => {
  const name = languageDisplayNames.of(code);
  return {
    value: code,
    label: name ? `${name} (${code})` : code,
  };
}).sort((a, b) => a.label.localeCompare(b.label));

type PartnerGameHelpProps = {
  partnerId: number;
  gameId: string;
};

export const PartnerGameHelp = ({
  partnerId,
  gameId,
}: PartnerGameHelpProps) => {
  const queryClient = useQueryClient();
  const [lang, setLang] = useState('en');
  const [html, setHtml] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['game-help-content', partnerId, gameId],
    queryFn: () => fetchGameHelpContent(partnerId, gameId),
  });

  const serverHtml = data?.find((item) => item.lang === lang)?.html ?? '';

  useEffect(() => {
    setHtml(serverHtml);
  }, [lang, serverHtml]);

  const saveMutation = useMutation({
    mutationFn: () => upsertGameHelpContent(partnerId, gameId, lang, html),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['game-help-content', partnerId, gameId],
      });
      toast.success('Game help saved');
    },
    onError: () => {
      toast.error('Failed to save game help');
    },
  });

  return (
    <Flex direction="column" gap="4" width="100%">
      <Flex direction="column" gap="2" maxWidth="24rem">
        <Text size="2" weight="medium">
          Language
        </Text>
        <ComboboxSelect
          value={lang}
          onChange={setLang}
          options={LANGUAGE_OPTIONS}
          placeholder="Select language"
          searchPlaceholder="Search language…"
          disabled={isFetching || saveMutation.isPending}
        />
      </Flex>
      {isFetching && !data ? (
        <Flex align="center" justify="center" py="6">
          <Spinner size="3" />
        </Flex>
      ) : (
        <RichTextEditor
          value={html}
          onChange={setHtml}
          disabled={saveMutation.isPending}
        />
      )}
      <Flex>
        <Button
          onClick={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          disabled={isFetching}
        >
          Save game help
        </Button>
      </Flex>
    </Flex>
  );
};
