import { Flex, Spinner, Text } from '@radix-ui/themes';
import { DICE_GAME_ID, type GameId } from '@vfair/game-contracts';
import {
  defaultPartnerThemeConfig,
  buildPartnerThemeCss,
  parsePartnerColor,
  resolvePartnerAccentColors,
  type PartnerThemeConfig,
  type ThemeAppearance,
} from '@vfair/radix-palette';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PartnerThemeEditorFields } from '../partner-theme-editor-fields/partner-theme-editor-fields';
import { PartnerThemeEditorPreview } from '../partner-theme-editor-preview/partner-theme-editor-preview';
import {
  fetchPartner,
  fetchPartnerCurrencies,
  fetchPartnerGameConfig,
  fetchPartnerTheme,
  updatePartnerTheme,
} from '../../services/admin-api.service';
import { toast } from '../../store/toast-store';
import {
  buildCopyPreviewUrl,
  buildPreviewSrc,
  getGamePreviewOrigin,
  paletteAppearanceDiffersFromDefault,
  resetPaletteAppearance,
  toWritableTheme,
  writableThemeDiffers,
  PALETTE_COLOR_KEYS,
  type PreviewLanguage,
} from './partner-theme-editor-helpers';
import './partner-theme-editor.scss';

type PartnerThemeEditorProps = {
  partnerId: number;
};

export const PartnerThemeEditor = ({ partnerId }: PartnerThemeEditorProps) => {
  const queryClient = useQueryClient();
  const themeHydratedRef = useRef(false);
  const [editingAppearance, setEditingAppearance] =
    useState<ThemeAppearance>('light');
  const [theme, setTheme] = useState<PartnerThemeConfig>(
    defaultPartnerThemeConfig,
  );
  const [previewTheme, setPreviewTheme] = useState<PartnerThemeConfig>(
    defaultPartnerThemeConfig,
  );
  const [savedTheme, setSavedTheme] = useState<PartnerThemeConfig>(
    defaultPartnerThemeConfig,
  );
  const [previewReloadToken, setPreviewReloadToken] = useState(0);
  const [previewCurrencyCode, setPreviewCurrencyCode] = useState('');
  const [previewLang, setPreviewLang] = useState<PreviewLanguage>('en');
  const [previewGameId, setPreviewGameId] = useState<GameId>(DICE_GAME_ID);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['partner-theme', partnerId],
    queryFn: () => fetchPartnerTheme(partnerId),
  });

  const { data: partner } = useQuery({
    queryKey: ['partner', partnerId],
    queryFn: () => fetchPartner(partnerId),
  });

  const { data: partnerCurrencies = [] } = useQuery({
    queryKey: ['partner-currencies', partnerId],
    queryFn: () => fetchPartnerCurrencies(partnerId),
  });

  const { data: previewGameConfig } = useQuery({
    queryKey: ['partner-game-config', partnerId, previewGameId],
    queryFn: () => fetchPartnerGameConfig(partnerId, previewGameId),
  });

  useEffect(() => {
    themeHydratedRef.current = false;
    setTheme(defaultPartnerThemeConfig);
    setPreviewTheme(defaultPartnerThemeConfig);
    setSavedTheme(defaultPartnerThemeConfig);
    setPreviewReloadToken(0);
    setPreviewCurrencyCode('');
    setPreviewLang('en');
    setPreviewGameId(DICE_GAME_ID);
  }, [partnerId]);

  useEffect(() => {
    if (partnerCurrencies.length === 0) {
      return;
    }

    setPreviewCurrencyCode((current) => {
      if (
        current &&
        partnerCurrencies.some((currency) => currency.code === current)
      ) {
        return current;
      }

      return partnerCurrencies[0]?.code ?? '';
    });
  }, [partnerCurrencies]);

  useEffect(() => {
    if (!data) {
      return;
    }

    if (!themeHydratedRef.current) {
      setTheme(data);
      setPreviewTheme(data);
      setSavedTheme(data);
      themeHydratedRef.current = true;
      return;
    }

    const applyLogo = (current: PartnerThemeConfig) => ({
      ...current,
      logo: data.logo,
    });
    setTheme(applyLogo);
    setPreviewTheme(applyLogo);
    setSavedTheme(applyLogo);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (
      input: Omit<
        PartnerThemeConfig,
        'theme' | 'logo' | 'lightAccentColor' | 'darkAccentColor'
      >,
    ) => updatePartnerTheme(partnerId, input),
    onSuccess: (updated) => {
      setTheme(updated);
      setPreviewTheme(updated);
      setSavedTheme(updated);
      toast.success('Theme saved');
      void queryClient.invalidateQueries({
        queryKey: ['partner-theme', partnerId],
      });
    },
    onError: () => {
      toast.error('Failed to save theme');
    },
  });

  const previewCurrency = partnerCurrencies.find(
    (currency) => currency.code === previewCurrencyCode,
  );
  const previewCss = useMemo(
    () => buildPartnerThemeCss(previewTheme),
    [previewTheme],
  );
  const previewSrc = useMemo(
    () =>
      buildPreviewSrc({
        gameId: previewGameId,
        previewTheme,
        editingAppearance,
        rtp: previewGameConfig?.rtp,
        currency: previewCurrency,
        lobbyUrl: partner?.lobbyUrl,
        lang: previewLang,
        previewReloadToken,
      }),
    [
      editingAppearance,
      partner?.lobbyUrl,
      previewCurrency,
      previewGameConfig?.rtp,
      previewGameId,
      previewLang,
      previewReloadToken,
      previewTheme,
    ],
  );
  const previewOrigin = getGamePreviewOrigin(previewGameId);

  const isDirty = useMemo(
    () => writableThemeDiffers(theme, savedTheme),
    [theme, savedTheme],
  );

  const isPreviewStale = useMemo(
    () => writableThemeDiffers(theme, previewTheme),
    [theme, previewTheme],
  );

  const isPaletteAtDefault = !paletteAppearanceDiffersFromDefault(
    editingAppearance,
    theme,
  );

  const handleLogoChange = useCallback((logo: string | null) => {
    const applyLogo = (current: PartnerThemeConfig) => ({ ...current, logo });
    setTheme(applyLogo);
    setPreviewTheme(applyLogo);
    setSavedTheme(applyLogo);
  }, []);

  const handleApplyPreview = () => {
    setPreviewTheme({
      ...theme,
      ...resolvePartnerAccentColors(theme),
    });
    setPreviewReloadToken((n) => n + 1);
  };

  const handleResetPaletteDefaults = () => {
    setTheme((current) => resetPaletteAppearance(current, editingAppearance));
  };

  const handleCopyPreviewUrl = async () => {
    const url = buildCopyPreviewUrl({
      gameId: previewGameId,
      savedTheme,
      rtp: previewGameConfig?.rtp,
      currency: previewCurrency,
      lobbyUrl: partner?.lobbyUrl,
      lang: previewLang,
    });

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Preview URL copied');
    } catch {
      toast.error('Failed to copy preview URL');
    }
  };

  const handleSave = () => {
    const invalidField = PALETTE_COLOR_KEYS.find(
      (key) => !parsePartnerColor(theme[key]),
    );

    if (invalidField) {
      toast.error(`Invalid color for ${invalidField}`);
      return;
    }

    mutation.mutate(toWritableTheme(theme));
  };

  if (isLoading) {
    return (
      <Flex justify="center" py="6">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (isError) {
    return (
      <Text size="2" color="red">
        Failed to load theme configuration.
      </Text>
    );
  }

  return (
    <Flex direction="column" gap="4" className="partner-theme-editor">
      <Flex gap="4" className="partner-theme-editor__layout" wrap="wrap">
        <PartnerThemeEditorFields
          partnerId={partnerId}
          theme={theme}
          editingAppearance={editingAppearance}
          isPreviewStale={isPreviewStale}
          isPaletteAtDefault={isPaletteAtDefault}
          isDirty={isDirty}
          isSaving={mutation.isPending}
          onThemeChange={setTheme}
          onEditingAppearanceChange={setEditingAppearance}
          onLogoChange={handleLogoChange}
          onApplyPreview={handleApplyPreview}
          onResetPaletteDefaults={handleResetPaletteDefaults}
          onSave={handleSave}
        />

        <PartnerThemeEditorPreview
          previewSrc={previewSrc}
          previewCss={previewCss}
          previewLogo={previewTheme.logo}
          previewOrigin={previewOrigin}
          previewGameId={previewGameId}
          onPreviewGameIdChange={setPreviewGameId}
          partnerCurrencies={partnerCurrencies}
          previewCurrencyCode={previewCurrencyCode}
          onPreviewCurrencyCodeChange={setPreviewCurrencyCode}
          previewLang={previewLang}
          onPreviewLangChange={setPreviewLang}
          canCopyPreviewUrl={Boolean(savedTheme.theme)}
          onCopyPreviewUrl={() => {
            void handleCopyPreviewUrl();
          }}
        />
      </Flex>
    </Flex>
  );
};
